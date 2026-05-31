/**
 * multiplayerStore.js
 * Gestiona lobbies, matchmaking y sincronización en tiempo real para modos Coop y VS.
 * Arquitectura Host/Guest: el Host ejecuta la lógica de combate y escribe en Firestore.
 * El Guest envía acciones y lee resultados vía onSnapshot.
 */
import { create } from "zustand";
import {
  doc, getDoc, setDoc, updateDoc, onSnapshot,
  collection, query, where, getDocs, deleteDoc,
  serverTimestamp, runTransaction,
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

function playerSyncState(player) {
  return {
    hp: player.hp,
    maxHp: player.maxHp,
    mp: player.mp,
    maxMp: player.maxMp,
    itemStats: player.itemStats || {},
    armor: player.armor,
    mr: player.mr,
    ad: player.ad,
    ap: player.ap,
    effects: [],
    champion: {
      name: player.champion.name,
      emoji: player.champion.emoji,
      iconUrl: player.champion.iconUrl || null,
      abilities: player.champion.abilities,
      resource: player.resource,
    },
    inventory: player.inventory || [],
  };
}

// ─── Store ──────────────────────────────────────────────────────────────────

let unsubLobby = null;

export const useMultiplayerStore = create((set, get) => ({
  lobbyCode: null,
  lobby: null,
  isHost: false,
  matchmakingStatus: "idle", // "idle" | "searching" | "found"
  error: null,
  vsConsecutiveWins: 0,

  // ── Lobby creation ──────────────────────────────────────────────────────

  createLobby: async (mode) => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    let code = generateCode();
    // Ensure unique code
    let snap = await getDoc(doc(db, "lobbies", code));
    while (snap.exists()) { code = generateCode(); snap = await getDoc(doc(db, "lobbies", code)); }

    const lobbyData = {
      mode,
      status: "waiting",
      host: user.uid,
      createdAt: serverTimestamp(),
      players: {
        [user.uid]: {
          displayName: user.displayName,
          photoURL: user.photoURL || null,
          champion: null,
          readyToFight: false,
        },
      },
      coopGold: 200,
      coopRegionIdx: 0,
      coopCombatIndex: 0,
      coopCombat: { status: "idle", readyToFight: {}, activePlayerUid: user.uid, firstAttackerUid: user.uid, playerStates: {}, enemies: [], combatCtx: null, combatLogTail: [], pendingAction: null },
      vsScores: { [user.uid]: 0 },
      vsPvpCombat: { status: "idle", turnUid: user.uid, pvpRound: 0, playerStates: {}, logTail: [], pendingAction: null },
    };

    await setDoc(doc(db, "lobbies", code), lobbyData);
    set({ lobbyCode: code, isHost: true, error: null });
    get()._subscribeLobby(code);
    useGameStore.getState().setGameMode(mode);
    useGameStore.getState()._setState({ screen: "lobby" });
  },

  joinByCode: async (code) => {
    const { user } = useAuthStore.getState();
    if (!user) return;
    const upper = code.trim().toUpperCase();
    const snap = await getDoc(doc(db, "lobbies", upper));
    if (!snap.exists()) { set({ error: "Código no encontrado." }); return; }
    const data = snap.data();
    if (data.status !== "waiting") { set({ error: "Esta sala ya no está disponible." }); return; }
    if (Object.keys(data.players).length >= 2) { set({ error: "La sala está llena." }); return; }

    await updateDoc(doc(db, "lobbies", upper), {
      [`players.${user.uid}`]: { displayName: user.displayName, photoURL: user.photoURL || null, champion: null, readyToFight: false },
      [`vsScores.${user.uid}`]: 0,
    });

    set({ lobbyCode: upper, isHost: false, error: null });
    get()._subscribeLobby(upper);
    useGameStore.getState().setGameMode(data.mode);
    useGameStore.getState()._setState({ screen: "lobby" });
  },

  // ── Matchmaking ─────────────────────────────────────────────────────────

  joinMatchmaking: async (mode) => {
    const { user } = useAuthStore.getState();
    if (!user) return;
    set({ matchmakingStatus: "searching", error: null });

    const myRef = doc(db, "matchmaking", user.uid);
    await setDoc(myRef, {
      mode,
      displayName: user.displayName,
      photoURL: user.photoURL || null,
      timestamp: serverTimestamp(),
      lobbyCode: null,
    });

    // Try to find a match using a transaction
    const q = query(collection(db, "matchmaking"), where("mode", "==", mode));
    let matched = false;

    try {
      await runTransaction(db, async (tx) => {
        const qSnap = await getDocs(q);
        const others = qSnap.docs.filter(d => d.id !== user.uid && !d.data().lobbyCode);
        if (others.length === 0) return; // No match yet

        const other = others[0];
        const otherUid = other.id;
        const otherData = other.data();

        // Create lobby
        let code = generateCode();
        let lobbySnap = await tx.get(doc(db, "lobbies", code));
        while (lobbySnap.exists()) { code = generateCode(); lobbySnap = await tx.get(doc(db, "lobbies", code)); }

        const lobbyData = {
          mode,
          status: "waiting",
          host: user.uid,
          createdAt: serverTimestamp(),
          players: {
            [user.uid]: { displayName: user.displayName, photoURL: user.photoURL || null, champion: null, readyToFight: false },
            [otherUid]: { displayName: otherData.displayName, photoURL: otherData.photoURL || null, champion: null, readyToFight: false },
          },
          coopGold: 200,
          coopRegionIdx: 0,
          coopCombatIndex: 0,
          coopCombat: { status: "idle", readyToFight: {}, activePlayerUid: user.uid, firstAttackerUid: user.uid, playerStates: {}, enemies: [], combatCtx: null, combatLogTail: [], pendingAction: null },
          vsScores: { [user.uid]: 0, [otherUid]: 0 },
          vsPvpCombat: { status: "idle", turnUid: user.uid, pvpRound: 0, playerStates: {}, logTail: [], pendingAction: null },
        };

        tx.set(doc(db, "lobbies", code), lobbyData);
        tx.update(doc(db, "matchmaking", otherUid), { lobbyCode: code });
        tx.update(myRef, { lobbyCode: code });
        matched = true;
      });
    } catch {}

    if (matched) {
      // We created the lobby — read our updated doc to get the code
      const mySnap = await getDoc(myRef);
      const code = mySnap.data()?.lobbyCode;
      if (code) { await deleteDoc(myRef); set({ lobbyCode: code, isHost: true, matchmakingStatus: "found" }); get()._subscribeLobby(code); useGameStore.getState().setGameMode(mode); useGameStore.getState()._setState({ screen: "lobby" }); return; }
    }

    // We're waiting — watch our entry for a lobbyCode assigned by someone else
    const unsubMM = onSnapshot(myRef, async (snap) => {
      const code = snap.data()?.lobbyCode;
      if (code) {
        unsubMM();
        await deleteDoc(myRef);
        set({ lobbyCode: code, isHost: false, matchmakingStatus: "found" });
        get()._subscribeLobby(code);
        useGameStore.getState().setGameMode(mode);
        useGameStore.getState()._setState({ screen: "lobby" });
      }
    });
  },

  cancelMatchmaking: async () => {
    const { user } = useAuthStore.getState();
    if (!user) return;
    try { await deleteDoc(doc(db, "matchmaking", user.uid)); } catch {}
    set({ matchmakingStatus: "idle" });
  },

  // ── Lobby subscription ──────────────────────────────────────────────────

  _subscribeLobby: (code) => {
    if (unsubLobby) unsubLobby();
    unsubLobby = onSnapshot(doc(db, "lobbies", code), (snap) => {
      if (!snap.exists()) { set({ lobby: null, lobbyCode: null }); return; }
      const lobby = { id: snap.id, ...snap.data() };
      const prev = get().lobby;
      set({ lobby });

      const { user } = useAuthStore.getState();
      const { isHost } = get();

      // Host processes pending coop actions
      if (isHost && lobby.coopCombat?.pendingAction && lobby.coopCombat.pendingAction.uid !== user.uid) {
        get()._processCoopAction(lobby.coopCombat.pendingAction, lobby);
      }

      // Host processes pending VS PvP actions
      if (isHost && lobby.vsPvpCombat?.pendingAction && lobby.vsPvpCombat.pendingAction.uid !== user.uid) {
        get()._processVsPvpAction(lobby.vsPvpCombat.pendingAction, lobby);
      }

      // Countdown logic (host-driven): when 2 players join, host starts countdown
      if (isHost && lobby.status === "waiting" && Object.keys(lobby.players).length === 2 && !lobby.countdownStartedAt) {
        updateDoc(doc(db, "lobbies", code), { status: "countdown", countdownStartedAt: Date.now() });
      }

      // Screen transitions based on lobby status
      const gameScreen = useGameStore.getState().screen;
      if (lobby.status === "champion_select" && gameScreen === "lobby") {
        // Stay on lobby screen — Lobby component renders champion select UI
      }
      if (lobby.status === "playing" && gameScreen === "lobby") {
        // Both chose champion — go to map (coop) or normal select flow for VS
        const mode = lobby.mode;
        if (mode === "coop") useGameStore.getState()._setState({ screen: "map" });
        if (mode === "vs") useGameStore.getState()._setState({ screen: "map" });
      }
    });
  },

  leaveLobby: async () => {
    const { lobbyCode, lobby, isHost } = get();
    const { user } = useAuthStore.getState();
    if (!lobbyCode || !user) return;

    if (unsubLobby) { unsubLobby(); unsubLobby = null; }

    if (isHost && lobby) {
      await updateDoc(doc(db, "lobbies", lobbyCode), { status: "finished" });
    } else if (lobby) {
      const updated = { ...lobby.players };
      delete updated[user.uid];
      await updateDoc(doc(db, "lobbies", lobbyCode), { players: updated });
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

    // Set local champion in gameStore
    useGameStore.getState().selectChampion(champion);
    // Override screen — stay in lobby flow
    const localPlayer = useGameStore.getState().player;

    await updateDoc(doc(db, "lobbies", lobbyCode), {
      [`players.${user.uid}.champion`]: {
        id: champion.id,
        name: champion.name,
        emoji: champion.emoji,
        iconUrl: champion.iconUrl || null,
      },
      [`players.${user.uid}.playerSync`]: playerSyncState(localPlayer || { hp: champion.stats.hp, maxHp: champion.stats.hp, mp: champion.stats.mp, maxMp: champion.stats.mp, itemStats: {}, armor: champion.stats.armor, mr: champion.stats.mr, ad: champion.stats.ad, ap: 0, inventory: [], champion, resource: champion.resource }),
    });

    // Check if both players chose
    const updatedLobby = { ...lobby, players: { ...lobby.players, [user.uid]: { ...lobby.players[user.uid], champion: { id: champion.id, name: champion.name, emoji: champion.emoji } } } };
    const allChose = Object.values(updatedLobby.players).every(p => p.champion !== null);
    if (allChose && isHost) {
      await updateDoc(doc(db, "lobbies", lobbyCode), { status: "playing" });
    }
  },

  // ── Coop: Fight button ──────────────────────────────────────────────────

  signalReadyToFight: async () => {
    const { lobbyCode } = get();
    const { user } = useAuthStore.getState();
    if (!lobbyCode || !user) return;
    await updateDoc(doc(db, "lobbies", lobbyCode), {
      [`coopCombat.readyToFight.${user.uid}`]: true,
    });
    // Check if host should start combat
    const snap = await getDoc(doc(db, "lobbies", lobbyCode));
    const lobby = snap.data();
    const allReady = Object.keys(lobby.players).every(uid => lobby.coopCombat?.readyToFight?.[uid]);
    if (allReady && get().isHost) {
      get()._initCoopCombat(lobby);
    }
  },

  _initCoopCombat: async (lobby) => {
    const { lobbyCode } = get();
    const { user } = useAuthStore.getState();
    const regionIdx = lobby.coopRegionIdx || 0;
    const combatIndex = lobby.coopCombatIndex || 0;
    const region = REGIONS[regionIdx];

    // Build enemy group
    const isBoss = (combatIndex + 1) % region.bossEvery === 0;
    const count = isBoss ? 1 : (combatIndex % 2 === 1 ? 2 : 1);
    const enemies = [];
    for (let i = 0; i < count; i++) enemies.push(getDifficultyScaledEnemy(region.id, combatIndex));

    // Pick first attacker (alternates each combat)
    const uids = Object.keys(lobby.players);
    const firstAttacker = combatIndex % 2 === 0 ? uids[0] : uids[1];
    const localPlayer = useGameStore.getState().player;
    const { player: initPlayer, combat: initCtx } = initCombat(localPlayer, enemies[0]);

    const playerStates = {};
    for (const [uid, pData] of Object.entries(lobby.players)) {
      playerStates[uid] = pData.playerSync || { hp: 100, maxHp: 100, mp: 0, maxMp: 0, itemStats: {}, armor: 0, mr: 0, ad: 20, ap: 0, effects: [] };
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
        combatLogTail: [{ type: "system", text: `⚔️ ¡Combate! ${isBoss ? "👑 BOSS" : ""}` }],
        pendingAction: null,
      },
    });
  },

  // ── Coop: Player action ─────────────────────────────────────────────────

  submitCoopAction: async (type, abilityKey = null) => {
    const { lobbyCode, lobby, isHost } = get();
    const { user } = useAuthStore.getState();
    if (!lobbyCode || !user) return;

    const action = { uid: user.uid, type, abilityKey, timestamp: Date.now() };

    if (isHost) {
      // Host acts directly
      await get()._processCoopAction(action, lobby);
    } else {
      // Guest submits action for host to process
      await updateDoc(doc(db, "lobbies", lobbyCode), {
        "coopCombat.pendingAction": action,
      });
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

    // Rebuild player for combat engine from synced state
    const actingPState = cc.playerStates[actingUid];
    const gamePlayer = useGameStore.getState().player;

    // Use local player state if it's our turn, or reconstruct from sync for guest
    let playerForEngine = actingUid === user.uid
      ? gamePlayer
      : { ...gamePlayer, hp: actingPState.hp, maxHp: actingPState.maxHp, mp: actingPState.mp, maxMp: actingPState.maxMp, armor: actingPState.armor, mr: actingPState.mr, ad: actingPState.ad, ap: actingPState.ap, itemStats: actingPState.itemStats };

    const ability = gamePlayer.champion.abilities.find(a => a.key === action.abilityKey);
    let combatCtx = cc.combatCtx;
    let enemies = [...cc.enemies];
    let logEntries = [];

    if (action.type === "ability" && ability) {
      const result = applyPlayerAbility(ability, playerForEngine, combatCtx, enemies[0]);
      playerForEngine = result.player;
      combatCtx = result.combat;
      enemies = [result.enemy, ...enemies.slice(1)];
      logEntries = result.log;
    } else if (action.type === "pass") {
      // Simple pass - regenerate resource
      logEntries = [{ type: "system", text: `⏭️ ${actingPState.champion?.name || "Jugador"} pasa turno.` }];
    }

    // Enemy turn — attacks the player who just acted
    const allDead = enemies.every(e => e.currentHp <= 0);
    let newPlayerStates = {
      ...cc.playerStates,
      [actingUid]: { ...cc.playerStates[actingUid], hp: playerForEngine.hp, mp: playerForEngine.mp, effects: [] },
    };

    let victory = allDead;
    let defeat = false;

    if (!allDead && !combatCtx.over) {
      const enemyResult = resolveEnemyTurn(playerForEngine, combatCtx, enemies[0]);
      playerForEngine = enemyResult.player;
      combatCtx = enemyResult.combat;
      enemies = [enemyResult.enemy, ...enemies.slice(1)];
      logEntries = [...logEntries, ...enemyResult.log];
      newPlayerStates[actingUid] = { ...newPlayerStates[actingUid], hp: playerForEngine.hp, mp: playerForEngine.mp };
      if (playerForEngine.hp <= 0) defeat = true;
    }

    // Update host's local player if it was the host's turn
    if (actingUid === user.uid) {
      useGameStore.getState()._setState({ player: playerForEngine });
    }

    // Switch active player
    const nextUid = otherUid;
    const tail = [...(cc.combatLogTail || []), ...logEntries].slice(-30);

    const update = {
      "coopCombat.pendingAction": null,
      "coopCombat.enemies": enemies,
      "coopCombat.combatCtx": combatCtx,
      "coopCombat.playerStates": newPlayerStates,
      "coopCombat.combatLogTail": tail,
      "coopCombat.activePlayerUid": nextUid,
    };

    if (victory) update["coopCombat.status"] = "victory";
    if (defeat) update["coopCombat.status"] = "defeat";

    await updateDoc(doc(db, "lobbies", lobbyCode), update);

    if (victory) {
      // Give gold reward + advance combat index
      const goldReward = enemies[0]?.goldReward || 50;
      const newGold = (lobby.coopGold || 200) + goldReward * 2;
      const newIdx = (lobby.coopCombatIndex || 0) + 1;
      await updateDoc(doc(db, "lobbies", lobbyCode), { coopGold: newGold, coopCombatIndex: newIdx, "coopCombat.readyToFight": {} });
      useGameStore.getState()._setState({ screen: "reward" });
    }

    if (defeat) {
      useGameStore.getState()._setState({ screen: "gameover" });
    }
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
  },

  submitVsPvpAction: async (abilityKey) => {
    const { lobbyCode, lobby, isHost } = get();
    const { user } = useAuthStore.getState();
    if (!lobbyCode || !user) return;
    const action = { uid: user.uid, abilityKey, timestamp: Date.now() };
    if (isHost) {
      await get()._processVsPvpAction(action, lobby);
    } else {
      await updateDoc(doc(db, "lobbies", lobbyCode), { "vsPvpCombat.pendingAction": action });
    }
  },

  _processVsPvpAction: async (action, lobby) => {
    const { lobbyCode } = get();
    const { user } = useAuthStore.getState();
    const pvp = lobby.vsPvpCombat;
    if (!pvp || pvp.status !== "active") return;

    const actingUid = action.uid;
    const uids = Object.keys(lobby.players);
    const targetUid = uids.find(u => u !== actingUid);

    const attacker = pvp.playerStates[actingUid];
    const defender = pvp.playerStates[targetUid];

    // Simple damage: AD minus defender armor (using existing formula)
    const { calculatePhysicalDamage, calculateMagicDamage } = await import("../game/combat");
    const gamePlayer = useGameStore.getState().player;
    const ability = gamePlayer.champion.abilities.find(a => a.key === action.abilityKey);

    let dmg = 0;
    if (ability) {
      if (ability.damageType === "adMult") dmg = calculatePhysicalDamage(attacker.ad * (ability.adMult || 1), defender.armor || 0);
      else if (ability.damageType === "apMult") dmg = calculateMagicDamage(attacker.ap * (ability.apMult || 1), defender.mr || 0);
      else dmg = calculatePhysicalDamage(attacker.ad, defender.armor || 0);
    } else {
      dmg = calculatePhysicalDamage(attacker.ad, defender.armor || 0);
    }

    const newDefenderHp = Math.max(0, defender.hp - dmg);
    const logEntry = { type: "damage", text: `${attacker.champion?.emoji || "⚔️"} **${attacker.champion?.name}** → ${dmg} daño a **${defender.champion?.name}**` };

    const newStates = {
      ...pvp.playerStates,
      [targetUid]: { ...defender, hp: newDefenderHp },
    };

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
      // Award point to winner
      update[`vsScores.${actingUid}`] = (lobby.vsScores?.[actingUid] || 0) + 1;

      // Check Rey de pista achievement
      const { vsConsecutiveWins } = get();
      const myUid = user.uid;
      const newStreak = actingUid === myUid ? vsConsecutiveWins + 1 : 0;
      set({ vsConsecutiveWins: newStreak });
      if (newStreak >= 3) useGameStore.getState().unlockAchievement("king_track");

      // Check if this is the Void (last region) PvP — ends the game
      const myStore = useGameStore.getState();
      const isVoid = myStore.regionIdx >= 5;
      if (isVoid) {
        update[`vsState.${actingUid}.finalWinner`] = true;
        useAuthStore.getState().updateLeaderboardStats("vsWins", 1);
        if (actingUid === myUid) {
          useGameStore.getState()._setState({ screen: "victory" });
        } else {
          useGameStore.getState()._setState({ screen: "gameover" });
        }
      }
    }

    await updateDoc(doc(db, "lobbies", lobbyCode), update);
  },

  // ── VS: Init PvP ────────────────────────────────────────────────────────

  _initVsPvp: async (lobby) => {
    const { lobbyCode } = get();
    const uids = Object.keys(lobby.players);
    const pvpRound = lobby.vsPvpCombat?.pvpRound || 0;
    const firstTurnUid = pvpRound % 2 === 0 ? uids[0] : uids[1];

    // Heal both to full, use their current synced stats
    const playerStates = {};
    for (const [uid] of Object.entries(lobby.players)) {
      const st = lobby.vsState?.[uid]?.playerState;
      if (st) playerStates[uid] = { ...st, hp: st.maxHp };
    }

    await updateDoc(doc(db, "lobbies", lobbyCode), {
      vsPvpCombat: {
        status: "active",
        turnUid: firstTurnUid,
        pvpRound: pvpRound + 1,
        playerStates,
        logTail: [{ type: "system", text: `⚔️ ¡Enfrentamiento PvP! Ronda ${pvpRound + 1}` }],
        pendingAction: null,
      },
    });
  },

  // ── Cleanup ─────────────────────────────────────────────────────────────

  reset: () => {
    if (unsubLobby) { unsubLobby(); unsubLobby = null; }
    set({ lobbyCode: null, lobby: null, isHost: false, matchmakingStatus: "idle", error: null, vsConsecutiveWins: 0 });
  },
}));
