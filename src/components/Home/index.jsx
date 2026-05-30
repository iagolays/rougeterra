import React from "react";
import { useGameStore } from "../../store/gameStore";
import styles from "./Home.module.css";

export default function Home() {
  const { bank, goToSelect, goToPatchNotes } = useGameStore();

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
          <div className={styles.version}>v0.1 Open Beta</div>
        </div>

        <div className={styles.buttons}>
          <button className={styles.btnPlay} onClick={goToSelect}>
            <span className={styles.btnIcon}>⚔️</span>
            Play
          </button>
          <button className={styles.btnSecondary} onClick={goToPatchNotes}>
            <span className={styles.btnIcon}>📋</span>
            Patch Notes
          </button>
        </div>

        {bank > 0 && (
          <div className={styles.bankHint}>
            🏦 {bank}g saved in your bank — carries over to next run
          </div>
        )}
      </div>

      {/* ── Disclaimer ── */}
      <footer className={styles.footer}>
        <p className={styles.disclaimer}>
          RogueTerra is an unofficial fan project. Not affiliated with or endorsed by Riot Games.
          No money is made from this project. All images, champion names, and lore belong to
          Riot Games / League of Legends. Made for fun.
        </p>
      </footer>

    </div>
  );
}
