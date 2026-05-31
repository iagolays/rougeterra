import React, { useEffect, useRef, useState } from "react";
import { useMultiplayerStore } from "../../store/multiplayerStore";
import { useAuthStore } from "../../store/authStore";
import { useGameStore } from "../../store/gameStore";
import { InventorySlot } from "../UI";
import { REGIONS } from "../../data/regions";
import styles from "./VSCombat.module.css";

export default function VSCombat() {
  const { lobby, lobbyCode, signalReadyForPvP, submitVsPvpAction, isHost } = useMultiplayerStore();
  const { user } = useAuthStore();
  const { player, regionIdx } = useGameStore();
  const logRef = useRef(null);
  const [readySignaled, setReadySignaled] = useState(false);

  const region = REGIONS[regionIdx];
  const pvp = lobby?.vsPvpCombat;
  const players = lobby?.players || {};
  const uids = Object.keys(players);
  const myUid = user?.uid;
  const rivalUid = uids.find(u => u !== myUid);
  const rivalData = players[rivalUid] || {};
  const vsScores = lobby?.vsScores || {};
  const myScore = vsScores[myUid] || 0;
  const rivalScore = vsScores[rivalUid] || 0;

  const pvpStatus = pvp?.status || "idle";
  const myPvpState = pvp?.playerStates?.[myUid] || {};
  const rivalPvpState = pvp?.playerStates?.[rivalUid] || {};
  const isMyTurn = pvp?.turnUid === myUid;

  const vsReady = lobby?.vsState || {};
  const iReady = vsReady[myUid]?.readyForPvP || false;
  const rivalReady = vsReady[rivalUid]?.readyForPvP || false;

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [pvp?.logTail]);

  // Host triggers PvP init when both are ready
  useEffect(() => {
    if (isHost && iReady && rivalReady && pvpStatus === "idle") {
      useMultiplayerStore.getState()._initVsPvp(lobby);
    }
  }, [iReady, rivalReady, pvpStatus, isHost]);

  const handleReady = async () => {
    setReadySignaled(true);
    await signalReadyForPvP();
  };

  const abilities = player?.champion?.abilities?.filter(a => a.key !== "P") || [];

  // ── Waiting for both to be ready ──
  if (pvpStatus === "idle") {
    return (
      <div className={styles.screen}>
        <div className={styles.vsHeader}>
          <span className={styles.scoreChip}>{myScore} — {rivalScore}</span>
          <span className={styles.vsLabel}>Enfrentamiento</span>
          <span className={styles.regionLabel}>{region?.emoji} {region?.name}</span>
        </div>
        <div className={styles.readyScreen}>
          <h3 className={styles.readyTitle}>⚔️ Preparaos para el duelo</h3>
          <p className={styles.readyDesc}>Ambos seréis curados al 100% de vida antes del combate.</p>
          <div className={styles.readyRow}>
            <div className={`${styles.readyChip} ${iReady ? styles.chipReady : ""}`}>
              {player?.champion?.emoji} Tú {iReady ? "✓" : "…"}
            </div>
            <div className={styles.vsIcon}>VS</div>
            <div className={`${styles.readyChip} ${rivalReady ? styles.chipReady : ""}`}>
              {rivalData?.champion?.emoji || "👤"} {rivalData?.displayName?.split(" ")[0]} {rivalReady ? "✓" : "…"}
            </div>
          </div>
          <button className={styles.readyBtn} onClick={handleReady} disabled={readySignaled}>
            {readySignaled ? "✓ Listo" : "⚔️ ¡Listo para luchar!"}
          </button>
        </div>
      </div>
    );
  }

  // ── PvP finished ──
  if (pvpStatus === "finished") {
    const iWon = (myPvpState.hp ?? 0) > 0;
    return (
      <div className={styles.screen}>
        <div className={styles.vsHeader}>
          <span className={styles.scoreChip}>{myScore} — {rivalScore}</span>
          <span className={styles.vsLabel}>Resultado</span>
        </div>
        <div className={styles.resultScreen}>
          <div className={`${styles.resultBig} ${iWon ? styles.win : styles.lose}`}>
            {iWon ? "🏆 ¡Ganaste!" : "💀 Perdiste"}
          </div>
          <div className={styles.pointsInfo}>
            Marcador: <strong>{myScore}</strong> — <strong>{rivalScore}</strong>
          </div>
          <button className={styles.continueBtn} onClick={() => useGameStore.getState()._setState({ screen: "map" })}>
            Continuar →
          </button>
        </div>
      </div>
    );
  }

  // ── Active PvP ──
  return (
    <div className={styles.screen}>
      {/* Score header */}
      <div className={styles.vsHeader}>
        <span className={styles.scoreChip}>{myScore} — {rivalScore}</span>
        <span className={styles.vsLabel}>⚔️ VS</span>
        <span className={styles.regionLabel}>{region?.emoji}</span>
      </div>

      {/* MY panel */}
      <div className={`${styles.playerSection} ${isMyTurn ? styles.activeTurn : ""}`}>
        <div className={styles.sectionLabel}>Tú {isMyTurn && <span className={styles.turnTag}>◀ Tu turno</span>}</div>
        <div className={styles.champRow}>
          <span className={styles.champEmoji}>{player?.champion?.emoji}</span>
          <div className={styles.champInfo}>
            <div className={styles.champName}>{player?.champion?.name}</div>
            <div className={styles.hpText}>
              ❤️ {Math.max(0, Math.ceil(myPvpState.hp ?? player?.hp ?? 0))} / {myPvpState.maxHp ?? player?.maxHp ?? 0}
            </div>
          </div>
        </div>
        <div className={styles.hpBar}>
          <div className={styles.hpFillMe} style={{ width: `${Math.max(0, ((myPvpState.hp ?? player?.hp ?? 0) / (myPvpState.maxHp ?? player?.maxHp ?? 1)) * 100)}%` }} />
        </div>
        <div className={styles.inventory}>
          {(player?.inventory || []).map((item, i) => <InventorySlot key={i} item={item} index={i} />)}
          {Array.from({ length: Math.max(0, 6 - (player?.inventory?.length || 0)) }).map((_, i) => (
            <div key={`e${i}`} className={styles.emptySlot} />
          ))}
        </div>
      </div>

      {/* VS divider */}
      <div className={styles.vsDivider}>
        <div className={styles.vsDividerLine} />
        <span className={styles.vsDividerText}>VS</span>
        <div className={styles.vsDividerLine} />
      </div>

      {/* RIVAL panel */}
      <div className={`${styles.playerSection} ${styles.rivalSection} ${!isMyTurn ? styles.activeTurn : ""}`}>
        <div className={styles.sectionLabel}>
          {rivalData?.displayName?.split(" ")[0] || "Rival"}
          {!isMyTurn && <span className={styles.turnTag}>◀ Su turno</span>}
        </div>
        <div className={styles.champRow}>
          <span className={styles.champEmoji}>{rivalData?.champion?.emoji || "👤"}</span>
          <div className={styles.champInfo}>
            <div className={styles.champName}>{rivalData?.champion?.name || "Rival"}</div>
            <div className={styles.hpText}>
              ❤️ {Math.max(0, Math.ceil(rivalPvpState.hp ?? 0))} / {rivalPvpState.maxHp ?? 0}
            </div>
          </div>
        </div>
        <div className={styles.hpBar}>
          <div className={styles.hpFillRival} style={{ width: `${Math.max(0, ((rivalPvpState.hp ?? 0) / (rivalPvpState.maxHp ?? 1)) * 100)}%` }} />
        </div>
        <div className={styles.inventory}>
          {(rivalPvpState.inventory || []).map((item, i) => <InventorySlot key={i} item={item} index={i} />)}
          {Array.from({ length: Math.max(0, 6 - (rivalPvpState.inventory?.length || 0)) }).map((_, i) => (
            <div key={`re${i}`} className={styles.emptySlot} />
          ))}
        </div>
      </div>

      {/* Log */}
      <div className={styles.log} ref={logRef}>
        {(pvp?.logTail || []).map((entry, i) => (
          <div key={i} className={styles.logEntry}
            dangerouslySetInnerHTML={{ __html: (entry.text || "").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }}
          />
        ))}
      </div>

      {/* Ability bar */}
      <div className={styles.abilityBar}>
        <div className={styles.turnLine}>
          {isMyTurn ? "⚔️ Tu turno — elige habilidad" : `⏳ Turno de ${rivalData?.displayName?.split(" ")[0] || "rival"}…`}
        </div>
        <div className={styles.abilities}>
          {abilities.map(ab => {
            const cd = player?.abilityCooldowns?.[ab.key] || 0;
            const unlocked = player?.abilityUnlocked?.[ab.key] ?? (ab.key === "Q");
            const disabled = !isMyTurn || cd > 0 || !unlocked;
            return (
              <button
                key={ab.key}
                className={`${styles.abilityBtn} ${disabled ? styles.disabled : ""}`}
                onClick={() => !disabled && submitVsPvpAction(ab.key)}
                disabled={disabled}
              >
                <div className={`key-tag key-${ab.key.toLowerCase()}`}>{ab.key}</div>
                {cd > 0 && <div className={styles.cdOverlay}>{cd}</div>}
                {!unlocked && <div className={styles.cdOverlay}>🔒</div>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
