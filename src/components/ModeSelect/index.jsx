import React, { useState, useEffect } from "react";
import { useGameStore } from "../../store/gameStore";
import { useAuthStore } from "../../store/authStore";
import { useMultiplayerStore } from "../../store/multiplayerStore";
import styles from "./ModeSelect.module.css";

export default function ModeSelect() {
  const { goToHome, goToSelect, setGameMode } = useGameStore();
  const { user, signIn } = useAuthStore();
  const { createLobby, joinByCode, joinMatchmaking, error } = useMultiplayerStore();

  const [selected, setSelected] = useState(null); // "normal" | "coop" | "vs"
  const [subMode, setSubMode] = useState(null);   // "matchmaking" | "code"
  const [codeInput, setCodeInput] = useState("");
  const [needsAuth, setNeedsAuth] = useState(false);
  const [searching, setSearching] = useState(false);

  // Once user logs in while needsAuth is shown, auto-proceed
  useEffect(() => {
    if (user && needsAuth && selected) {
      setNeedsAuth(false);
    }
  }, [user]);

  const handleModeClick = (modeId) => {
    const requiresAuth = modeId !== "normal";
    if (requiresAuth && !user) {
      setSelected(modeId);
      setNeedsAuth(true);
      return;
    }
    setSelected(modeId);
    if (modeId === "normal") { setGameMode("normal"); goToSelect(); }
  };

  const handleCreateLobby = () => createLobby(selected);
  const handleJoinByCode = () => { if (codeInput.trim()) joinByCode(codeInput); };
  const handleMatchmaking = () => { setSearching(true); joinMatchmaking(selected); };

  const MODES = [
    { id: "normal", icon: "⚔️", title: "Normal", subtitle: "Solo vs CPU", color: "#C89B3C",
      desc: "Aventúrate por las regiones de Runeterra. Tu progreso cuenta para el leaderboard." },
    { id: "coop", icon: "👥", title: "Cooperativo", subtitle: "2 jugadores vs CPU", color: "#00C853",
      desc: "Forma equipo con un compañero. Compartid oro y estrategia para vencer al Vacío." },
    { id: "vs", icon: "🏆", title: "VS", subtitle: "Jugador vs Jugador", color: "#E53935",
      desc: "Compite cara a cara. Os enfrentaréis al final de cada región. El más victorioso gana." },
  ];

  return (
    <div className={styles.screen}>
      <div className={styles.bg} />
      <div className={styles.bgOverlay} />

      <div className={styles.content}>
        <button className={styles.backBtn} onClick={goToHome}>← Volver</button>

        <div className={styles.header}>
          <h2 className={styles.title}>Modo de juego</h2>
          <p className={styles.subtitle}>¿Cómo quieres jugar hoy?</p>
        </div>

        {/* ── Auth prompt ── */}
        {needsAuth && !user && (
          <div className={styles.authBox}>
            <span className={styles.authIcon}>🔒</span>
            <p className={styles.authText}>
              El modo <strong>{MODES.find(m => m.id === selected)?.title}</strong> requiere iniciar sesión.
            </p>
            <button className={styles.btnGoogle} onClick={signIn}>
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Iniciar sesión con Google
            </button>
            <button className={styles.cancelBtn} onClick={() => { setNeedsAuth(false); setSelected(null); }}>Cancelar</button>
          </div>
        )}

        {/* ── Mode cards ── */}
        {!needsAuth && !selected && (
          <div className={styles.modes}>
            {MODES.map(mode => (
              <button key={mode.id} className={styles.modeCard} style={{ "--mode-color": mode.color }} onClick={() => handleModeClick(mode.id)}>
                <span className={styles.modeIcon}>{mode.icon}</span>
                <div className={styles.modeInfo}>
                  <div className={styles.modeName}>{mode.title} <span className={styles.modeSub}>— {mode.subtitle}</span></div>
                  <div className={styles.modeDesc}>{mode.desc}</div>
                </div>
                {mode.id !== "normal" && !user && <span className={styles.lockBadge}>🔒</span>}
              </button>
            ))}
          </div>
        )}

        {/* ── Sub-menu: Coop or VS ── */}
        {!needsAuth && selected && selected !== "normal" && (
          <div className={styles.subMenu}>
            <div className={styles.subHeader}>
              <span>{MODES.find(m => m.id === selected)?.icon}</span>
              <span className={styles.subTitle}>{MODES.find(m => m.id === selected)?.title}</span>
            </div>

            {!subMode ? (
              <div className={styles.subOptions}>
                <button className={styles.subBtn} onClick={() => setSubMode("matchmaking")}>
                  🎲 Emparejamiento aleatorio
                </button>
                <button className={styles.subBtn} onClick={() => setSubMode("code")}>
                  🔑 Por código
                </button>
                <button className={styles.backLink} onClick={() => setSelected(null)}>← Volver</button>
              </div>
            ) : subMode === "matchmaking" ? (
              <div className={styles.subOptions}>
                {!searching ? (
                  <>
                    <p className={styles.subDesc}>Buscaremos automáticamente a otro jugador disponible.</p>
                    <button className={styles.subBtnPrimary} onClick={handleMatchmaking}>🔍 Buscar partida</button>
                    <button className={styles.backLink} onClick={() => setSubMode(null)}>← Volver</button>
                  </>
                ) : (
                  <div className={styles.searchingBox}>
                    <div className={styles.searchingSpinner}>⟳</div>
                    <div className={styles.searchingTitle}>Buscando rival...</div>
                    <p className={styles.searchingDesc}>En cuanto haya otro jugador disponible, comenzará la cuenta atrás.</p>
                    <button className={styles.backLink} onClick={() => { setSearching(false); useMultiplayerStore.getState().cancelMatchmaking(); }}>✕ Cancelar búsqueda</button>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.subOptions}>
                <button className={styles.subBtn} onClick={handleCreateLobby}>➕ Crear sala (obtener código)</button>
                <div className={styles.orDivider}>— o —</div>
                <div className={styles.codeRow}>
                  <input
                    className={styles.codeInput}
                    placeholder="Código de sala"
                    value={codeInput}
                    onChange={e => setCodeInput(e.target.value.toUpperCase())}
                    maxLength={6}
                    onKeyDown={e => e.key === "Enter" && handleJoinByCode()}
                  />
                  <button className={styles.subBtnPrimary} onClick={handleJoinByCode}>Unirse</button>
                </div>
                {error && <div className={styles.errorMsg}>{error}</div>}
                <button className={styles.backLink} onClick={() => setSubMode(null)}>← Volver</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
