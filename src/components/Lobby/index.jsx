import React, { useEffect, useState } from "react";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";
import { useMultiplayerStore } from "../../store/multiplayerStore";
import { useAuthStore } from "../../store/authStore";
import { useGameStore } from "../../store/gameStore";
import styles from "./Lobby.module.css";

export default function Lobby() {
  const { lobby, lobbyCode, isHost, leaveLobby, selectChampionMultiplayer, cancelMatchmaking } = useMultiplayerStore();
  const { user } = useAuthStore();
  const { champPool } = useGameStore();

  const [countdown, setCountdown] = useState(null);
  const [copied, setCopied] = useState(false);

  const players = lobby ? Object.entries(lobby.players) : [];
  const partnerEntry = players.find(([uid]) => uid !== user?.uid);
  const partner = partnerEntry ? partnerEntry[1] : null;
  const myData = players.find(([uid]) => uid === user?.uid)?.[1];
  const status = lobby?.status;

  // Countdown logic
  useEffect(() => {
    if (status !== "countdown" || !lobby?.countdownStartedAt) return;
    const tick = () => {
      const elapsed = (Date.now() - lobby.countdownStartedAt) / 1000;
      const remaining = Math.max(0, 3 - Math.floor(elapsed));
      setCountdown(remaining);
      if (remaining === 0 && isHost) {
        updateDoc(doc(db, "lobbies", lobbyCode), { status: "champion_select" });
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [status, lobby?.countdownStartedAt]);

  const copyCode = () => {
    navigator.clipboard.writeText(lobbyCode || "").then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  if (!lobby) {
    return (
      <div className={styles.screen}>
        <div className={styles.bg} /><div className={styles.bgOverlay} />
        <div className={styles.content}>
          <p className={styles.waiting}>Conectando...</p>
          <button className={styles.leaveBtn} onClick={leaveLobby}>← Cancelar</button>
        </div>
      </div>
    );
  }

  // ── Countdown screen ──
  if (status === "countdown") {
    return (
      <div className={styles.screen}>
        <div className={styles.bg} /><div className={styles.bgOverlay} />
        <div className={styles.countdownScreen}>
          <div className={styles.countdownNum}>{countdown ?? 3}</div>
          <div className={styles.countdownLabel}>¡Preparaos!</div>
          <div className={styles.playersRow}>
            {players.map(([uid, p]) => (
              <div key={uid} className={styles.playerPill}>
                {p.photoURL && <img src={p.photoURL} className={styles.pillAvatar} referrerPolicy="no-referrer" />}
                <span>{p.displayName?.split(" ")[0]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Champion select ──
  if (status === "champion_select") {
    const myChampion = myData?.champion;
    const partnerChampion = partner?.champion;

    if (myChampion) {
      // Waiting for partner
      return (
        <div className={styles.screen}>
          <div className={styles.bg} /><div className={styles.bgOverlay} />
          <div className={styles.content}>
            <div className={styles.waitingCard}>
              <div className={styles.waitingIcon}>⏳</div>
              <h3 className={styles.waitingTitle}>Tu compañero está eligiendo...</h3>
              <div className={styles.myChoice}>
                <span className={styles.choiceEmoji}>{myChampion.emoji}</span>
                <span className={styles.choiceName}>Has elegido: <strong>{myChampion.name}</strong></span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Show champion carousel (simplified — just list)
    return (
      <div className={styles.screen}>
        <div className={styles.bg} /><div className={styles.bgOverlay} />
        <div className={styles.content}>
          <h3 className={styles.selectTitle}>Elige tu campeón</h3>
          {partnerChampion && (
            <div className={styles.partnerChoice}>
              <span>{partnerChampion.emoji}</span> Tu compañero eligió: <strong>{partnerChampion.name}</strong>
            </div>
          )}
          <div className={styles.champGrid}>
            {(champPool || []).map(champ => (
              <button
                key={champ.id}
                className={styles.champBtn}
                onClick={() => selectChampionMultiplayer(champ)}
              >
                <span className={styles.champEmoji}>{champ.emoji}</span>
                <span className={styles.champName}>{champ.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Waiting room ──
  return (
    <div className={styles.screen}>
      <div className={styles.bg} /><div className={styles.bgOverlay} />
      <div className={styles.content}>
        <div className={styles.lobbyCard}>
          <div className={styles.lobbyHeader}>
            <span className={styles.modeTag}>{lobby.mode === "coop" ? "👥 Cooperativo" : "🏆 VS"}</span>
            <h2 className={styles.lobbyTitle}>Sala de espera</h2>
          </div>

          {/* Code display */}
          <div className={styles.codeBlock}>
            <div className={styles.codeLabel}>Código de sala</div>
            <div className={styles.code}>{lobbyCode}</div>
            <button className={styles.copyBtn} onClick={copyCode}>
              {copied ? "✓ Copiado" : "📋 Copiar"}
            </button>
          </div>

          {/* Players */}
          <div className={styles.players}>
            {players.map(([uid, p]) => (
              <div key={uid} className={styles.playerRow}>
                {p.photoURL
                  ? <img src={p.photoURL} className={styles.avatar} referrerPolicy="no-referrer" />
                  : <div className={styles.avatarFallback}>👤</div>}
                <div className={styles.playerInfo}>
                  <div className={styles.playerName}>{p.displayName} {uid === user?.uid ? "(Tú)" : ""}</div>
                  <div className={styles.playerStatus}>{uid === lobby.host ? "👑 Anfitrión" : "Invitado"}</div>
                </div>
                <div className={styles.playerReady}>✓</div>
              </div>
            ))}
            {players.length < 2 && (
              <div className={`${styles.playerRow} ${styles.playerEmpty}`}>
                <div className={styles.avatarFallback}>⏳</div>
                <div className={styles.playerInfo}>
                  <div className={styles.playerName}>Esperando jugador...</div>
                </div>
              </div>
            )}
          </div>

          <button className={styles.leaveBtn} onClick={leaveLobby}>← Abandonar sala</button>
        </div>
      </div>
    </div>
  );
}
