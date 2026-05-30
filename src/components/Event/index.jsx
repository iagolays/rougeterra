/**
 * Event/index.jsx — Random event screen with images
 */
import React from "react";
import { useGameStore } from "../../store/gameStore";
import styles from "./Event.module.css";

export default function Event() {
  const { pendingEvent, resolveEvent, player, gold } = useGameStore();
  if (!pendingEvent || !player) return null;

  const outcome = typeof pendingEvent.outcome === "function"
    ? pendingEvent.outcome({ player, gold })
    : pendingEvent.outcome;

  const positiveClass = pendingEvent.positive === true ? styles.positive
    : pendingEvent.positive === false ? styles.negative : styles.neutral;

  return (
    <div className={`${styles.screen} screen-enter`}>
      <div className={styles.card}>

        {/* Image */}
        <div className={styles.imgWrap}>
          {pendingEvent.image ? (
            <img src={pendingEvent.image} alt={pendingEvent.title} className={styles.img}
              onError={e => { e.target.style.display="none"; e.target.nextSibling.style.display="flex"; }} />
          ) : null}
          <div className={styles.imgFallback} style={{ display: pendingEvent.image ? "none" : "flex" }}>
            <span style={{ fontSize: 72 }}>{pendingEvent.emoji}</span>
          </div>
          <div className={`${styles.tag} ${positiveClass}`}>
            {pendingEvent.positive === true ? "✦ Beneficial" : pendingEvent.positive === false ? "⚠ Hazard" : "~ Uncertain"}
          </div>
        </div>

        {/* Content */}
        <div className={styles.body}>
          <div className={styles.emoji}>{pendingEvent.emoji}</div>
          <h2 className={styles.title}>{pendingEvent.title}</h2>
          <p className={styles.desc}>{pendingEvent.desc}</p>

          <div className={`${styles.outcome} ${positiveClass}`}>
            <span className={styles.outcomeLabel}>Effect:</span>
            <span className={styles.outcomeValue}>{outcome}</span>
          </div>

          <button className="btn btn-gold" style={{ width: "100%", marginTop: 12, fontSize: 14, padding: "12px" }} onClick={resolveEvent}>
            Accept & Continue →
          </button>
        </div>
      </div>
    </div>
  );
}
