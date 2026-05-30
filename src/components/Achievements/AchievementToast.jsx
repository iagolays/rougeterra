import React, { useEffect, useRef, useState } from "react";
import { useGameStore } from "../../store/gameStore";
import { ACHIEVEMENTS_BY_ID } from "../../data/achievements";
import styles from "./AchievementToast.module.css";

const SHOW_MS = 4200;

export default function AchievementToast() {
  const queue = useGameStore(s => s.achievementQueue);
  const dismiss = useGameStore(s => s.dismissAchievementToast);
  const [leaving, setLeaving] = useState(false);
  const audioRef = useRef(null);

  const currentId = queue[0];

  useEffect(() => {
    if (!currentId) return;
    setLeaving(false);

    // Play the unlock sound (re-create per play so overlapping toasts retrigger)
    try {
      const audio = audioRef.current || (audioRef.current = new Audio("/assets/sfx/achievement.mp3"));
      audio.currentTime = 0;
      audio.volume = 0.6;
      audio.play().catch(() => { /* autoplay blocked until user interacts — ignore */ });
    } catch { /* ignore */ }

    const leaveTimer = setTimeout(() => setLeaving(true), SHOW_MS - 400);
    const dismissTimer = setTimeout(() => dismiss(), SHOW_MS);
    return () => { clearTimeout(leaveTimer); clearTimeout(dismissTimer); };
  }, [currentId, dismiss]);

  if (!currentId) return null;
  const ach = ACHIEVEMENTS_BY_ID[currentId];
  if (!ach) return null;

  return (
    <div className={`${styles.toast} ${leaving ? styles.leaving : ""}`} onClick={dismiss}>
      <div className={styles.glow} />
      <div className={styles.icon}>
        {ach.imageUrl
          ? <img src={ach.imageUrl} alt="" className={styles.iconImg} onError={e => { e.target.style.display = "none"; }} />
          : <span>{ach.emoji}</span>}
      </div>
      <div className={styles.body}>
        <div className={styles.label}>🏆 ¡Logro desbloqueado!</div>
        <div className={styles.name}>{ach.name}</div>
        <div className={styles.desc}>{ach.desc}</div>
      </div>
    </div>
  );
}
