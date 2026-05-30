import React from "react";
import { useGameStore } from "../../store/gameStore";
import { ACHIEVEMENTS } from "../../data/achievements";
import styles from "./Achievements.module.css";

export default function Achievements() {
  const { unlockedAchievements, goToHome } = useGameStore();
  const unlocked = new Set(unlockedAchievements);
  const total    = ACHIEVEMENTS.length;
  const got      = ACHIEVEMENTS.filter(a => unlocked.has(a.id)).length;

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={goToHome}>← Volver</button>
        <div className={styles.headerTitle}>Logros</div>
        <div className={styles.counter}>{got}/{total}</div>
      </div>

      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${total ? (got / total) * 100 : 0}%` }} />
      </div>

      <div className={styles.grid}>
        {ACHIEVEMENTS.map(a => {
          const isUnlocked = unlocked.has(a.id);
          const isHidden   = a.hidden && !isUnlocked;
          return (
            <div key={a.id} className={`${styles.card} ${isUnlocked ? styles.cardUnlocked : styles.cardLocked}`}>
              <div className={styles.icon}>
                {isHidden
                  ? <span className={styles.hiddenMark}>?</span>
                  : a.imageUrl
                    ? <img src={a.imageUrl} alt="" className={styles.iconImg} onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} />
                    : <span>{a.emoji}</span>}
              </div>
              <div className={styles.info}>
                <div className={styles.name}>{isHidden ? "???" : a.name}</div>
                <div className={styles.desc}>{isHidden ? "Logro oculto — descúbrelo jugando." : a.desc}</div>
              </div>
              {isUnlocked && <div className={styles.check}>✓</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
