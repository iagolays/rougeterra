/**
 * regions.js
 * Defines the 6 regions of Runeterra, their enemies, and difficulty scaling.
 *
 * Difficulty algorithm:
 *   Each region has a BASE_POWER and SCALING_FACTOR.
 *   Enemy stats = BASE * (1 + SCALING_FACTOR * combatIndex)
 *   combatIndex resets to 0 when entering a new region.
 *   Boss fights appear every BOSS_EVERY combats.
 */

export const REGIONS = [
  {
    id: "demacia",
    name: "Demacia",
    emoji: "🛡️",
    description: "The golden plains of justice and honor",
    lore: "A mighty kingdom whose devotion to justice is only rivaled by its disdain for magic.",
    cssClass: "r-demacia",
    colorHex: "#1E4080",
    combatsPerRegion: 4,
    bossEvery: 4,
    difficulty: {
      basePower: 1.0,
      scalingPerCombat: 0.18,
      eliteThreshold: 0.6,    // 60% chance to be elite after combat 2
    },
    enemies: [
      {
        id: "demacia_wolf",
        name: "Forest Wolf",
        emoji: "🐺",
        type: "monster",
        baseStats: { hp: 140, ad: 20, armor: 8, mr: 5 },
        goldRange: [15, 28],
        potionDropChance: 0.15,
        abilities: [
          { name: "Bite", description: "A savage bite", damageMult: 1.0, cooldown: 0 },
        ],
      },
      {
        id: "demacia_guard",
        name: "Demacian Guard",
        emoji: "⚔️",
        type: "champion",
        baseStats: { hp: 180, ad: 26, armor: 18, mr: 12 },
        goldRange: [22, 38],
        potionDropChance: 0.2,
        abilities: [
          { name: "Shield Bash",  description: "Slams with shield", damageMult: 1.3, cooldown: 3 },
          { name: "Parry",        description: "Reduces next hit by 30%", damageMult: 0, effect: "reduce", cooldown: 4 },
        ],
      },
      {
        id: "demacia_knight",
        name: "Demacian Knight",
        emoji: "🏇",
        type: "champion",
        baseStats: { hp: 260, ad: 34, armor: 26, mr: 16 },
        goldRange: [35, 55],
        potionDropChance: 0.25,
        abilities: [
          { name: "Cavalry Charge", description: "Charges dealing heavy damage", damageMult: 1.6, cooldown: 3 },
          { name: "Judgment",       description: "Spins sword dealing AoE",       damageMult: 1.4, cooldown: 4 },
        ],
      },
      {
        id: "demacia_mageseeker",
        name: "Mageseeker Captain",
        emoji: "🔱",
        type: "champion",
        isBoss: true,
        baseStats: { hp: 420, ad: 42, armor: 32, mr: 22 },
        goldRange: [70, 100],
        potionDropChance: 0.5,
        abilities: [
          { name: "Magic Suppression", description: "Silences for 2 turns",    damageMult: 1.2, effect: "silence", effectDur: 2, cooldown: 4 },
          { name: "Spear Thrust",      description: "Heavy piercing damage",   damageMult: 2.0, cooldown: 5 },
        ],
      },
    ],
  },

  {
    id: "noxus",
    name: "Noxus",
    emoji: "🗡️",
    description: "The ruthless empire that conquers through strength",
    lore: "In Noxus, strength is the only currency that matters. The weak exist to serve.",
    cssClass: "r-noxus",
    colorHex: "#8B1A1A",
    combatsPerRegion: 4,
    bossEvery: 4,
    difficulty: {
      basePower: 1.4,
      scalingPerCombat: 0.22,
      eliteThreshold: 0.5,
    },
    enemies: [
      {
        id: "noxus_raider",
        name: "Noxian Raider",
        emoji: "🗡️",
        type: "champion",
        baseStats: { hp: 220, ad: 38, armor: 14, mr: 10 },
        goldRange: [28, 45],
        potionDropChance: 0.18,
        abilities: [
          { name: "Noxian Fervor", description: "Attacks with ferocity, ignores armor", damageMult: 1.4, armorPen: 0.2, cooldown: 3 },
        ],
      },
      {
        id: "noxus_executioner",
        name: "Noxian Executioner",
        emoji: "⚔️",
        type: "champion",
        baseStats: { hp: 300, ad: 50, armor: 20, mr: 12 },
        goldRange: [40, 65],
        potionDropChance: 0.22,
        abilities: [
          { name: "Decimate",      description: "Devastating axe swing",            damageMult: 1.8, cooldown: 3 },
          { name: "Hemorrhage",    description: "Applies bleeding for 3 turns",     damageMult: 0.8, effect: "bleed", effectVal: 25, effectDur: 3, cooldown: 4 },
        ],
      },
      {
        id: "noxus_conquerer",
        name: "Noxian Conqueror",
        emoji: "🧱",
        type: "champion",
        baseStats: { hp: 380, ad: 58, armor: 28, mr: 18 },
        goldRange: [55, 80],
        potionDropChance: 0.3,
        abilities: [
          { name: "Guillotine", description: "Execute: x3 damage below 20% HP", damageMult: 3.0, effect: "execute", cooldown: 5 },
          { name: "Blood Rage", description: "Empowers next attack",            damageMult: 1.5, cooldown: 3 },
        ],
      },
      {
        id: "noxus_general",
        name: "Noxian General",
        emoji: "👑",
        type: "champion",
        isBoss: true,
        baseStats: { hp: 600, ad: 70, armor: 36, mr: 28 },
        goldRange: [100, 140],
        potionDropChance: 0.6,
        abilities: [
          { name: "War Cry",       description: "Increases own AD by 30% for 2 turns", damageMult: 0, effect: "selfBuffAD", buffVal: 0.3, effectDur: 2, cooldown: 5 },
          { name: "Onslaught",     description: "Triple strike",                        damageMult: 0.8, hits: 3, cooldown: 4 },
          { name: "Iron Bastion",  description: "Gains 20 armor for 2 turns",           damageMult: 0, effect: "selfBuffArmor", buffVal: 20, effectDur: 2, cooldown: 5 },
        ],
      },
    ],
  },

  {
    id: "freljord",
    name: "Freljord",
    emoji: "❄️",
    description: "The frozen north, where only the strongest survive",
    lore: "A harsh, unforgiving land locked in an endless winter. Ancient gods sleep beneath the ice.",
    cssClass: "r-freljord",
    colorHex: "#1A4A6B",
    combatsPerRegion: 4,
    bossEvery: 4,
    difficulty: {
      basePower: 1.8,
      scalingPerCombat: 0.25,
      eliteThreshold: 0.45,
    },
    enemies: [
      {
        id: "freljord_bear",
        name: "Ice Bear",
        emoji: "🐻‍❄️",
        type: "monster",
        baseStats: { hp: 380, ad: 52, armor: 24, mr: 12 },
        goldRange: [45, 70],
        potionDropChance: 0.2,
        abilities: [
          { name: "Maul",      description: "Heavy claw strike",        damageMult: 1.5, cooldown: 3 },
          { name: "Ice Roar",  description: "Slows for 2 turns",        damageMult: 0.6, effect: "slow", effectDur: 2, cooldown: 4 },
        ],
      },
      {
        id: "freljord_shaman",
        name: "Freljord Shaman",
        emoji: "🧊",
        type: "champion",
        baseStats: { hp: 320, ad: 44, armor: 18, mr: 35 },
        goldRange: [55, 80],
        potionDropChance: 0.25,
        abilities: [
          { name: "Frozen Tomb",  description: "Stuns for 2 turns",                  damageMult: 0.7, effect: "stun", effectDur: 2, cooldown: 5 },
          { name: "Blizzard",     description: "Ice storm dealing magic damage",      damageMult: 1.6, isMagic: true, cooldown: 4 },
        ],
      },
      {
        id: "freljord_barbarian",
        name: "Barbarian King",
        emoji: "🪓",
        type: "champion",
        baseStats: { hp: 460, ad: 65, armor: 28, mr: 16 },
        goldRange: [70, 100],
        potionDropChance: 0.3,
        abilities: [
          { name: "Undying Rage",    description: "Cannot die for 1 turn",          damageMult: 0, effect: "undying", effectDur: 1, cooldown: 6 },
          { name: "Spinning Slash",  description: "Spinning attack ignoring armor",  damageMult: 1.9, armorPen: 0.3, cooldown: 4 },
        ],
      },
      {
        id: "freljord_anivia",
        name: "Ice Phoenix",
        emoji: "🦅",
        type: "champion",
        isBoss: true,
        baseStats: { hp: 750, ad: 55, armor: 22, mr: 50 },
        goldRange: [130, 180],
        potionDropChance: 0.65,
        abilities: [
          { name: "Rebirth",       description: "Revives at 25% HP once per battle", damageMult: 0, effect: "revive", cooldown: 0, usedOnce: true },
          { name: "Flash Frost",   description: "Ice shard that stuns",              damageMult: 1.4, isMagic: true, effect: "stun", effectDur: 1, cooldown: 4 },
          { name: "Glacial Storm", description: "Persistent blizzard dealing DPS",   damageMult: 1.2, isMagic: true, effect: "bleed", effectVal: 30, effectDur: 3, cooldown: 5 },
        ],
      },
    ],
  },

  {
    id: "piltover",
    name: "Piltover",
    emoji: "⚙️",
    description: "The City of Progress — where hextech meets ambition",
    lore: "Gleaming towers hide a vast undercity. Hextech crystals power both wonders and weapons.",
    cssClass: "r-piltover",
    colorHex: "#7A5C00",
    combatsPerRegion: 4,
    bossEvery: 4,
    difficulty: {
      basePower: 2.3,
      scalingPerCombat: 0.28,
      eliteThreshold: 0.4,
    },
    enemies: [
      {
        id: "piltover_enforcer",
        name: "Piltover Enforcer",
        emoji: "👮",
        type: "champion",
        baseStats: { hp: 420, ad: 62, armor: 32, mr: 22 },
        goldRange: [65, 95],
        potionDropChance: 0.22,
        abilities: [
          { name: "Hextech Net",   description: "Roots for 2 turns",            damageMult: 0.5, effect: "root", effectDur: 2, cooldown: 4 },
          { name: "Piltover Hex",  description: "Hextech energy burst",         damageMult: 1.5, isMagic: true, cooldown: 3 },
        ],
      },
      {
        id: "piltover_mech",
        name: "Hextech Golem",
        emoji: "🤖",
        type: "monster",
        baseStats: { hp: 550, ad: 58, armor: 48, mr: 40 },
        goldRange: [80, 115],
        potionDropChance: 0.2,
        abilities: [
          { name: "Steam Punch",   description: "Heavy mechanical strike",       damageMult: 1.7, armorPen: 0.15, cooldown: 3 },
          { name: "Overheat",      description: "Burns for 3 turns after attack", damageMult: 1.0, effect: "bleed", effectVal: 40, effectDur: 3, cooldown: 5 },
        ],
      },
      {
        id: "piltover_saboteur",
        name: "Zaun Saboteur",
        emoji: "💣",
        type: "champion",
        baseStats: { hp: 380, ad: 72, armor: 20, mr: 28 },
        goldRange: [85, 120],
        potionDropChance: 0.28,
        abilities: [
          { name: "Chomper Trap",  description: "Deals damage and roots",              damageMult: 1.2, effect: "root", effectDur: 1, cooldown: 4 },
          { name: "Rocket Barrage", description: "5 rockets each dealing damage",      damageMult: 0.6, hits: 5, cooldown: 5 },
        ],
      },
      {
        id: "piltover_jaeger",
        name: "Jaeger Prime",
        emoji: "🦾",
        type: "monster",
        isBoss: true,
        baseStats: { hp: 950, ad: 88, armor: 55, mr: 45 },
        goldRange: [170, 230],
        potionDropChance: 0.7,
        abilities: [
          { name: "Overclock",     description: "Doubles attack speed for 2 turns",  damageMult: 0, effect: "selfBuffAS", buffVal: 2.0, effectDur: 2, cooldown: 6 },
          { name: "Hextech Blast", description: "Massive energy explosion",           damageMult: 2.5, isMagic: true, cooldown: 5 },
          { name: "Iron Plating",  description: "Gains 30 armor for 3 turns",         damageMult: 0, effect: "selfBuffArmor", buffVal: 30, effectDur: 3, cooldown: 5 },
        ],
      },
    ],
  },

  {
    id: "shadow_isles",
    name: "Shadow Isles",
    emoji: "💀",
    description: "Where the dead do not rest",
    lore: "The Black Mist flows from these cursed islands, binding souls to eternal torment.",
    cssClass: "r-shadow",
    colorHex: "#2D1B4E",
    combatsPerRegion: 4,
    bossEvery: 4,
    difficulty: {
      basePower: 2.8,
      scalingPerCombat: 0.3,
      eliteThreshold: 0.35,
    },
    enemies: [
      {
        id: "shadow_specter",
        name: "Shadow Specter",
        emoji: "👻",
        type: "monster",
        baseStats: { hp: 480, ad: 72, armor: 18, mr: 55 },
        goldRange: [85, 125],
        potionDropChance: 0.25,
        abilities: [
          { name: "Haunt",        description: "Applies fear — skips your next ability", damageMult: 0.8, effect: "silence", effectDur: 1, cooldown: 4 },
          { name: "Soul Drain",   description: "Heals the specter for 15% of damage dealt", damageMult: 1.5, effect: "lifesteal", lsVal: 0.15, cooldown: 3 },
        ],
      },
      {
        id: "shadow_revenant",
        name: "Death Knight",
        emoji: "💀",
        type: "champion",
        baseStats: { hp: 620, ad: 85, armor: 45, mr: 38 },
        goldRange: [110, 155],
        potionDropChance: 0.3,
        abilities: [
          { name: "Death Sentence", description: "Chains and stuns for 2 turns",      damageMult: 1.1, effect: "stun", effectDur: 2, cooldown: 5 },
          { name: "Soul Rend",      description: "Reduces your max HP by 5%",          damageMult: 1.4, effect: "maxHpReduce", reduceVal: 0.05, cooldown: 4 },
        ],
      },
      {
        id: "shadow_wraith",
        name: "Ruination Wraith",
        emoji: "🌫️",
        type: "monster",
        baseStats: { hp: 700, ad: 90, armor: 25, mr: 65 },
        goldRange: [130, 175],
        potionDropChance: 0.32,
        abilities: [
          { name: "Black Mist",   description: "Drains 60 HP per turn for 3 turns",   damageMult: 0.5, effect: "bleed", effectVal: 60, effectDur: 3, cooldown: 5 },
          { name: "Phase Walk",   description: "Evades next attack, then counters",    damageMult: 1.8, effect: "evade", effectDur: 1, cooldown: 4 },
        ],
      },
      {
        id: "shadow_lord",
        name: "Lord of the Isles",
        emoji: "☠️",
        type: "champion",
        isBoss: true,
        baseStats: { hp: 1200, ad: 105, armor: 58, mr: 60 },
        goldRange: [230, 300],
        potionDropChance: 0.8,
        abilities: [
          { name: "Ruination",      description: "Applies Black Mist: 80 DPS for 4 turns", damageMult: 0.8, effect: "bleed", effectVal: 80, effectDur: 4, cooldown: 5 },
          { name: "Undying Will",   description: "Revives at 30% HP once",                  damageMult: 0, effect: "revive", reviveHpPct: 0.3, cooldown: 0, usedOnce: true },
          { name: "Soul Harvest",   description: "Deals % of missing HP as damage",         damageMult: 0, effect: "missingHpDmg", missingPct: 0.15, cooldown: 4 },
        ],
      },
    ],
  },

  {
    id: "void",
    name: "The Void",
    emoji: "🌌",
    description: "A dimension of pure hunger and destruction",
    lore: "The Void is not a place. It is an absence — consuming everything it touches.",
    cssClass: "r-void",
    colorHex: "#1A003A",
    combatsPerRegion: 5,
    bossEvery: 5,
    difficulty: {
      basePower: 3.5,
      scalingPerCombat: 0.35,
      eliteThreshold: 0.3,
    },
    enemies: [
      {
        id: "void_crawler",
        name: "Void Crawler",
        emoji: "🕷️",
        type: "monster",
        baseStats: { hp: 580, ad: 95, armor: 28, mr: 45 },
        goldRange: [115, 165],
        potionDropChance: 0.28,
        abilities: [
          { name: "Corrosive Spit",  description: "Reduces armor by 10 for 3 turns", damageMult: 0.9, effect: "debuffArmor", debuffVal: 10, effectDur: 3, cooldown: 4 },
          { name: "Void Frenzy",     description: "Attacks 3 times rapidly",          damageMult: 0.7, hits: 3, cooldown: 4 },
        ],
      },
      {
        id: "void_rift",
        name: "Void Rift Herald",
        emoji: "👾",
        type: "monster",
        baseStats: { hp: 750, ad: 108, armor: 40, mr: 55 },
        goldRange: [145, 200],
        potionDropChance: 0.32,
        abilities: [
          { name: "Rift Smash",   description: "Devastating pound ignoring armor",   damageMult: 2.0, armorPen: 0.4, cooldown: 4 },
          { name: "Corruption",   description: "Poisons for 80 DPS over 4 turns",   damageMult: 0.5, effect: "bleed", effectVal: 80, effectDur: 4, cooldown: 5 },
        ],
      },
      {
        id: "void_xer",
        name: "Xer'Sai Brood Mother",
        emoji: "🦂",
        type: "monster",
        baseStats: { hp: 900, ad: 120, armor: 50, mr: 50 },
        goldRange: [175, 240],
        potionDropChance: 0.38,
        abilities: [
          { name: "Burrow",          description: "Evades all damage for 1 turn",         damageMult: 0, effect: "evade", effectDur: 1, cooldown: 5 },
          { name: "Terrifying Roar", description: "Silences and reduces AD by 20%",        damageMult: 0.8, effect: "silence", effectDur: 2, cooldown: 4 },
          { name: "Ferocious Bite",  description: "Massive true damage (ignores all defenses)", damageMult: 2.2, isTrue: true, cooldown: 5 },
        ],
      },
      {
        id: "void_watcher",
        name: "The Watcher",
        emoji: "🌌",
        type: "monster",
        isBoss: true,
        baseStats: { hp: 2000, ad: 140, armor: 70, mr: 75 },
        goldRange: [350, 500],
        potionDropChance: 1.0,
        abilities: [
          { name: "Consume",        description: "Deals 20% of your MAX HP as damage",   damageMult: 0, effect: "maxHpDmg", pct: 0.2, cooldown: 5 },
          { name: "Void Collapse",  description: "Reduces all your stats by 15%",        damageMult: 1.5, effect: "statReduce", pct: 0.15, cooldown: 6 },
          { name: "Eternal Hunger", description: "Heals 10% max HP per turn",            damageMult: 0, effect: "selfHeal", pct: 0.1, cooldown: 3, passive: true },
          { name: "Eye of the Void", description: "Stuns for 3 turns",                   damageMult: 1.0, effect: "stun", effectDur: 3, cooldown: 7 },
        ],
      },
    ],
  },
];

/**
 * getDifficultyScaledEnemy(regionId, combatIndex)
 * Returns an enemy from the region pool with stats scaled to combat difficulty.
 *
 * Algorithm:
 *  - combatIndex 0..combatsPerRegion-1
 *  - Every Nth combat (bossEvery) → pick the boss from the pool
 *  - Otherwise pick a non-boss enemy; elite chance increases with combatIndex
 *  - Scale: stat * basePower * (1 + scalingPerCombat * combatIndex)
 */
export function getDifficultyScaledEnemy(regionId, combatIndex) {
  const region = REGIONS.find(r => r.id === regionId);
  if (!region) return null;

  const { basePower, scalingPerCombat, eliteThreshold } = region.difficulty;
  const isBossFight = (combatIndex + 1) % region.bossEvery === 0;

  // Select enemy template
  let template;
  if (isBossFight) {
    template = region.enemies.find(e => e.isBoss) || region.enemies[region.enemies.length - 1];
  } else {
    const nonBoss = region.enemies.filter(e => !e.isBoss);
    const isElite = combatIndex >= 1 && Math.random() < eliteThreshold;
    if (isElite && nonBoss.length > 1) {
      // Pick from the stronger half
      const stronger = nonBoss.slice(Math.floor(nonBoss.length / 2));
      template = stronger[Math.floor(Math.random() * stronger.length)];
    } else {
      template = nonBoss[Math.floor(Math.random() * nonBoss.length)];
    }
  }

  // Scale factor
  const scaleFactor = basePower * (1 + scalingPerCombat * combatIndex);

  return {
    ...template,
    isBoss: isBossFight,
    scaledStats: {
      hp:    Math.round(template.baseStats.hp    * scaleFactor),
      ad:    Math.round(template.baseStats.ad    * scaleFactor),
      armor: Math.round(template.baseStats.armor * scaleFactor * 0.7), // armor scales slower
      mr:    Math.round(template.baseStats.mr    * scaleFactor * 0.7),
    },
    // Runtime state (mutable, not from template)
    currentHp: Math.round(template.baseStats.hp * scaleFactor),
    effects: [],
    abilityCooldowns: {},
    skillTurnCounter: 0,
    hasRevived: false,
    goldReward: Math.floor(
      Math.random() * (template.goldRange[1] - template.goldRange[0]) + template.goldRange[0]
    ) * scaleFactor,
  };
}
