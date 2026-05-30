import React, { useEffect } from "react";
import { useGameStore } from "../../store/gameStore";
import { playSfx } from "../../game/sfx";
import styles from "./SorakaBlessing.module.css";

const SHOW_MS = 4500;

export default function SorakaBlessing() {
  const active  = useGameStore(s => s.sorakaBlessing);
  const dismiss = useGameStore(s => s.dismissSorakaBlessing);

  useEffect(() => {
    if (!active) return;
    playSfx("heal", 0.6);
    const t = setTimeout(() => dismiss(), SHOW_MS);
    return () => clearTimeout(t);
  }, [active, dismiss]);

  if (!active) return null;

  return (
    <div className={styles.overlay} onClick={dismiss}>
      <div className={styles.card}>
        <div className={styles.glow} />
        <img src="/assets/ui/soraka.png" alt="Soraka" className={styles.img}
          onError={e => { e.target.style.display = "none"; }} />
        <div className={styles.text}>
          <div className={styles.title}>Has recibido la bendición de Soraka</div>
          <div className={styles.desc}>Tu vida y tu maná han sido restaurados.</div>
        </div>
      </div>
    </div>
  );
}
