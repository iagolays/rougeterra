import React, { useState } from "react";
import { useGameStore } from "../../store/gameStore";
import { REGIONS } from "../../data/regions";
import styles from "./Home.module.css";

export default function Home() {
  const { player, gold, bank, regionIdx, goToPatchNotes, continueRun, startNewRun, goToSelect, replayTutorial, goToAchievements, goToCredits } = useGameStore();
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
          <div className={styles.version}>v0.5 Open Beta</div>
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

          {/* Achievements — prominent */}
          <button className={styles.btnAchievements} onClick={goToAchievements}>
            <span className={styles.btnIcon}>🏆</span>
            Logros
          </button>

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

          {/* References / credits */}
          <button className={styles.btnTertiary} onClick={goToCredits}>
            📚 Referencias
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
        <div className={styles.githubRow}>
          <a
            className={styles.githubLink}
            href="https://github.com/iagolays"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg className={styles.githubIcon} viewBox="0 0 16 16" aria-hidden="true">
              <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            Sobre mí
          </a>
          <a
            className={styles.githubLink}
            href="https://github.com/iagolays/rogueterra"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg className={styles.githubIcon} viewBox="0 0 16 16" aria-hidden="true">
              <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            Más info del proyecto
          </a>
          <a
            className={styles.githubLink}
            href="https://github.com/iagolays/rogueterra/issues/new"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className={styles.githubIcon} aria-hidden="true">🐛</span>
            Reportar / Sugerir
          </a>
        </div>
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
