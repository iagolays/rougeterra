/**
 * Victory/index.jsx
 */

import React from "react";
import { useGameStore } from "../../store/gameStore";
import styles from "./Victory.module.css";

export default function Victory() {
  const { player, gold, bank, totalKills, totalDamage, totalCombats, restartGame } = useGameStore();
  if (!player) return null;

  return (
    <div className={`${styles.screen} screen-enter`}>
      <div className={styles.content}>
        <div className={styles.stars}>✦ ✦ ✦</div>
        <h1 className={styles.title}>Victory!</h1>
        <p className={styles.sub}>
          {player.champion.name} has conquered all of Runeterra.
        </p>

        <div className={styles.portrait}>
          {player.champion.loadingUrl ? (
            <img
              src={player.champion.loadingUrl}
              alt={player.champion.name}
              className={styles.portraitImg}
              onError={e => { e.target.style.display="none"; e.target.nextSibling.style.display="block"; }}
            />
          ) : null}
          <div className={styles.portraitFallback} style={{ display: player.champion.loadingUrl ? "none" : "block" }}>
            {player.champion.emoji}
          </div>
          <div className={styles.champName}>{player.champion.name}</div>
          <div className={styles.champTitle}>{player.champion.title}</div>
        </div>

        <div className={styles.statsCard}>
          <Stat label="Combats won" value={totalCombats} />
          <Stat label="Kills" value={totalKills} />
          <Stat label="Total damage" value={totalDamage.toLocaleString()} />
          <Stat label="Gold earned" value={`${gold + bank}💰`} />
          <Stat label="Items" value={player.inventory?.length || 0} />
          <Stat
            label="Build"
            value={player.inventory?.map(i => i.name).join(" · ") || "—"}
            small
          />
        </div>

        <div className={styles.quote}>
          <em>"The strongest don't just survive — they ascend."</em>
        </div>

        <button className="btn btn-gold" onClick={restartGame} style={{ fontSize: 14, padding: "12px 32px" }}>
          New Game →
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, small }) {
  return (
    <div className={styles.statRow}>
      <span className={styles.statLabel}>{label}</span>
      <span className={`${styles.statValue} ${small ? styles.small : ""}`}>{value}</span>
    </div>
  );
}
