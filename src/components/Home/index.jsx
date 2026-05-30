import React, { useState } from "react";
import { useGameStore } from "../../store/gameStore";
import { REGIONS } from "../../data/regions";
import styles from "./Home.module.css";

export default function Home() {
  const { player, gold, bank, regionIdx, goToPatchNotes, continueRun, startNewRun, goToSelect, replayTutorial } = useGameStore();
  const [confirmNew, setConfirmNew] = useState(false);

  const hasSave  = !!player;
  const region   = hasSave ? REGIONS[regionIdx] : null;

  const handlePlay = () => {
    if (hasSave) continueRun();
    else goToSelect();
  };

  const handleNew = () => {
    if (hasSave) setConfirmNew(true);
    else goToSelect();
  };

  return (
    <div className={styles.screen}>

      {/* ── Background map ── */}
      <div className={styles.bg} />
      <div className={styles.bgOverlay} />

      {/* ── Main content ── */}
      <div className={styles.content}>

        <div className={styles.titleBlock}>
          <div className={styles.eyebrow}>A RUNETERRA ROGUELIKE</div>
          <h1 className={styles.title}>RogueTerra</h1>
          <div className={styles.version}>v0.3 Open Beta</div>
        </div>

        {/* Saved run info */}
        {hasSave && (
          <div className={styles.saveCard}>
            {player.champion.iconUrl ? (
              <img
                src={player.champion.iconUrl}
                alt={player.champion.name}
                className={styles.saveAvatar}
                onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
              />
            ) : null}
            <div className={styles.saveIcon} style={{ display: player.champion.iconUrl ? "none" : "flex" }}>
              {player.champion.emoji}
            </div>
            <div className={styles.saveInfo}>
              <div className={styles.saveName}>{player.champion.name}</div>
              <div className={styles.saveMeta}>
                {region?.emoji} {region?.name} · {Math.ceil(player.hp)}/{player.maxHp} HP · {gold}💰
              </div>
            </div>
          </div>
        )}

        <div className={styles.buttons}>
          {/* Primary: Continue or Play */}
          <button className={styles.btnPlay} onClick={handlePlay}>
            <span className={styles.btnIcon}>{hasSave ? "▶" : "⚔️"}</span>
            {hasSave ? "Continuar Partida" : "Jugar"}
          </button>

          {/* Secondary: New game (always) or Patch Notes (no save) */}
          {hasSave ? (
            <button className={styles.btnSecondary} onClick={handleNew}>
              Nueva Partida
            </button>
          ) : (
            <button className={styles.btnSecondary} onClick={goToPatchNotes}>
              <span className={styles.btnIcon}>📋</span>
              Patch Notes
            </button>
          )}

          {/* Patch notes if there's a save */}
          {hasSave && (
            <button className={styles.btnTertiary} onClick={goToPatchNotes}>
              📋 Patch Notes
            </button>
          )}

          {/* Replay tutorial */}
          <button className={styles.btnTertiary} onClick={replayTutorial}>
            📖 Ver Tutorial
          </button>
        </div>

        {bank > 0 && (
          <div className={styles.bankHint}>
            🏦 {bank}g en el banco — persiste entre partidas
          </div>
        )}
      </div>

      {/* ── Disclaimer ── */}
      <footer className={styles.footer}>
        <p className={styles.disclaimer}>
          RogueTerra es un proyecto de fans no oficial y sin ánimo de lucro. No afiliado ni
          respaldado por Riot Games. Todas las imágenes y nombres pertenecen a Riot Games / League of Legends.
        </p>
      </footer>

      {/* ── Confirm new game modal ── */}
      {confirmNew && (
        <div className={styles.confirmOverlay} onClick={() => setConfirmNew(false)}>
          <div className={styles.confirmModal} onClick={e => e.stopPropagation()}>
            <div className={styles.confirmTitle}>¿Nueva partida?</div>
            <div className={styles.confirmText}>
              Perderás el progreso actual de <strong>{player?.champion?.name}</strong>.
              El oro del banco ({bank}💰) se conserva.
            </div>
            <div className={styles.confirmBtns}>
              <button className="btn btn-ghost" onClick={() => setConfirmNew(false)}>Cancelar</button>
              <button className="btn btn-gold" onClick={() => { setConfirmNew(false); startNewRun(); }}>
                Nueva Partida
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
