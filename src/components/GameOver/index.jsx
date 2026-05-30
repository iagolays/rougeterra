/**
 * GameOver/index.jsx
 */

import React from "react";
import { useGameStore } from "../../store/gameStore";
import { REGIONS } from "../../data/regions";
import styles from "./GameOver.module.css";

export default function GameOver() {
  const { player, gold, bank, regionIdx, combatIndex, totalKills, totalDamage, totalCombats, enemy, restartGame } = useGameStore();

  if (!player) return null;
  const region = REGIONS[regionIdx];

  return (
    <div className={`${styles.screen} screen-enter`}>
      <div className={styles.content}>

        <div className={styles.skull}>💀</div>
        <h1 className={styles.title}>Defeated</h1>
        <p className={styles.sub}>
          {player.champion.name} has fallen in {region.name}
          {enemy ? ` — slain by ${enemy.name}` : ""}.
        </p>

        <div className={styles.statsCard}>
          <Row label="Champion" value={`${player.champion.emoji} ${player.champion.name}`} />
          <Row label="Region reached" value={`${region.emoji} ${region.name}`} />
          <Row label="Combat progress" value={`${combatIndex}/${region.combatsPerRegion} in region`} />
          <Row label="Total combats" value={totalCombats} />
          <Row label="Kills" value={totalKills} />
          <Row label="Total damage dealt" value={totalDamage.toLocaleString()} />
          <Row label="Gold lost" value={<span className="text-red">–{gold}💰</span>} />
          <Row label="Gold in bank (saved)" value={<span className="text-green">{bank}💰</span>} />
          <Row
            label="Items collected"
            value={player.inventory?.map(i => i.name).join(", ") || "None"}
            small
          />
        </div>

        <div className={styles.lore}>
          <em>"{region.lore}"</em>
        </div>

        <div className={styles.buttons}>
          <button className="btn btn-gold" onClick={restartGame}>
            Try Again →
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, small }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={`${styles.rowValue} ${small ? styles.small : ""}`}>{value}</span>
    </div>
  );
}
