import React, { useEffect, useRef } from "react";
import { useMultiplayerStore } from "../../store/multiplayerStore";
import { useAuthStore } from "../../store/authStore";
import { useGameStore } from "../../store/gameStore";
import { REGIONS } from "../../data/regions";
import styles from "./CoopCombat.module.css";

export default function CoopCombat() {
  const { lobby, signalReadyToFight, submitCoopAction, leaveLobby } = useMultiplayerStore();
  const { user } = useAuthStore();
  const { player, regionIdx } = useGameStore();
  const logRef = useRef(null);

  const region = REGIONS[regionIdx];
  const cc = lobby?.coopCombat;
  const players = lobby?.players || {};
  const uids = Object.keys(players);
  const myUid = user?.uid;
  const partnerUid = uids.find(u => u !== myUid);
  const myState = cc?.playerStates?.[myUid] || {};
  const partnerState = cc?.playerStates?.[partnerUid] || {};
  const partnerData = players[partnerUid] || {};

  const isMyTurn = cc?.activePlayerUid === myUid;
  const combatActive = cc?.status === "active";
  const combatOver = cc?.status === "victory" || cc?.status === "defeat";
  const readyToFight = lobby?.coopCombat?.readyToFight || {};
  const iReady = readyToFight[myUid] || false;
  const partnerReady = readyToFight[partnerUid] || false;
  const sharedGold = lobby?.coopGold || 0;

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [cc?.combatLogTail]);

  // Idle — show "Fight" button
  if (!combatActive && !combatOver) {
    return (
      <div className={styles.screen}>
        <div className={styles.header}>
          <span>{region?.emoji} {region?.name}</span>
          <span className={styles.gold}>💰 {sharedGold} (compartido)</span>
        </div>
        <div className={styles.readyScreen}>
          <h3 className={styles.readyTitle}>👥 Modo Cooperativo</h3>
          <p className={styles.readyDesc}>Ambos debéis presionar "Luchar" para comenzar el combate.</p>
          <div className={styles.readyStatus}>
            <div className={`${styles.readyPlayer} ${iReady ? styles.ready : ""}`}>
              {player?.champion?.emoji} Tú {iReady ? "✓" : "…"}
            </div>
            <div className={`${styles.readyPlayer} ${partnerReady ? styles.ready : ""}`}>
              {partnerData?.champion?.emoji || "👤"} {partnerData?.displayName?.split(" ")[0]} {partnerReady ? "✓" : "…"}
            </div>
          </div>
          <button
            className={`${styles.fightBtn} ${iReady ? styles.fightBtnReady : ""}`}
            onClick={signalReadyToFight}
            disabled={iReady}
          >
            {iReady ? `✓ Esperando... (${[iReady, partnerReady].filter(Boolean).length}/2)` : "⚔️ Luchar"}
          </button>
        </div>
      </div>
    );
  }

  const abilities = player?.champion?.abilities || [];

  return (
    <div className={styles.screen}>
      {/* Header */}
      <div className={styles.header}>
        <span>{region?.emoji} {region?.name} — Cooperativo</span>
        <span className={styles.gold}>💰 {sharedGold}</span>
      </div>

      {/* Enemy */}
      {(cc?.enemies || []).filter(e => e.currentHp > 0).map((enemy, i) => (
        <div key={i} className={styles.enemyCard}>
          <div className={styles.enemyInfo}>
            <span className={styles.enemyEmoji}>{enemy.emoji}</span>
            <div>
              <div className={styles.enemyName}>{enemy.name} {enemy.isBoss && <span className={styles.bossBadge}>BOSS</span>}</div>
              <div className={styles.hpText}>{Math.max(0, enemy.currentHp)} / {enemy.scaledStats?.hp} HP</div>
            </div>
          </div>
          <div className={styles.hpBar}>
            <div className={styles.hpFill} style={{ width: `${Math.max(0, (enemy.currentHp / enemy.scaledStats?.hp) * 100)}%` }} />
          </div>
        </div>
      ))}

      {/* My player panel */}
      <div className={styles.playerPanel}>
        <div className={styles.playerRow}>
          <span className={styles.playerEmoji}>{player?.champion?.emoji}</span>
          <div className={styles.playerInfo}>
            <div className={styles.playerName}>{player?.champion?.name} <span className={styles.youLabel}>(Tú)</span></div>
            <div className={styles.statRow}>
              <span>❤️ {Math.ceil(myState.hp ?? player?.hp ?? 0)}/{myState.maxHp ?? player?.maxHp ?? 0}</span>
              {(myState.mp ?? player?.mp ?? 0) > 0 && <span>💧 {Math.ceil(myState.mp ?? player?.mp ?? 0)}</span>}
            </div>
          </div>
          {isMyTurn && combatActive && <span className={styles.turnArrow}>◀ Tu turno</span>}
        </div>
        <div className={styles.hpBarSmall}>
          <div className={styles.hpFillGreen} style={{ width: `${Math.max(0, ((myState.hp ?? player?.hp ?? 0) / (myState.maxHp ?? player?.maxHp ?? 1)) * 100)}%` }} />
        </div>
      </div>

      {/* Partner panel */}
      <div className={`${styles.playerPanel} ${styles.partnerPanel}`}>
        <div className={styles.playerRow}>
          <span className={styles.playerEmoji}>{partnerData?.champion?.emoji || "👤"}</span>
          <div className={styles.playerInfo}>
            <div className={styles.playerName}>{partnerData?.champion?.name || partnerData?.displayName?.split(" ")[0]}</div>
            <div className={styles.statRow}>
              <span>❤️ {Math.ceil(partnerState.hp ?? 0)}/{partnerState.maxHp ?? 0}</span>
              {(partnerState.mp ?? 0) > 0 && <span>💧 {Math.ceil(partnerState.mp ?? 0)}</span>}
            </div>
          </div>
          {!isMyTurn && combatActive && <span className={styles.turnArrow}>◀ Su turno</span>}
        </div>
        <div className={styles.hpBarSmall}>
          <div className={styles.hpFillGreen} style={{ width: `${Math.max(0, ((partnerState.hp ?? 0) / (partnerState.maxHp ?? 1)) * 100)}%` }} />
        </div>
      </div>

      {/* Combat log */}
      <div className={styles.log} ref={logRef}>
        {(cc?.combatLogTail || []).map((entry, i) => (
          <div key={i} className={`${styles.logEntry} ${styles[`log_${entry.type}`] || ""}`}
            dangerouslySetInnerHTML={{ __html: entry.text?.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\*(.*?)\*/g, "<em>$1</em>") || "" }}
          />
        ))}
      </div>

      {/* Ability bar */}
      {combatActive && (
        <div className={styles.abilityBar}>
          <div className={styles.turnLine}>
            {isMyTurn ? "⚔️ Tu turno" : `⏳ Turno de ${partnerData?.displayName?.split(" ")[0] || "compañero"}…`}
          </div>
          <div className={styles.abilities}>
            {abilities.filter(a => a.key !== "P" && a.key !== "R").map(ab => {
              const cd = player?.abilityCooldowns?.[ab.key] || 0;
              const unlocked = player?.abilityUnlocked?.[ab.key] ?? (ab.key === "Q");
              const disabled = !isMyTurn || cd > 0 || !unlocked;
              return (
                <button
                  key={ab.key}
                  className={`${styles.abilityBtn} ${disabled ? styles.abilityDisabled : ""}`}
                  onClick={() => !disabled && submitCoopAction("ability", ab.key)}
                  disabled={disabled}
                >
                  <div className={`key-tag key-${ab.key.toLowerCase()}`}>{ab.key}</div>
                  {cd > 0 && <div className={styles.cdOverlay}>{cd}</div>}
                  {!unlocked && <div className={styles.lockOverlay}>🔒</div>}
                </button>
              );
            })}
            <button
              className={`${styles.passBtn} ${!isMyTurn ? styles.abilityDisabled : ""}`}
              onClick={() => isMyTurn && submitCoopAction("pass")}
              disabled={!isMyTurn}
            >
              ⏭
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {combatOver && (
        <div className={`${styles.resultBanner} ${cc?.status === "victory" ? styles.victory : styles.defeat}`}>
          {cc?.status === "victory" ? "🏆 ¡Victoria!" : "💀 Derrota"}
        </div>
      )}
    </div>
  );
}
