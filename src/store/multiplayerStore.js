/**
 * multiplayerStore.js — Gestión de lobbies, matchmaking y sincronización en tiempo real.
 * Arquitectura Host/Guest: el Host ejecuta la lógica de combate y escribe en Firestore.
 */
import { create } from "zustand";
import {
  doc, getDoc, setDoc, updateDoc, onSnapshot,
  collection, query, where, getDocs, deleteDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuthStore } from "./authStore";
import { useGameStore } from "./gameStore";
import { applyPlayerAbility, resolveEnemyTurn, initCombat } from "../game/combat";
import { REGIONS, getDifficultyScaledEnemy } from "../data/regions";

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// Deterministic lobby code from the two paired UIDs — both clients compute the
// same code without writing to each other's docs (which security rules forbid).
function pairCode(a, b) {
  const s = `${a}_${b}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return ("MM" + h.toString(36).toUpperCase()).slice(0, 6).padEnd(6, "0");
}

function playerSyncState(player) {
  if (!player) return { hp: 100, maxHp: 100, mp: 0, maxMp: 0, itemStats: {}, armor: 0, mr: 0, ad: 20, ap: 0, effects: [], inventory: [] };
  return {
    hp: player.hp,
    maxHp: player.maxHp,
    mp: player.mp || 0,
    maxMp: player.maxMp || 0,
    itemStats: player.itemStats || {},
    armor: player.armor || 0,
    mr: player.mr || 0,
    ad: player.ad || 20,
    ap: player.ap || 0,
    effects: [],
    resource: player.resource,
    champion: {
      name: player.champion?.name,
      emoji: player.champion?.emoji,
      iconUrl: player.champion?.iconUrl || null,
      abilityImages: player.champion?.abilityImages || {},
      abilities: player.champion?.abilities || [],
      resource: player.resource,
    },
    inventory: player.inventory || [],
  };
}

function buildLobbyData(mode, hostUser, hostUid, guestUid, guestData) {
  return {
    mode,
    status: "waiting",
    host: hostUid,
    createdAt: serverTimestamp(),
    players: {
      [hostUid]: { displayName: hostUser.displayName, photoURL: hostUser.photoURL || null, champion: null, playerSync: null },
      [guestUid]: { displayName: guestData.displayName, photoURL: guestData.photoURL || null, champion: null, playerSync: null },
    },
    coopGold: 200,
    coopRegionIdx: 0,
    coopCombatIndex: 0,
    coopCombat: { status: "idle", readyToFight: {}, activePlayerUid: hostUid, firstAttackerUid: hostUid, playerStates: {}, enemies: [], combatCtx: null, combatLogTail: [], pendingAction: null },
    vsScores: { [hostUid]: 0, [guestUid]: 0 },
    vsState: {},
    vsPvpCombat: { status: "idle", turnUid: hostUid, pvpRound: 0, playerStates: {}, logTail: [], pendingAction: null },
  };
}

// ─── Module-level subscriptions ─────────────────────────────────────────────
let unsubLobby = null;
let unsubMatchmaking = null;

// ─── Store ──────────────────────────────────────────────────────────────────
export const useMultiplayerStore = create((set, get) => ({
  lobbyCode: null,
  lobby: null,
  isHost: false,
  matchmakingStatus: "idle",
  error: null,
  vsConsecutiveWins: 0,
  lastOutcomeRound: 0,

  // ── Lobby creation ──────────────────────────────────────────────────────

  createLobby: async (mode) => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    let code = generateCode();
    let snap = await getDoc(doc(db, "lobbies", code));
    while (snap.exists()) { code = generateCode(); snap = await getDoc(doc(db, "lobbies", code)); }

    const lobbyData = buildLobbyData(mode, user, user.uid, "__placeholder__", { displayName: "", photoURL: null });
    // Remove the placeholder
    delete lobbyData.players["__placeholder__"];
    delete lobbyData.vsScores["__placeholder__"];

    await setDoc(doc(db, "lobbies", code), lobbyData);
    set({ lobbyCode: code, isHost: true, error: null });
    get()._subscribeLobby(code);
    useGameStore.getState().setGameMode(mode);
    useGameStore.getState()._setState({ screen: "lobby" });
  },

  joinByCode: async (code) => {
    const { user } = useAuthStore.getState();
    if (!user) return;
    set({ error: null });
    const upper = code.trim().toUpperCase();
    const snap = await getDoc(doc(db, "lobbies", upper));
    if (!snap.exists()) { set({ error: "Código no encontrado." }); return; }
    const data = snap.data();
    if (data.status !== "waiting") { set({ error: "Esta sala ya no está disponible." }); return; }
    if (Object.keys(data.players || {}).length >= 2) { set({ error: "La sala está llena." }); return; }

    await updateDoc(doc(db, "lobbies", upper), {
      [`players.${user.uid}`]: { displayName: user.displayName, photoURL: user.photoURL || null, champion: null, playerSync: null },
      [`vsScores.${user.uid}`]: 0,
    });

    set({ lobbyCode: upper, isHost: false, error: null });
    get()._subscribeLobby(upper);
    useGameStore.getState().setGameMode(data.mode);
    useGameStore.getState()._setState({ screen: "lobby" });
  },

  // ── Matchmaking (sin runTransaction — usa onSnapshot + UID determinista) ──

  joinMatchmaking: async (mode) => {
    const { user } = useAuthStore.getState();
    if (!user) return;
    set({ matchmakingStatus: "searching", error: null });

    const myRef = doc(db, "matchmaking", user.uid);
    await setDoc(myRef, {
      mode,
      displayName: user.displayName,
      photoURL: user.photoURL || null,
      timestamp: Date.now(),
    });

    let handled = false; // ensure we only pair once

    // Watch the matchmaking queue for this mode. Each client only ever writes
    // its OWN matchmaking doc + its own lobby (security-rule safe). Pairing is
    // deterministic: sort searching UIDs, the two lowest form a pair, the lower
    // one is the host. Both clients derive the same lobby code via pairCode().
    if (unsubMatchmaking) unsubMatchmaking();
    unsubMatchmaking = onSnapshot(
      query(collection(db, "matchmaking"), where("mode", "==", mode)),
      async (snap) => {
        if (handled) return;
        const ids = snap.docs.map(d => d.id).sort();
        if (ids.length < 2) return;

        const [a, b] = ids; // two lowest UIDs form the pair
        if (user.uid !== a && user.uid !== b) return; // not in this pair — keep waiting

        handled = true;
        unsubMatchmaking?.();
        unsubMatchmaking = null;

        const code = pairCode(a, b);
        const iAmHost = user.uid === a;
        const otherUid = iAmHost ? b : a;
        const otherData = snap.docs.find(d => d.id === otherUid)?.data() || {};

        if (iAmHost) {
          const existing = await getDoc(doc(db, "lobbies", code));
          if (!existing.exists()) {
            const lobbyData = buildLobbyData(mode, user, user.uid, otherUid, otherData);
            await setDoc(doc(db, "lobbies", code), lobbyData);
          }
        }
        // Both subscribe — onSnapshot fires when the host creates the doc.
        set({ lobbyCode: code, isHost: iAmHost, matchmakingStatus: "found" });
        get()._subscribeLobby(code);
        useGameStore.getState().setGameMode(mode);
        useGameStore.getState()._setState({ screen: "lobby" });
        try { await deleteDoc(myRef); } catch {}
      }
    );
  },

  cancelMatchmaking: async () => {
    const { user } = useAuthStore.getState();
    if (unsubMatchmaking) { unsubMatchmaking(); unsubMatchmaking = null; }
    if (user) try { await deleteDoc(doc(db, "matchmaking", user.uid)); } catch {}
    set({ matchmakingStatus: "idle" });
  },

  // ── Lobby subscription ──────────────────────────────────────────────────

  _subscribeLobby: (code) => {
    if (unsubLobby) unsubLobby();
    unsubLobby = onSnapshot(doc(db, "lobbies", code), (snap) => {
      if (!snap.exists()) { set({ lobby: null, lobbyCode: null }); return; }
      const lobby = { id: snap.id, ...snap.data() };
      set({ lobby });

      const { user } = useAuthStore.getState();
      if (!user) return;
      const { isHost } = get();
      const myUid = user.uid;
      const gameScreen = useGameStore.getState().screen;

      // Lobby is the source of truth for game mode — keep gameStore in sync so
      // the bank stays locked and VS boss positions trigger PvP (not CPU).
      if (lobby.mode && useGameStore.getState().gameMode !== lobby.mode) {
        useGameStore.getState().setGameMode(lobby.mode);
      }

      // ── Host: cuenta atrás cuando llegan 2 jugadores ──
      if (isHost && lobby.status === "waiting" && Object.keys(lobby.players || {}).length === 2 && !lobby.countdownStartedAt) {
        updateDoc(doc(db, "lobbies", code), { status: "countdown", countdownStartedAt: Date.now() });
      }

      // ── Transición lobby → mapa cuando ambos eligen campeón ──
      if (lobby.status === "playing" && gameScreen === "lobby") {
        useGameStore.getState()._setState({ screen: "map" });
      }

      // ── COOP: mantener a ambos en la pantalla de combate ──
      if (lobby.mode === "coop" && lobby.coopCombat) {
        const playerUids = Object.keys(lobby.players || {});
        const partnerUid = playerUids.find(u => u !== myUid);
        const partnerReady = partnerUid && lobby.coopCombat.readyToFight?.[partnerUid];
        const ccStatus = lobby.coopCombat.status;

        // Si el compañero pulsó "Luchar" o el combate ya está activo, únete a la
        // pantalla de combate (desde el mapa, tienda, recompensa, etc.).
        const shouldJoinCombat = (partnerReady || ccStatus === "active");
        if (shouldJoinCombat && gameScreen !== "coopcombat" && (gameScreen === "map" || gameScreen === "shop" || gameScreen === "reward")) {
          useGameStore.getState()._setState({ screen: "coopcombat" });
        }

        // Host: cuando ambos están listos, inicia el combate
        const allReady = playerUids.length === 2 && playerUids.every(uid => lobby.coopCombat.readyToFight?.[uid]);
        if (isHost && allReady && ccStatus === "idle") {
          get()._initCoopCombat(lobby);
        }

        // Ambos: al terminar el combate, ir a recompensa/gameover (una sola vez).
        const oc = lobby.coopCombat;
        if (oc.outcomeRound && oc.outcomeRound !== get().lastOutcomeRound) {
          set({ lastOutcomeRound: oc.outcomeRound });
          if (oc.lastOutcome === "victory") useGameStore.getState()._setState({ screen: "reward" });
          else if (oc.lastOutcome === "defeat") useGameStore.getState()._setState({ screen: "gameover" });
        }
      }

      // ── Host: procesa acción pendiente del guest en coop ──
      if (isHost && lobby.coopCombat?.pendingAction && lobby.coopCombat.pendingAction.uid !== myUid) {
        get()._processCoopAction(lobby.coopCombat.pendingAction, lobby);
      }

      // ── VS: cuando ambos están listos para PvP, el host inicia ──
      if (lobby.mode === "vs" && lobby.vsState) {
        const playerUids = Object.keys(lobby.players || {});
        const allReadyPvP = playerUids.length === 2 && playerUids.every(uid => lobby.vsState?.[uid]?.readyForPvP);
        if (isHost && allReadyPvP && lobby.vsPvpCombat?.status === "idle") {
          get()._initVsPvp(lobby);
        }
      }

      // ── Host: procesa acción pendiente del guest en PvP ──
      if (isHost && lobby.vsPvpCombat?.pendingAction && lobby.vsPvpCombat.pendingAction.uid !== myUid) {
        get()._processVsPvpAction(lobby.vsPvpCombat.pendingAction, lobby);
      }
    });
  },

  leaveLobby: async () => {
    const { lobbyCode, isHost } = get();
    const { user } = useAuthStore.getState();
    if (unsubLobby) { unsubLobby(); unsubLobby = null; }
    if (unsubMatchmaking) { unsubMatchmaking(); unsubMatchmaking = null; }
    if (lobbyCode && user) {
      try {
        if (isHost) await updateDoc(doc(db, "lobbies", lobbyCode), { status: "finished" });
        else {
          const snap = await getDoc(doc(db, "lobbies", lobbyCode));
          if (snap.exists()) {
            const updated = { ...snap.data().players };
            delete updated[user.uid];
            await updateDoc(doc(db, "lobbies", lobbyCode), { players: updated });
          }
        }
      } catch {}
    }
    set({ lobbyCode: null, lobby: null, isHost: false, matchmakingStatus: "idle" });
    useGameStore.getState().setGameMode("normal");
    useGameStore.getState()._setState({ screen: "home" });
  },

  // ── Champion selection ──────────────────────────────────────────────────

  selectChampionMultiplayer: async (champion) => {
    const { lobbyCode, lobby, isHost } = get();
    const { user } = useAuthStore.getState();
    if (!lobbyCode || !user) return;

    useGameStore.getState().selectChampion(champion);
    // selectChampion navigates to "map" — override to stay in lobby flow
    useGameStore.getState()._setState({ screen: "lobby" });

    const localPlayer = useGameStore.getState().player;
    const sync = playerSyncState(localPlayer);

    await updateDoc(doc(db, "lobbies", lobbyCode), {
      [`players.${user.uid}.champion`]: { id: champion.id, name: champion.name, emoji: champion.emoji, iconUrl: champion.iconUrl || null },
      [`players.${user.uid}.playerSync`]: sync,
    });

    // Si ambos eligieron, host pone status "playing"
    const uids = Object.keys(lobby?.players || {});
    const allChose = uids.length === 2 && uids.every(uid => uid === user.uid || lobby.players[uid]?.champion !== null);
    if (allChose && isHost) {
      await updateDoc(doc(db, "lobbies", lobbyCode), { status: "playing" });
    }
  },

  // ── Coop: señalizar listo para combatir ────────────────────────────────

  signalReadyToFight: async () => {
    const { lobbyCode } = get();
    const { user } = useAuthStore.getState();
    if (!lobbyCode || !user) return;

    // Actualizar playerSync con stats actuales antes de combatir
    const localPlayer = useGameStore.getState().player;
    await updateDoc(doc(db, "lobbies", lobbyCode), {
      [`coopCombat.readyToFight.${user.uid}`]: true,
      [`players.${user.uid}.playerSync`]: playerSyncState(localPlayer),
    });
    // El listener _subscribeLobby detecta cuando ambos están listos y el host inicia el combate
  },

  _initCoopCombat: async (lobby) => {
    const { lobbyCode } = get();
    const regionIdx = lobby.coopRegionIdx || 0;
    const combatIndex = lobby.coopCombatIndex || 0;
    const region = REGIONS[regionIdx];

    const isBoss = (combatIndex + 1) % region.bossEvery === 0;
    const count = isBoss ? 1 : (combatIndex % 2 === 1 ? 2 : 1);
    const enemies = [];
    for (let i = 0; i < count; i++) enemies.push(getDifficultyScaledEnemy(region.id, combatIndex));

    const uids = Object.keys(lobby.players);
    const firstAttacker = combatIndex % 2 === 0 ? uids[0] : uids[1];

    const localPlayer = useGameStore.getState().player;
    const { combat: initCtx } = initCombat(localPlayer, enemies[0]);

    const playerStates = {};
    for (const [uid, pData] of Object.entries(lobby.players)) {
      playerStates[uid] = pData.playerSync || playerSyncState(null);
    }

    await updateDoc(doc(db, "lobbies", lobbyCode), {
      coopCombat: {
        status: "active",
        readyToFight: {},
        activePlayerUid: firstAttacker,
        firstAttackerUid: firstAttacker,
        playerStates,
        enemies: enemies.map(e => ({ ...e, effects: [] })),
        combatCtx: initCtx,
        combatLogTail: [{ type: "system", text: `⚔️ ¡Combate! ${isBoss ? "👑 **BOSS**" : ""}` }],
        pendingAction: null,
      },
    });
  },

  // ── Coop: acción del jugador ────────────────────────────────────────────

  submitCoopAction: async (type, abilityKey = null) => {
    const { lobbyCode, lobby, isHost } = get();
    const { user } = useAuthStore.getState();
    if (!lobbyCode || !user) return;
    const action = { uid: user.uid, type, abilityKey, timestamp: Date.now() };
    if (isHost) {
      await get()._processCoopAction(action, lobby);
    } else {
      await updateDoc(doc(db, "lobbies", lobbyCode), { "coopCombat.pendingAction": action });
    }
  },

  _processCoopAction: async (action, lobby) => {
    const { lobbyCode } = get();
    const { user } = useAuthStore.getState();
    const cc = lobby.coopCombat;
    if (!cc || cc.status !== "active") return;

    const actingUid = action.uid;
    const uids = Object.keys(lobby.players);
    const otherUid = uids.find(u => u !== actingUid);
    const actingPState = cc.playerStates[actingUid] || {};
    const gamePlayer = useGameStore.getState().player;

    let playerForEngine = actingUid === user.uid
      ? gamePlayer
      : { ...gamePlayer, hp: actingPState.hp, maxHp: actingPState.maxHp, mp: actingPState.mp || 0, maxMp: actingPState.maxMp || 0, armor: actingPState.armor || 0, mr: actingPState.mr || 0, ad: actingPState.ad || 20, ap: actingPState.ap || 0, itemStats: actingPState.itemStats || {} };

    const ability = gamePlayer?.champion?.abilities?.find(a => a.key === action.abilityKey);
    let combatCtx = { ...cc.combatCtx };
    let enemies = [...(cc.enemies || [])];
    let logEntries = [];

    if (action.type === "ability" && ability) {
      const result = applyPlayerAbility(ability, playerForEngine, combatCtx, enemies[0]);
      playerForEngine = result.player;
      combatCtx = result.combat;
      enemies = [result.enemy, ...enemies.slice(1)];
      logEntries = result.log;
    } else if (action.type === "pass") {
      logEntries = [{ type: "system", text: `⏭️ ${actingPState.champion?.name || "Jugador"} pasa turno.` }];
    }

    const allDead = enemies.every(e => e.currentHp <= 0);
    let newPlayerStates = {
      ...cc.playerStates,
      [actingUid]: { ...cc.playerStates[actingUid], hp: playerForEngine.hp, mp: playerForEngine.mp || 0 },
    };

    let victory = allDead;
    let defeat = false;

    if (!allDead && !combatCtx.over) {
      const enemyResult = resolveEnemyTurn(playerForEngine, combatCtx, enemies[0]);
      playerForEngine = enemyResult.player;
      combatCtx = enemyResult.combat;
      enemies = [enemyResult.enemy, ...enemies.slice(1)];
      logEntries = [...logEntries, ...enemyResult.log];
      newPlayerStates[actingUid] = { ...newPlayerStates[actingUid], hp: playerForEngine.hp, mp: playerForEngine.mp || 0 };
      if (playerForEngine.hp <= 0) defeat = true;
    }

    if (allDead || combatCtx.over) victory = true;

    if (actingUid === user.uid) {
      useGameStore.getState()._setState({ player: playerForEngine });
    }

    const tail = [...(cc.combatLogTail || []), ...logEntries].slice(-30);
    const update = {
      "coopCombat.pendingAction": null,
      "coopCombat.enemies": enemies,
      "coopCombat.combatCtx": combatCtx,
      "coopCombat.playerStates": newPlayerStates,
      "coopCombat.combatLogTail": tail,
      "coopCombat.activePlayerUid": otherUid,
    };

    if (victory || defeat) {
      // Outcome counter lets BOTH clients react once (see _subscribeLobby).
      const round = (cc.outcomeRound || 0) + 1;
      update["coopCombat.status"] = "idle";          // ready for the next fight
      update["coopCombat.readyToFight"] = {};
      update["coopCombat.lastOutcome"] = victory ? "victory" : "defeat";
      update["coopCombat.outcomeRound"] = round;
      if (victory) {
        const goldReward = (enemies[0]?.goldReward || 50) * 2;
        update["coopGold"] = (lobby.coopGold || 200) + goldReward;
        update["coopCombatIndex"] = (lobby.coopCombatIndex || 0) + 1;
      }
    }

    await updateDoc(doc(db, "lobbies", lobbyCode), update);
  },

  // ── VS PvP ──────────────────────────────────────────────────────────────

  signalReadyForPvP: async () => {
    const { lobbyCode } = get();
    const { user } = useAuthStore.getState();
    const localPlayer = useGameStore.getState().player;
    if (!lobbyCode || !user || !localPlayer) return;
    await updateDoc(doc(db, "lobbies", lobbyCode), {
      [`vsState.${user.uid}.readyForPvP`]: true,
      [`vsState.${user.uid}.playerState`]: playerSyncState(localPlayer),
    });
    // El listener _subscribeLobby detecta cuando ambos están listos
  },

  submitVsPvpAction: async (abilityKey) => {
    const { lobbyCode, lobby, isHost } = get();
    const { user } = useAuthStore.getState();
    if (!lobbyCode || !user) return;
    const action = { uid: user.uid, abilityKey, timestamp: Date.now() };
    if (isHost) await get()._processVsPvpAction(action, lobby);
    else await updateDoc(doc(db, "lobbies", lobbyCode), { "vsPvpCombat.pendingAction": action });
  },

  _processVsPvpAction: async (action, lobby) => {
    const { lobbyCode } = get();
    const { user } = useAuthStore.getState();
    const pvp = lobby.vsPvpCombat;
    if (!pvp || pvp.status !== "active") return;

    const actingUid = action.uid;
    const uids = Object.keys(lobby.players);
    const targetUid = uids.find(u => u !== actingUid);

    const attacker = pvp.playerStates[actingUid] || {};
    const defender = pvp.playerStates[targetUid] || {};

    const { calculatePhysicalDamage, calculateMagicDamage } = await import("../game/combat");
    const gamePlayer = useGameStore.getState().player;
    const ability = gamePlayer?.champion?.abilities?.find(a => a.key === action.abilityKey);

    let dmg = 0;
    if (ability) {
      if (ability.damageType === "adMult")      dmg = calculatePhysicalDamage(attacker.ad * (ability.adMult || 1), defender.armor || 0);
      else if (ability.damageType === "apMult") dmg = calculateMagicDamage(attacker.ap * (ability.apMult || 1), defender.mr || 0);
      else if (ability.damageType === "trueDmg") dmg = Math.round(attacker.ad * (ability.adMult || 1));
      else dmg = calculatePhysicalDamage(attacker.ad || 20, defender.armor || 0);
    } else {
      dmg = calculatePhysicalDamage(attacker.ad || 20, defender.armor || 0);
    }
    dmg = Math.max(1, dmg);

    const newDefenderHp = Math.max(0, (defender.hp || 0) - dmg);
    const logEntry = { type: "damage", text: `${attacker.champion?.emoji || "⚔️"} **${attacker.champion?.name || "?"}** → **${dmg}** daño a **${defender.champion?.name || "?"}**` };

    const newStates = { ...pvp.playerStates, [targetUid]: { ...defender, hp: newDefenderHp } };
    const tail = [...(pvp.logTail || []), logEntry].slice(-30);
    const finished = newDefenderHp <= 0;

    const update = {
      "vsPvpCombat.pendingAction": null,
      "vsPvpCombat.playerStates": newStates,
      "vsPvpCombat.logTail": tail,
      "vsPvpCombat.turnUid": targetUid,
    };

    if (finished) {
      update["vsPvpCombat.status"] = "finished";
      update["vsPvpCombat.winnerUid"] = actingUid;
      update[`vsScores.${actingUid}`] = (lobby.vsScores?.[actingUid] || 0) + 1;

      // Rey de pista
      const myUid = user.uid;
      const { vsConsecutiveWins } = get();
      const newStreak = actingUid === myUid ? vsConsecutiveWins + 1 : 0;
      set({ vsConsecutiveWins: newStreak });
      if (newStreak >= 3) useGameStore.getState().unlockAchievement("king_track");

      // Reset vsState.readyForPvP para el próximo enfrentamiento
      for (const uid of uids) { update[`vsState.${uid}.readyForPvP`] = false; }

      // Void = enfrentamiento final
      const isVoid = useGameStore.getState().regionIdx >= 5;
      if (isVoid) {
        if (actingUid === myUid) {
          useAuthStore.getState().updateLeaderboardStats("vsWins", 1);
          useGameStore.getState()._setState({ screen: "victory" });
        } else {
          useGameStore.getState()._setState({ screen: "gameover" });
        }
      }
      // Para regiones no-Void, VSCombat muestra el resultado y el botón "Continuar"
      // llama a proceedAfterCombat() para avanzar el combatIndex
    }

    await updateDoc(doc(db, "lobbies", lobbyCode), update);
  },

  _initVsPvp: async (lobby) => {
    const { lobbyCode } = get();
    const uids = Object.keys(lobby.players);
    const pvpRound = lobby.vsPvpCombat?.pvpRound || 0;
    const firstTurnUid = pvpRound % 2 === 0 ? uids[0] : uids[1];

    const playerStates = {};
    for (const uid of uids) {
      const st = lobby.vsState?.[uid]?.playerState;
      if (st) playerStates[uid] = { ...st, hp: st.maxHp }; // curar al 100%
    }

    await updateDoc(doc(db, "lobbies", lobbyCode), {
      vsPvpCombat: {
        status: "active",
        turnUid: firstTurnUid,
        winnerUid: null,
        pvpRound: pvpRound + 1,
        playerStates,
        logTail: [{ type: "system", text: `⚔️ ¡Enfrentamiento! Ronda ${pvpRound + 1}` }],
        pendingAction: null,
      },
    });
  },

  // ── Cleanup ─────────────────────────────────────────────────────────────

  reset: () => {
    if (unsubLobby) { unsubLobby(); unsubLobby = null; }
    if (unsubMatchmaking) { unsubMatchmaking(); unsubMatchmaking = null; }
    set({ lobbyCode: null, lobby: null, isHost: false, matchmakingStatus: "idle", error: null, vsConsecutiveWins: 0 });
  },
}));
