/**
 * gameStore.js — Zustand global state
 * Screens: 'loading'|'select'|'map'|'combat'|'shop'|'reward'|'gameover'|'victory'
 *
 * NEW in this version:
 *  - Multi-enemy combat (enemies array)
 *  - Ult charge system (persists between combats)
 *  - Ability unlock progression (Q/W/E locked until unlocked via level-up)
 *  - Win streak tracking + bonus gold
 *  - Expanded random events with images
 *  - Item synergy bonuses (Rabadon, IE, etc.)
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ACHIEVEMENTS } from "../data/achievements";
import { playSfx } from "../game/sfx";
import { REGIONS, getDifficultyScaledEnemy } from "../data/regions";
import { CHAMPION_CONFIGS, mergeChampionData } from "../data/championsConfig";
import {
  initCombat,
  applyPlayerAbility,
  resolveAbilityDamage,
  resolveEnemyTurn,
  passTurn as passTurnPure,
  applyItemStatsToPlayer,
  computeItemSynergies,
} from "../game/combat";

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const PLAYABLE_CHAMPIONS = ["Darius", "Ashe", "Akali"];

function pickChampionPool(allChampions) {
  return PLAYABLE_CHAMPIONS
    .map(id => allChampions.find(c => c.id === id))
    .filter(Boolean);
}

const LEGENDARY_THRESHOLD = 2500; // items at or above this gold value are unique per run

function isLegendary(item) {
  return !item.consumable && (item.gold?.total || 0) >= LEGENDARY_THRESHOLD;
}

function isCollectable(item) {
  return item.gold?.purchasable && item.gold?.total > 0 && !item.consumable &&
    Object.keys(item.stats || {}).length > 0;
}

function collectableItemIds(allItems) {
  return Object.values(allItems || {}).filter(isCollectable).map(i => i.id);
}

function pickShopItems(allItems, excludeIds = new Set()) {
  const eligible = Object.values(allItems).filter(i =>
    isCollectable(i) && !excludeIds.has(i.id)
  );
  return shuffle(eligible).slice(0, 6);
}

// DDragon exports consumables with stats:{}, so we define effects manually by item ID
const CONSUMABLE_EFFECTS = {
  2003: { healNow: 150 },                    // Health Potion
  2010: { healNow: 100 },                    // Total Biscuit
  2031: { healNow: 125, manaRestore: 75 },   // Refillable Potion
  2138: { healNow: 50,  manaRestore: 200 },  // Elixir of Sorcery (approximate)
  2139: { healNow: 50  },                    // Elixir of Wrath
  2140: { healNow: 50  },                    // Elixir of Iron
};

// Custom resource potions (not from DDragon)
const RESOURCE_POTIONS = {
  mana: {
    id: "custom_mana_potion",
    name: "Mana Potion",
    consumable: true,
    gold: { base: 35, total: 35, sell: 15, purchasable: true },
    stats: { manaRestore: 150 },
    imageUrl: "/assets/items/2003.png",
    imageFilter: "sepia(1) saturate(5) hue-rotate(200deg)",
    plaintext: "Restores 150 mana in combat.",
    description: "Restores 150 mana when used in combat.",
  },
  energy: {
    id: "custom_energy_potion",
    name: "Energy Potion",
    consumable: true,
    gold: { base: 35, total: 35, sell: 15, purchasable: true },
    stats: { manaRestore: 120 },
    imageUrl: "/assets/items/2003.png",
    imageFilter: "sepia(1) saturate(4) hue-rotate(30deg) brightness(1.4)",
    plaintext: "Restores 120 energy in combat.",
    description: "Restores 120 energy when used in combat.",
  },
  fury: {
    id: "custom_fury_potion",
    name: "Fury Potion",
    consumable: true,
    gold: { base: 35, total: 35, sell: 15, purchasable: true },
    stats: { manaRestore: 80 },
    imageUrl: "/assets/items/2003.png",
    imageFilter: "sepia(1) saturate(5) hue-rotate(330deg)",
    plaintext: "Restores 80 fury in combat.",
    description: "Restores 80 fury when used in combat.",
  },
};

// Potion carry limits per type
export const POTION_LIMITS = { health: 3, mana: 5 };

// Health potion = has healNow; Mana/resource potion = manaRestore only
export function isHealthPotion(item) { return !!item?.stats?.healNow; }
export function isManaPotion(item)   { return !!item?.stats?.manaRestore && !item?.stats?.healNow; }
export function countPotions(consumables = []) {
  let health = 0, mana = 0;
  for (const c of consumables) {
    if (isHealthPotion(c)) health++;
    else if (isManaPotion(c)) mana++;
  }
  return { health, mana };
}

const SIDE_DESTS = ["rest", "event"];
function pickSideDest() { return SIDE_DESTS[Math.floor(Math.random() * SIDE_DESTS.length)]; }

const BANK_USES_PER_RUN = 2;

function pickConsumableItems(allItems) {
  return Object.values(allItems)
    .filter(i => i.consumable && i.gold.purchasable && CONSUMABLE_EFFECTS[i.id])
    .map(i => ({ ...i, stats: { ...i.stats, ...CONSUMABLE_EFFECTS[i.id] } }));
}

function buildShopStock(itemsData, playerResource, excludeIds = new Set()) {
  const equipment   = pickShopItems(itemsData || {}, excludeIds);
  const consumables = pickConsumableItems(itemsData || {});
  const resourcePotion = RESOURCE_POTIONS[playerResource];
  const allConsumables = resourcePotion ? [resourcePotion, ...consumables] : consumables;
  return [...allConsumables, ...equipment].slice(0, 9);
}

function pickRewardItems(allItems, regionIdx, excludeIds = new Set()) {
  const eligible = Object.values(allItems).filter(i =>
    i.gold.purchasable && i.gold.total >= 800 && !i.consumable &&
    Object.keys(i.stats).length > 0 && !excludeIds.has(i.id)
  );
  const sorted = [...eligible].sort((a, b) => a.gold.total - b.gold.total);
  const tier = Math.min(sorted.length - 1, Math.floor(regionIdx * (sorted.length / 6)));
  const pool = sorted.slice(Math.max(0, tier - 10), Math.min(sorted.length, tier + 15));
  return shuffle(pool).slice(0, 3);
}

/** Build initial player state from a champion definition */
function buildBasePlayer(champion) {
  const s = champion.stats;

  const abilityUnlocked = { Q: false, W: false, E: false, R: false };

  // Ult charge: R starts at 0, needs ultChargeMax turns to charge
  const ultChargeMax = 8;

  return {
    champion,
    baseMaxHp:  s.hp,
    baseAD:     s.ad,
    baseAP:     champion.apBase || 0,
    baseArmor:  s.armor,
    baseMR:     s.mr,
    baseMaxMp:  s.mp,
    maxHp:      s.hp,
    hp:         s.hp,
    ad:         s.ad,
    ap:         champion.apBase || 0,
    armor:      s.armor,
    mr:         s.mr,
    maxMp:      s.mp,
    mp:         s.mp,
    resource:   champion.resource,
    inventory:   [],
    consumables: [],
    itemStats:  {},
    itemSynergies: {},
    abilityCooldowns: { Q: 0, W: 0, E: 0, R: 0 },
    abilityUnlocked,
    ultCharge:      0,
    ultChargeMax,
    winStreak:      0,
    combatsWon:     0,
  };
}

// ─── ABILITY UNLOCK THRESHOLDS ────────────────────────────────────────────────
// After winning minCombats combats, unlock if player has fewer than targetCount abilities
const COMBAT_UNLOCK_THRESHOLDS = [
  { minCombats: 1, targetCount: 2 },
  { minCombats: 3, targetCount: 3 },
  { minCombats: 6, targetCount: 4 },
];

// ─── EXPANDED RANDOM EVENTS ───────────────────────────────────────────────────
const RANDOM_EVENTS = [
  // Positive
  {
    id: "merchant",
    title: "Traveling Merchant",
    desc: "A suspicious merchant offers you gold — no questions asked.",
    image: "/assets/events/merchant.png",
    emoji: "🛒",
    effect: (s) => ({ gold: s.gold + 75 }),
    outcome: "+75 gold",
    positive: true,
  },
  {
    id: "dragon_fire",
    title: "Fire Drake Blessing",
    desc: "A young fire drake acknowledges your strength. Your blood burns hotter.",
    image: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Shyvana_0.jpg",
    emoji: "🔥",
    effect: (s) => ({ player: { ...s.player, ad: s.player.ad + 10, baseAD: s.player.baseAD + 10 } }),
    outcome: "+10 Attack Damage (permanent)",
    positive: true,
  },
  {
    id: "dragon_arcane",
    title: "Arcane Dragon Blessing",
    desc: "A storm drake breathes arcane energy into your soul.",
    image: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Kayle_0.jpg",
    emoji: "✨",
    effect: (s) => ({ player: { ...s.player, ap: s.player.ap + 15, baseAP: s.player.baseAP + 15 } }),
    outcome: "+15 Ability Power (permanent)",
    positive: true,
  },
  {
    id: "dragon_mountain",
    title: "Mountain Drake Blessing",
    desc: "Ancient stone magic flows through your armor.",
    image: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Malphite_0.jpg",
    emoji: "🗻",
    effect: (s) => ({ player: { ...s.player, armor: s.player.armor + 12, baseArmor: s.player.baseArmor + 12, mr: s.player.mr + 8, baseMR: s.player.baseMR + 8 } }),
    outcome: "+12 Armor, +8 Magic Resist (permanent)",
    positive: true,
  },
  {
    id: "dragon_ocean",
    title: "Ocean Drake Blessing",
    desc: "The sea heals your wounds and expands your life force.",
    image: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Nami_0.jpg",
    emoji: "🌊",
    effect: (s) => ({ player: { ...s.player, maxHp: s.player.maxHp + 80, hp: Math.min(s.player.maxHp + 80, s.player.hp + 80), baseMaxHp: s.player.baseMaxHp + 80 } }),
    outcome: "+80 Max HP (permanent)",
    positive: true,
  },
  {
    id: "potion",
    title: "Abandoned Supplies",
    desc: "You find a stash of healing potions left by a fallen adventurer.",
    image: null,
    emoji: "🧪",
    effect: (s) => ({ player: { ...s.player, hp: Math.min(s.player.maxHp, s.player.hp + 150) } }),
    outcome: "+150 HP restored",
    positive: true,
  },
  {
    id: "runes",
    title: "Ancient Rune Stone",
    desc: "You decipher ancient runes that expand your life force.",
    image: null,
    emoji: "🪨",
    effect: (s) => ({ player: { ...s.player, maxHp: s.player.maxHp + 40, hp: s.player.hp + 40, baseMaxHp: s.player.baseMaxHp + 40 } }),
    outcome: "+40 Max HP (permanent)",
    positive: true,
  },
  {
    id: "blacksmith",
    title: "Master Blacksmith",
    desc: "A dwarven blacksmith sharpens your weapon for free.",
    image: null,
    emoji: "⚒️",
    effect: (s) => ({ player: { ...s.player, ad: s.player.ad + 6, baseAD: s.player.baseAD + 6 } }),
    outcome: "+6 Attack Damage (permanent)",
    positive: true,
  },
  {
    id: "scroll",
    title: "Arcane Scroll",
    desc: "You study a scroll of forbidden magic.",
    image: null,
    emoji: "📜",
    effect: (s) => ({ player: { ...s.player, ap: s.player.ap + 10, baseAP: s.player.baseAP + 10 } }),
    outcome: "+10 Ability Power (permanent)",
    positive: true,
  },
  {
    id: "streak_bonus",
    title: "Warrior's Reputation",
    desc: "Your recent victories inspire nearby merchants to offer tribute.",
    image: null,
    emoji: "⚔️",
    effect: (s) => ({ gold: s.gold + 50 + s.player.winStreak * 15 }),
    outcome: (s) => `+${50 + s.player.winStreak * 15} gold`,
    positive: true,
  },
  // Negative
  {
    id: "ambush",
    title: "Ambush!",
    desc: "Bandits attack from the shadows. Pay 60 gold or suffer the consequences.",
    image: null,
    emoji: "🗡️",
    effect: (s) => s.gold >= 60
      ? { gold: s.gold - 60 }
      : { player: { ...s.player, hp: Math.max(1, s.player.hp - 120) } },
    outcome: (s) => s.gold >= 60 ? "-60 gold" : "-120 HP (couldn't pay)",
    positive: false,
  },
  {
    id: "thresh_pact",
    title: "Thresh's Bargain",
    desc: "The Chain Warden offers gold in exchange for your vitality. A permanent deal.",
    image: "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Thresh_0.jpg",
    emoji: "⛓️",
    effect: (s) => ({
      gold: s.gold + 200,
      player: { ...s.player, maxHp: Math.max(100, s.player.maxHp - Math.floor(s.player.maxHp * 0.12)), hp: Math.max(1, s.player.hp - Math.floor(s.player.maxHp * 0.12)), baseMaxHp: Math.max(100, s.player.baseMaxHp - Math.floor(s.player.baseMaxHp * 0.12)) }
    }),
    outcome: "+200 gold, -12% Max HP (permanent)",
    positive: false,
  },
  {
    id: "curse",
    title: "Ancient Curse",
    desc: "You disturb a cursed ruin. Your magic feels sluggish.",
    image: null,
    emoji: "💀",
    effect: (s) => ({ player: { ...s.player, mp: Math.max(0, s.player.mp - Math.floor(s.player.maxMp * 0.3)) } }),
    outcome: "-30% current mana/energy",
    positive: false,
  },
  // Neutral / interesting
  {
    id: "gamble",
    title: "The Card Shark",
    desc: "A mysterious gambler offers you a 50/50 bet with 80 gold.",
    image: null,
    emoji: "🎲",
    effect: (s) => Math.random() < 0.5 ? { gold: s.gold + 80 } : { gold: Math.max(0, s.gold - 80) },
    outcome: () => Math.random() < 0.5 ? "+80 gold (won!)" : "-80 gold (lost)",
    positive: null,
  },
  {
    id: "wish_well",
    title: "Wishing Well",
    desc: "Toss gold in and make a wish. The well rewards sacrifice.",
    image: null,
    emoji: "💧",
    effect: (s) => {
      const sacrifice = Math.min(s.gold, 50);
      return {
        gold: s.gold - sacrifice,
        player: { ...s.player, maxHp: s.player.maxHp + sacrifice * 2, hp: s.player.hp + sacrifice * 2, baseMaxHp: s.player.baseMaxHp + sacrifice * 2 }
      };
    },
    outcome: (s) => `-${Math.min(s.gold,50)} gold → +${Math.min(s.gold,50)*2} Max HP`,
    positive: null,
  },
  {
    id: "training",
    title: "Shadow Trainer",
    desc: "A mysterious figure offers brief combat training. Small permanent gains.",
    image: null,
    emoji: "🥷",
    effect: (s) => ({
      player: { ...s.player, ad: s.player.ad + 4, baseAD: s.player.baseAD + 4, armor: s.player.armor + 4, baseArmor: s.player.baseArmor + 4 }
    }),
    outcome: "+4 AD, +4 Armor (permanent)",
    positive: true,
  },
];

export function getRandomEvent() {
  return RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
}

// ─── STORE ────────────────────────────────────────────────────────────────────
export const useGameStore = create(
  persist(
    (set, get) => ({
  championsData: null,
  itemsData:     null,
  dataLoaded:    false,
  dataError:     null,

  screen:        "loading",
  gameMode:      "normal", // "normal" | "coop" | "vs"
  champPool:     [],
  player:        null,
  gold:          100,
  bank:          0,
  regionIdx:     0,
  combatIndex:   0,
  totalCombats:  0,
  totalKills:    0,
  totalDamage:   0,
  winStreak:     0,

  // Combat — enemies is now an array
  combatCtx:     null,
  enemies:       [],   // array of scaled enemy objects
  activeEnemyIdx: 0,   // which enemy is currently targeted

  shopItems:     [],
  rewardItems:   [],
  acquiredLegendaryIds: [],
  combatLog:     [],

  // Side destination (rest/event) — picked once per combat, usable once
  sideDest:     "rest",
  sideDestUsed: false,

  // Bank transactions left this run
  bankUsesLeft: 2,

  // ─── ACHIEVEMENTS ─────────────────────────────────────────────────────────
  unlockedAchievements: [],   // account-wide (persisted)
  achievementQueue:     [],   // ids pending to show as toast
  collectedItemIds:     [],   // account-wide set of equipment ids ever collected
  collectableTotal:     0,    // total collectable items (computed on data load)
  // per-run counters
  runRested:          false,
  runGoldEarned:      0,
  runInfoOpens:       0,
  runManaPotionsUsed: 0,

  // Tutorial (0-8 = step index, null = not active)
  tutorialStep: null,
  tutorialDone: false,

  // Soraka boss-kill blessing overlay
  sorakaBlessing: false,

  // Event modal
  pendingEvent:  null,

  // Ability unlock modal
  pendingUnlock: null, // { options: ['W','E'] } — player picks one

  // ─── DATA LOADING ─────────────────────────────────────────────────────────
  loadData: async () => {
    try {
      const [{ default: champJson }, { default: itemsJson }] = await Promise.all([
        import("../data/champions.json"),
        import("../data/items.json"),
      ]);
      const merged = {};
      for (const [id, ddData] of Object.entries(champJson)) {
        if (CHAMPION_CONFIGS[id]) merged[id] = mergeChampionData(ddData, CHAMPION_CONFIGS[id]);
      }
      set({
        championsData: merged,
        itemsData: itemsJson,
        dataLoaded: true,
        screen: "home",
        champPool: pickChampionPool(Object.values(merged)),
        collectableTotal: collectableItemIds(itemsJson).length,
      });
    } catch (err) {
      console.warn("Data files not found:", err.message);
      set({ dataError: err.message, dataLoaded: true, screen: "home", champPool: [] });
    }
  },

  refreshChampPool: () => {
    const { championsData } = get();
    if (championsData) set({ champPool: pickChampionPool(Object.values(championsData)) });
  },

  // ─── CHAMPION SELECT ──────────────────────────────────────────────────────
  selectChampion: (champion) => {
    const { itemsData, tutorialDone } = get();
    set({
      player:        buildBasePlayer(champion),
      gold:          100,
      regionIdx:     0,
      combatIndex:   0,
      totalCombats:  0,
      totalKills:    0,
      totalDamage:   0,
      winStreak:     0,
      pendingUnlock: ["Q", "W", "E"],
      shopItems:            buildShopStock(itemsData, champion.resource),
      acquiredLegendaryIds: [],
      sideDest:             pickSideDest(),
      sideDestUsed:         false,
      bankUsesLeft:         BANK_USES_PER_RUN,
      runRested:            false,
      runGoldEarned:        0,
      runInfoOpens:         0,
      runManaPotionsUsed:   0,
      tutorialStep:         tutorialDone ? null : 0,
      screen:               "map",
    });
    playSfx("respawn", 0.5);
  },

  // ─── ABILITY UNLOCK ───────────────────────────────────────────────────────
  unlockAbility: (key) => {
    set(state => {
      if (!state.player) return {};
      return {
        player: { ...state.player, abilityUnlocked: { ...state.player.abilityUnlocked, [key]: true } },
        pendingUnlock: null,
      };
    });
  },

  dismissUnlock: () => set({ pendingUnlock: null }),

  // ─── MAP NAVIGATION ───────────────────────────────────────────────────────
  chooseDestination: (destType) => {
    if (destType === "combat") {
      get().startCombat();
    } else if (destType === "shop") {
      // Shop stock is generated after each combat — just show the screen
      set({ screen: "shop" });
    } else if (destType === "rest" || destType === "event") {
      if (get().sideDestUsed) return; // already used this combat cycle
      if (destType === "rest") {
        get().doRest();
      } else {
        const ev = getRandomEvent();
        set({ pendingEvent: ev, screen: "event" });
      }
    }
  },

  resolveEvent: () => {
    const { pendingEvent } = get();
    if (!pendingEvent) return;
    const state = get();
    const updates = pendingEvent.effect(state);
    set({ ...updates, pendingEvent: null, sideDestUsed: true, screen: "map" });
  },

  doRest: () => {
    set(state => {
      const healAmt = Math.floor(state.player.maxHp * 0.3);
      return {
        player: {
          ...state.player,
          hp: Math.min(state.player.maxHp, state.player.hp + healAmt),
          mp: state.player.resource !== "none" ? state.player.maxMp : state.player.mp,
        },
        sideDestUsed: true,
        runRested: true,
        screen: "map",
      };
    });
  },

  // ─── COMBAT ───────────────────────────────────────────────────────────────
  startCombat: () => {
    const { regionIdx, combatIndex, player, gameMode } = get();
    const region = REGIONS[regionIdx];

    // Build enemy group: 1 enemy normally, 2 on even combat indices, boss always solo
    const isBossFight = (combatIndex + 1) % region.bossEvery === 0;

    // VS mode: boss positions trigger PvP instead of CPU combat
    if (gameMode === "vs" && isBossFight) {
      set({ screen: "vscombat" });
      return;
    }
    const enemyCount = isBossFight ? 1 : (combatIndex % 2 === 1 ? 2 : 1);

    const rawEnemies = [];
    for (let i = 0; i < enemyCount; i++) {
      rawEnemies.push(getDifficultyScaledEnemy(region.id, combatIndex));
    }
    // If 2 enemies, second is weaker
    if (rawEnemies.length === 2) {
      const e2 = rawEnemies[1];
      rawEnemies[1] = {
        ...e2,
        scaledStats: { ...e2.scaledStats, hp: Math.round(e2.scaledStats.hp * 0.65), ad: Math.round(e2.scaledStats.ad * 0.65) },
        currentHp: Math.round(e2.scaledStats.hp * 0.65),
      };
    }

    const { player: p, combat: c } = initCombat(player, rawEnemies[0]);

    set({
      player:        p,
      enemies:       rawEnemies,
      activeEnemyIdx: 0,
      combatCtx:     { ...c, log: [...c.log, ...(rawEnemies.length > 1 ? [{ type: "system", text: `⚠️ **${rawEnemies.length} enemies** appear!` }] : [])] },
      combatLog:     [...c.log, ...(rawEnemies.length > 1 ? [{ type: "system", text: `⚠️ **${rawEnemies.length} enemies** appear!` }] : [])],
      screen:        "combat",
    });
  },

  setActiveEnemy: (idx) => set({ activeEnemyIdx: idx }),

  useAbility: (abilityKey) => {
    const { player, combatCtx, enemies, activeEnemyIdx } = get();
    if (!combatCtx || combatCtx.turn !== "player" || combatCtx.over) return;

    const ability = player.champion.abilities.find(a => a.key === abilityKey);
    if (!ability) return;

    // Unlock check
    if (!player.abilityUnlocked?.[abilityKey]) {
      set(state => ({ combatLog: [...state.combatLog, { type: "system", text: `🔒 ${ability.gameplayName} is locked. Win more combats to unlock.` }] }));
      return;
    }

    // Ult charge check
    if (abilityKey === "R" && player.ultCharge < player.ultChargeMax) {
      set(state => ({ combatLog: [...state.combatLog, { type: "system", text: `⚡ Ultimate not ready — ${player.ultCharge}/${player.ultChargeMax} charges` }] }));
      return;
    }

    // Cooldown / resource check
    const cd = (player.abilityCooldowns || {})[abilityKey] || 0;
    if (cd > 0) {
      set(state => ({ combatLog: [...state.combatLog, { type: "system", text: `⏳ ${ability.gameplayName} on cooldown (${cd} turns)` }] }));
      return;
    }
    if (ability.costType !== "none" && player.mp < ability.cost) {
      set(state => ({ combatLog: [...state.combatLog, { type: "system", text: `❌ Not enough ${ability.costType}` }] }));
      return;
    }

    const activeEnemy = enemies[activeEnemyIdx];
    let { player: p2, combat: c2, enemy: e2, log } = applyPlayerAbility(ability, player, combatCtx, activeEnemy);
    c2 = { ...c2, consecutivePasses: 0 }; // using an ability breaks the pass streak

    // Saitama — kill an enemy from full HP in a single hit
    if (activeEnemy.currentHp >= activeEnemy.scaledStats.hp && e2.currentHp <= 0) {
      get().unlockAchievement("saitama");
    }

    // If ult used, reset charge
    const newUltCharge = abilityKey === "R" ? 0 : p2.ultCharge;
    const p2Final = { ...p2, ultCharge: newUltCharge };

    let newEnemies = enemies.map((e, i) => i === activeEnemyIdx ? e2 : e);
    const splashLog = [];

    // ── splashToSecond: hit one other alive enemy for a fraction of the damage ──
    if (ability.splashToSecond) {
      const mainDmg = activeEnemy.currentHp - e2.currentHp;
      if (mainDmg > 0) {
        const splashIdx = newEnemies.findIndex((e, i) => i !== activeEnemyIdx && e.currentHp > 0);
        if (splashIdx >= 0) {
          const splashDmg = Math.max(1, Math.round(mainDmg * ability.splashToSecond));
          splashLog.push({ type: "system", text: `↪ Splash → ${newEnemies[splashIdx].name} 🔴 **${splashDmg}** dmg` });
          newEnemies = newEnemies.map((e, i) => i === splashIdx ? { ...e, currentHp: e.currentHp - splashDmg } : e);
        }
      }
    }

    // ── hitAllEnemies: deal full ability damage to every other alive enemy ──
    if (ability.hitAllEnemies) {
      newEnemies = newEnemies.map((e, i) => {
        if (i === activeEnemyIdx || e.currentHp <= 0) return e;
        const dmgResult = resolveAbilityDamage(ability, p2, c2, {
          currentHp: e.currentHp,
          scaledStats: e.scaledStats,
          armor: e.scaledStats.armor,
          mr:    e.scaledStats.mr,
        });
        if (dmgResult.total > 0) {
          splashLog.push({ type: "system", text: `↪ Volley → ${e.name} 🔴 **${dmgResult.total}** dmg` });
        }
        return { ...e, currentHp: e.currentHp - dmgResult.total };
      });
    }

    const newLog = [...get().combatLog, ...log, ...splashLog];

    // Check if any enemies died (including splash/AoE kills)
    const aliveAfter = newEnemies.filter(e => e.currentHp > 0);
    if (aliveAfter.length === 0) {
      const result = get()._handleVictory(p2Final, c2, newEnemies, newLog);
      set({ player: result.player, combatCtx: result.combat, enemies: result.enemies, activeEnemyIdx: 0, combatLog: result.log });
      return;
    }
    if (e2.currentHp <= 0) {
      // Active enemy died but others remain — switch target
      const nextIdx = newEnemies.findIndex(e => e.currentHp > 0);
      const killLog = [...newLog, { type: "reward", text: `💀 ${e2.name} defeated! ${aliveAfter.length} ${aliveAfter.length === 1 ? "enemy" : "enemies"} remaining.` }];
      set({ player: p2Final, combatCtx: { ...c2, turn: "enemy" }, enemies: newEnemies, activeEnemyIdx: nextIdx, combatLog: killLog });
      setTimeout(() => get()._runEnemyTurn(), 700);
      return;
    }

    set({
      player:    p2Final,
      combatCtx: { ...c2, turn: "enemy", turnCount: c2.turnCount + 1 },
      enemies:   newEnemies,
      combatLog: newLog,
    });
    setTimeout(() => get()._runEnemyTurn(), 700);
  },

  passTurn: () => {
    const { player, combatCtx } = get();
    if (!combatCtx || combatCtx.turn !== "player" || combatCtx.over) return;
    const { player: p2, log } = passTurnPure(player);
    const passes = (combatCtx.consecutivePasses || 0) + 1;
    set({
      player:    p2,
      combatCtx: {
        ...combatCtx,
        turn: "enemy",
        turnCount: combatCtx.turnCount + 1,
        consecutivePasses: passes,
        moggeadorReady: combatCtx.moggeadorReady || passes >= 10,
      },
      combatLog: [...get().combatLog, ...log],
    });
    setTimeout(() => get()._runEnemyTurn(), 700);
  },

  useConsumable: (item) => {
    const { combatCtx } = get();
    if (!combatCtx || combatCtx.turn !== "player" || combatCtx.over) return;
    if (item.stats?.healNow && combatCtx.healPotionUsed) {
      set(state => ({ combatLog: [...state.combatLog, { type: "system", text: "❌ Already used a healing potion this combat." }] }));
      return;
    }
    set(state => {
      let p = { ...state.player };
      let ctx = { ...state.combatCtx };
      const parts = [`🧪 Used **${item.name}**`];
      if (item.stats?.healNow) {
        const gain = Math.min(p.maxHp, p.hp + item.stats.healNow) - p.hp;
        p.hp = p.hp + gain;
        parts.push(`❤️ +${gain} HP`);
        ctx.healPotionUsed = true;
      }
      if (item.stats?.manaRestore) {
        const gain = Math.min(p.maxMp, p.mp + item.stats.manaRestore) - p.mp;
        p.mp = p.mp + gain;
        parts.push(`+${gain} ${p.resource}`);
      }
      let removed = false;
      p.consumables = (state.player.consumables || []).filter(c => {
        if (!removed && c.id === item.id) { removed = true; return false; }
        return true;
      });
      // Track mana-potion usage for the "Adicto" achievement
      const usedManaPotion = isManaPotion(item);
      return {
        player:    p,
        combatCtx: { ...ctx, turn: "enemy", turnCount: ctx.turnCount + 1, consecutivePasses: 0 },
        combatLog: [...state.combatLog, { type: "system", text: parts.join(" | ") }],
        runManaPotionsUsed: state.runManaPotionsUsed + (usedManaPotion ? 1 : 0),
      };
    });
    get()._checkAchievements();
    setTimeout(() => get()._runEnemyTurn(), 700);
  },

  _runEnemyTurn: () => {
    let { player, combatCtx, enemies, activeEnemyIdx } = get();
    const aliveEnemies = enemies.filter(e => e.currentHp > 0);
    if (!aliveEnemies.length || combatCtx.over) return;

    let currentLog = [...get().combatLog];
    let currentPlayer = player;
    let currentCtx = combatCtx;
    let currentEnemies = [...enemies];

    // Each alive enemy attacks
    for (let i = 0; i < currentEnemies.length; i++) {
      if (currentEnemies[i].currentHp <= 0) continue;
      const { player: p2, combat: c2, enemy: e2, log } = resolveEnemyTurn(currentPlayer, currentCtx, currentEnemies[i]);
      currentPlayer = p2;
      currentCtx = c2;
      currentEnemies = currentEnemies.map((e, idx) => idx === i ? e2 : e);
      currentLog = [...currentLog, ...log];

      if (currentPlayer.hp <= 0) break;
    }

    // Charge ult only once R is unlocked
    if (currentPlayer.abilityUnlocked?.R) {
      const newUltCharge = Math.min(currentPlayer.ultChargeMax, (currentPlayer.ultCharge || 0) + 1);
      currentPlayer = { ...currentPlayer, ultCharge: newUltCharge };
    }

    if (currentPlayer.hp <= 0) {
      const deathLog = [...currentLog, { type: "death", text: `💀 **${currentPlayer.champion.name} has fallen in battle...**` }];
      set({ player: currentPlayer, enemies: currentEnemies, combatCtx: { ...currentCtx, over: true, result: "defeat", turn: "player" }, combatLog: deathLog, gold: 0 });
      setTimeout(() => set({ screen: "gameover" }), 2000);
      return;
    }

    // Enemies may have died to bleed / delayed damage / counters during their turn
    const aliveAfter = currentEnemies.filter(e => e.currentHp > 0);
    if (aliveAfter.length === 0) {
      const result = get()._handleVictory(currentPlayer, currentCtx, currentEnemies, currentLog);
      set({ player: result.player, combatCtx: result.combat, enemies: result.enemies, activeEnemyIdx: 0, combatLog: result.log });
      return;
    }

    // Make sure the active target is a living enemy when control returns to the player
    const nextActive = currentEnemies[activeEnemyIdx]?.currentHp > 0
      ? activeEnemyIdx
      : currentEnemies.findIndex(e => e.currentHp > 0);

    set({ player: currentPlayer, enemies: currentEnemies, activeEnemyIdx: nextActive, combatCtx: { ...currentCtx, turn: "player" }, combatLog: currentLog });
  },

  _handleVictory: (player, combat, enemies, logBase) => {
    const { regionIdx, combatIndex, totalKills, totalCombats, winStreak } = get();

    const totalGold = enemies.reduce((sum, e) => sum + Math.round(e.goldReward || 40), 0);
    const potionDrop = enemies.some(e => Math.random() < (e.potionDropChance || 0.2));
    let newHp = player.hp;
    let extraMsg = "";

    if (potionDrop) {
      newHp = Math.min(player.maxHp, player.hp + 100);
      extraMsg = " | 🧪 Health Potion (+100 HP)";
    }

    const newWinStreak = winStreak + 1;
    let streakBonus = 0;
    let streakMsg = "";
    if (newWinStreak >= 3) {
      streakBonus = newWinStreak * 10;
      streakMsg = ` | 🔥 Win Streak x${newWinStreak}: +${streakBonus} bonus gold!`;
    }

    const newCombatsWon = (player.combatsWon || 0) + 1;

    // Check for ability unlock
    const { abilityUnlocked } = player;
    let pendingUnlock = null;
    const allLockedKeys = ["Q", "W", "E", "R"].filter(k => !abilityUnlocked[k]);
    const unlockedCount = 4 - allLockedKeys.length;
    // R requires Q, W and E to be already unlocked
    const canUnlockR = abilityUnlocked.Q && abilityUnlocked.W && abilityUnlocked.E;
    const availableKeys = allLockedKeys.filter(k => k !== "R" || canUnlockR);
    for (const { minCombats, targetCount } of COMBAT_UNLOCK_THRESHOLDS) {
      if (newCombatsWon >= minCombats && unlockedCount < targetCount && availableKeys.length > 0) {
        pendingUnlock = availableKeys;
        break;
      }
    }

    const victoryLog = [
      ...logBase,
      { type: "reward", text: `🏆 **Victory!** +${totalGold} gold${extraMsg}${streakMsg}` },
    ];

    get()._setState({
      gold:          get().gold + totalGold + streakBonus,
      totalKills:    totalKills + enemies.length,
      totalCombats:  totalCombats + 1,
      winStreak:     newWinStreak,
      runGoldEarned: get().runGoldEarned + totalGold + streakBonus,
    });

    // ── Moment-based achievements on victory (use pre-blessing HP) ──
    if (newHp > 0 && newHp < player.maxHp * 0.1) get().unlockAchievement("superviviente");
    if (combat.moggeadorReady) get().unlockAchievement("moggeador");
    if (enemies.some(e => e.id === "void_watcher")) get().unlockAchievement("hall_fama");
    get()._checkAchievements(); // Cain (runGoldEarned) + any threshold reached

    // ── Soraka's blessing: killing a boss fully restores HP and resource ──
    const bossKilled = enemies.some(e => e.isBoss);
    let finalPlayer = { ...player, hp: newHp, combatsWon: newCombatsWon, ultCharge: Math.min(player.ultChargeMax, (player.ultCharge || 0)) };
    if (bossKilled) {
      finalPlayer = {
        ...finalPlayer,
        hp: finalPlayer.maxHp,
        mp: finalPlayer.resource !== "none" ? finalPlayer.maxMp : finalPlayer.mp,
      };
      get()._setState({ sorakaBlessing: true });
    }

    return {
      player:  finalPlayer,
      combat:  { ...combat, over: true, result: "victory", turn: "player", pendingUnlock },
      enemies,
      log:     bossKilled
        ? [...victoryLog, { type: "system", text: "⭐ **Bendición de Soraka** — vida y recurso restaurados." }]
        : victoryLog,
    };
  },

  dismissSorakaBlessing: () => set({ sorakaBlessing: false }),

  proceedAfterCombat: () => {
    const { regionIdx, combatIndex, itemsData, combatCtx, player } = get();
    const region = REGIONS[regionIdx];
    const newCombatIndex = combatIndex + 1;

    // Check unlock before proceeding
    if (combatCtx?.pendingUnlock) {
      set({ pendingUnlock: combatCtx.pendingUnlock, combatCtx: { ...combatCtx, pendingUnlock: null } });
      playSfx("levelup", 0.55); // ability-choice panel appears
      return;
    }

    // Restore energy to full after combat for energy champions
    const updatedPlayer = player.resource === "energy"
      ? { ...player, mp: player.maxMp }
      : player;

    const { acquiredLegendaryIds } = get();
    const excludeIds   = new Set(acquiredLegendaryIds);
    const newShopItems = buildShopStock(itemsData, updatedPlayer.resource, excludeIds);

    if (newCombatIndex >= region.combatsPerRegion) {
      // Track region completion for leaderboard
      try { import("./authStore").then(m => m.useAuthStore.getState().updateLeaderboardStats("region", region.id)); } catch {}

      if (regionIdx >= REGIONS.length - 1) {
        set({ screen: "victory", player: updatedPlayer });
        return;
      }
      set({ regionIdx: regionIdx + 1, combatIndex: 0, screen: "reward", rewardItems: pickRewardItems(itemsData || {}, regionIdx + 1, excludeIds), shopItems: newShopItems, player: updatedPlayer, sideDest: pickSideDest(), sideDestUsed: false });
      get()._checkAchievements(); // region/champion-based (reached new region)
    } else {
      set({ combatIndex: newCombatIndex, screen: "reward", rewardItems: pickRewardItems(itemsData || {}, regionIdx, excludeIds), shopItems: newShopItems, player: updatedPlayer, sideDest: pickSideDest(), sideDestUsed: false });
    }
  },

  // ─── ITEM REWARD ──────────────────────────────────────────────────────────
  pickRewardItem: (item) => {
    set(state => {
      const updatedInventory = [...state.player.inventory, item];
      const hpBefore = state.player.maxHp;
      let updatedPlayer = applyItemStatsToPlayer({ ...state.player, inventory: updatedInventory }, updatedInventory);
      const hpGained = updatedPlayer.maxHp - hpBefore;
      if (hpGained > 0) updatedPlayer = { ...updatedPlayer, hp: Math.min(updatedPlayer.maxHp, state.player.hp + hpGained) };
      const synergies = computeItemSynergies(updatedInventory);
      const acquiredLegendaryIds = isLegendary(item)
        ? [...state.acquiredLegendaryIds, item.id]
        : state.acquiredLegendaryIds;
      const collectedItemIds = state.collectedItemIds.includes(item.id)
        ? state.collectedItemIds : [...state.collectedItemIds, item.id];
      return { player: { ...updatedPlayer, itemSynergies: synergies }, acquiredLegendaryIds, collectedItemIds, screen: "map" };
    });
    get()._checkAchievements();
  },

  skipReward: () => set({ screen: "map" }),

  discardAndPickItem: (inventoryIndex, rewardItem) => {
    set(state => {
      const inv = state.player.inventory.filter((_, i) => i !== inventoryIndex);
      const newInv = [...inv, rewardItem];
      const hpBefore = state.player.maxHp;
      let updatedPlayer = applyItemStatsToPlayer({ ...state.player, inventory: newInv }, newInv);
      const hpGained = updatedPlayer.maxHp - hpBefore;
      if (hpGained > 0) updatedPlayer = { ...updatedPlayer, hp: Math.min(updatedPlayer.maxHp, state.player.hp + hpGained) };
      const synergies = computeItemSynergies(newInv);
      const acquiredLegendaryIds = isLegendary(rewardItem)
        ? [...state.acquiredLegendaryIds, rewardItem.id]
        : state.acquiredLegendaryIds;
      const collectedItemIds = state.collectedItemIds.includes(rewardItem.id)
        ? state.collectedItemIds : [...state.collectedItemIds, rewardItem.id];
      return { player: { ...updatedPlayer, itemSynergies: synergies }, acquiredLegendaryIds, collectedItemIds, screen: "map" };
    });
    get()._checkAchievements();
  },

  // ─── SHOP ─────────────────────────────────────────────────────────────────
  buyItem: (item) => {
    const { gold, player } = get();
    if (gold < item.gold.total) return false;
    if (!item.consumable && (player?.inventory?.length || 0) >= 6) return "full";
    if (item.consumable) {
      const { health, mana } = countPotions(player?.consumables || []);
      if (isHealthPotion(item) && health >= POTION_LIMITS.health) return "potion-limit";
      if (isManaPotion(item)   && mana   >= POTION_LIMITS.mana)   return "potion-limit";
    }
    set(state => {
      const newGold = state.gold - item.gold.total;
      const newShopItems = item.consumable
        ? state.shopItems
        : state.shopItems.filter(s => s !== item);
      if (item.consumable) {
        return { gold: newGold, shopItems: newShopItems, player: { ...state.player, consumables: [...(state.player.consumables || []), item] } };
      }
      const inv = [...state.player.inventory, item];
      const hpBefore = state.player.maxHp;
      let updatedPlayer = applyItemStatsToPlayer({ ...state.player, inventory: inv }, inv);
      const hpGained = updatedPlayer.maxHp - hpBefore;
      if (hpGained > 0) updatedPlayer = { ...updatedPlayer, hp: Math.min(updatedPlayer.maxHp, state.player.hp + hpGained) };
      const synergies = computeItemSynergies(inv);
      const acquiredLegendaryIds = isLegendary(item)
        ? [...state.acquiredLegendaryIds, item.id]
        : state.acquiredLegendaryIds;
      const collectedItemIds = state.collectedItemIds.includes(item.id)
        ? state.collectedItemIds : [...state.collectedItemIds, item.id];
      return { gold: newGold, shopItems: newShopItems, acquiredLegendaryIds, collectedItemIds, player: { ...updatedPlayer, itemSynergies: synergies } };
    });
    get()._checkAchievements();
    return true;
  },

  sellItem: (inventoryIndex) => {
    set(state => {
      const item = state.player.inventory?.[inventoryIndex];
      if (!item) return {};
      const sellValue = item.gold?.sell || Math.floor((item.gold?.total || 0) / 2);
      const inv = state.player.inventory.filter((_, i) => i !== inventoryIndex);
      const updatedPlayer = applyItemStatsToPlayer({ ...state.player, inventory: inv }, inv);
      const synergies = computeItemSynergies(inv);
      return {
        gold: state.gold + sellValue,
        runGoldEarned: state.runGoldEarned + sellValue,
        player: { ...updatedPlayer, itemSynergies: synergies },
      };
    });
    get()._checkAchievements();
  },

  depositBank:  (amt) => {
    const { gold, bank, bankUsesLeft } = get();
    if (bankUsesLeft <= 0) return "no-uses";
    const a = Math.min(amt, gold);
    if (a <= 0) return false;
    const newBank = bank + a;
    set({ gold: gold - a, bank: newBank, bankUsesLeft: bankUsesLeft - 1 });
    get()._checkAchievements();
    // Sync leaderboard bank stat (max ever)
    try { import("./authStore").then(m => m.useAuthStore.getState().updateLeaderboardStats("bank", newBank)); } catch {}
    return true;
  },
  withdrawBank: (amt) => { const { gold, bank, bankUsesLeft } = get(); if (bankUsesLeft <= 0) return "no-uses"; const a = Math.min(amt, bank); if (a<=0) return false; set({ gold: gold+a, bank: bank-a, bankUsesLeft: bankUsesLeft-1 }); return true; },
  leaveShop:    () => set({ screen: "map" }),

  // ─── GAME OVER / RESTART ──────────────────────────────────────────────────
  goToHome:         () => set({ screen: "home" }),
  goToSelect:       () => set({ screen: "select" }),
  goToModeSelect:   () => set({ screen: "modeselect" }),
  goToLeaderboard:  () => set({ screen: "leaderboard" }),
  goToPatchNotes:   () => set({ screen: "patchnotes" }),
  goToAchievements: () => set({ screen: "achievements" }),
  goToCredits:      () => set({ screen: "credits" }),
  setGameMode:      (mode) => set({ gameMode: mode }),

  // ─── ACHIEVEMENTS ─────────────────────────────────────────────────────────
  unlockAchievement: (id) => {
    const { unlockedAchievements, achievementQueue } = get();
    if (unlockedAchievements.includes(id)) return;
    set({
      unlockedAchievements: [...unlockedAchievements, id],
      achievementQueue: [...achievementQueue, id],
    });
  },

  dismissAchievementToast: () => {
    set(state => ({ achievementQueue: state.achievementQueue.slice(1) }));
  },

  registerInfoOpen: () => {
    set(state => ({ runInfoOpens: state.runInfoOpens + 1 }));
    get()._checkAchievements();
  },

  // Evaluate all state-derivable achievements and unlock any newly satisfied
  _checkAchievements: () => {
    const st = get();
    const ctx = {
      bank:               st.bank,
      regionIdx:          st.regionIdx,
      runRested:          st.runRested,
      runGoldEarned:      st.runGoldEarned,
      runInfoOpens:       st.runInfoOpens,
      runManaPotionsUsed: st.runManaPotionsUsed,
      championId:         st.player?.champion?.id,
      collectedCount:     st.collectedItemIds.length,
      totalItemCount:     st.collectableTotal,
    };
    for (const a of ACHIEVEMENTS) {
      if (a.check && !st.unlockedAchievements.includes(a.id)) {
        try { if (a.check(ctx)) get().unlockAchievement(a.id); } catch { /* ignore */ }
      }
    }
    // Sync achievement count for leaderboard
    const count = get().unlockedAchievements.length;
    try { import("./authStore").then(m => m.useAuthStore.getState().updateLeaderboardStats("achievements", count)); } catch {}
  },

  continueRun: () => set({ screen: "map" }),

  startNewRun: () => {
    const { championsData, bank } = get();
    set({
      player: null, gold: 100, bank, gameMode: "normal",
      regionIdx: 0, combatIndex: 0,
      totalCombats: 0, totalKills: 0, totalDamage: 0, winStreak: 0,
      combatCtx: null, enemies: [], combatLog: [],
      pendingEvent: null, pendingUnlock: null,
      acquiredLegendaryIds: [], shopItems: [], rewardItems: [],
      sideDest: pickSideDest(), sideDestUsed: false, bankUsesLeft: BANK_USES_PER_RUN,
      runRested: false, runGoldEarned: 0, runInfoOpens: 0, runManaPotionsUsed: 0,
      champPool: championsData ? pickChampionPool(Object.values(championsData)) : [],
      screen: "select",
    });
  },

  advanceTutorial: () => {
    const { tutorialStep } = get();
    if (tutorialStep === null) return;
    const next = tutorialStep + 1;
    // 10 steps total (0-9) — keep in sync with TutorialCard STEPS
    if (next >= 10) {
      set({ tutorialStep: null, tutorialDone: true });
    } else {
      set({ tutorialStep: next });
    }
  },

  skipTutorial: () => set({ tutorialStep: null, tutorialDone: true }),

  replayTutorial: () => {
    const { player } = get();
    if (player) {
      // Active run: replay the guided tutorial over the current map
      set({ tutorialStep: 0, screen: "map" });
    } else {
      // No run yet: mark it pending so it shows when the next run starts
      set({ tutorialDone: false, screen: "select" });
    }
  },

  restartGame: () => {
    const { championsData } = get();
    set({
      screen: "home",
      champPool: championsData ? pickChampionPool(Object.values(championsData)) : [],
      player: null, gold: 100, regionIdx: 0, combatIndex: 0,
      totalCombats: 0, totalKills: 0, totalDamage: 0, winStreak: 0,
      combatCtx: null, enemies: [], combatLog: [], pendingEvent: null, pendingUnlock: null,
    });
  },

  _setState: (updates) => set(updates),
    }),
    {
      name: "rougeterra-v1",
      partialize: (state) => ({
        player:               state.player,
        gold:                 state.gold,
        bank:                 state.bank,
        regionIdx:            state.regionIdx,
        combatIndex:          state.combatIndex,
        shopItems:            state.shopItems,
        rewardItems:          state.rewardItems,
        acquiredLegendaryIds: state.acquiredLegendaryIds,
        totalKills:           state.totalKills,
        totalCombats:         state.totalCombats,
        totalDamage:          state.totalDamage,
        winStreak:            state.winStreak,
        sideDest:             state.sideDest,
        sideDestUsed:         state.sideDestUsed,
        bankUsesLeft:         state.bankUsesLeft,
        tutorialStep:         state.tutorialStep,
        tutorialDone:         state.tutorialDone,
        unlockedAchievements: state.unlockedAchievements,
        collectedItemIds:     state.collectedItemIds,
        runRested:            state.runRested,
        runGoldEarned:        state.runGoldEarned,
        runInfoOpens:         state.runInfoOpens,
        runManaPotionsUsed:   state.runManaPotionsUsed,
      }),
    }
  )
);
