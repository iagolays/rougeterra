import React, { useEffect, useRef, useState } from "react";
import { useGameStore } from "../../store/gameStore";
import styles from "./Jumpscare.module.css";

// Super super low chance — rolled on every screen transition.
const CHANCE = 1 / 1500;
const DURATION = 700; // ms on screen

export default function Jumpscare() {
  const screen = useGameStore(s => s.screen);
  const unlockAchievement = useGameStore(s => s.unlockAchievement);
  const [active, setActive] = useState(false);
  const prevScreen = useRef(screen);
  const timer = useRef(null);

  useEffect(() => {
    if (screen !== prevScreen.current) {
      prevScreen.current = screen;
      if (Math.random() < CHANCE) {
        setActive(true);
        unlockAchievement("afortunado"); // "Afortunado" — viste a Poppy
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setActive(false), DURATION);
      }
    }
  }, [screen]);

  useEffect(() => () => clearTimeout(timer.current), []);

  if (!active) return null;

  return (
    <div className={styles.overlay} onClick={() => setActive(false)}>
      <img src="/assets/ui/poppy_easter_egg.png" alt="" className={styles.img} />
    </div>
  );
}
