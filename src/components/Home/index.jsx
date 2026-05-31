import React, { useState } from "react";
import { useGameStore } from "../../store/gameStore";
import { useAuthStore } from "../../store/authStore";
import { REGIONS } from "../../data/regions";
import styles from "./Home.module.css";

export default function Home() {
  const { player, gold, bank, regionIdx, goToPatchNotes, continueRun, startNewRun, goToModeSelect, goToLeaderboard, replayTutorial, goToAchievements, goToCredits } = useGameStore();
  const { user, signIn, signOut } = useAuthStore();
  const [confirmNew, setConfirmNew] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const hasSave  = !!player;
  const region   = hasSave ? REGIONS[regionIdx] : null;

  const handlePlay = () => {
    if (hasSave) continueRun();
    else goToModeSelect();
  };

  const handleNew = () => {
    if (hasSave) setConfirmNew(true);
    else goToModeSelect();
  };

  return (
    <div className={styles.screen}>

      {/* ── Background map ── */}
      <div className={styles.bg} />
      <div className={styles.bgOverlay} />

      {/* ── User profile widget ── */}
      {user && (
        <div className={styles.userWidget}>
          {user.photoURL && (
            <img src={user.photoURL} alt={user.displayName} className={styles.userAvatar} referrerPolicy="no-referrer" />
          )}
          <span className={styles.userName}>{user.displayName?.split(" ")[0]}</span>
          <button className={styles.signOutBtn} onClick={() => setConfirmSignOut(true)} title="Cerrar sesión">
            ⎋
          </button>
        </div>
      )}

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

          {/* Leaderboard */}
          <button className={styles.btnAchievements} onClick={goToLeaderboard} style={{ background: "linear-gradient(135deg, rgba(59,120,255,0.22), rgba(30,64,128,0.18))", borderColor: "rgba(59,120,255,0.5)" }}>
            <span className={styles.btnIcon}>📊</span>
            Leaderboard
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

          {/* Login CTA when not signed in */}
          {!user && (
            <button className={styles.btnLogin} onClick={signIn}>
              <svg width="16" height="16" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Iniciar sesión para guardar en la nube
            </button>
          )}
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

      {/* ── Confirm sign out modal ── */}
      {confirmSignOut && (
        <div className={styles.confirmOverlay} onClick={() => setConfirmSignOut(false)}>
          <div className={styles.confirmModal} onClick={e => e.stopPropagation()}>
            <div className={styles.confirmTitle}>¿Cerrar sesión?</div>
            <div className={styles.confirmText}>
              Tu progreso está guardado en la nube. Podrás continuar cuando vuelvas a iniciar sesión.
            </div>
            <div className={styles.confirmBtns}>
              <button className="btn btn-ghost" onClick={() => setConfirmSignOut(false)}>Cancelar</button>
              <button className="btn btn-gold" onClick={() => { setConfirmSignOut(false); signOut(); }}>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

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
