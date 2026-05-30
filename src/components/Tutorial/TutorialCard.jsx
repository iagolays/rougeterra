import React from "react";
import { useGameStore } from "../../store/gameStore";
import styles from "./Tutorial.module.css";

const STEPS = [
  // ── Map (0-4) ──────────────────────────────────────────────────────────────
  {
    screen: "map",
    title: "Tu estado",
    desc: "Aquí ves tu HP, recursos y el oro que llevas. Cuando tu HP llega a 0, la partida termina y pierdes el oro de tu bolsillo (no el del banco).",
  },
  {
    screen: "map",
    title: "Inventario",
    desc: "Caben hasta 6 objetos. Los consigues en la tienda o como recompensa tras los combates. Pulsa ℹ para ver qué hace cada uno y sus estadísticas.",
  },
  {
    screen: "map",
    title: "Mapa de Runeterra",
    desc: "Tu posición actual brilla en el mapa. La siguiente región se muestra con un borde suave. Avanza por las 6 regiones hasta derrotar al Vacío.",
  },
  {
    screen: "map",
    position: "top",
    title: "Progreso de región",
    desc: "Los puntos indican los combates que quedan en la región actual. Completa todos para avanzar al siguiente territorio (y desbloquear enemigos más fuertes).",
  },
  {
    screen: "map",
    position: "top",
    title: "Elige tu destino",
    desc: "Cada turno puedes Luchar (necesario para avanzar), visitar la Tienda (compra objetos — el stock se renueva tras cada combate), o Descansar/explorar un Evento.",
  },
  // ── Combat (5-8) ───────────────────────────────────────────────────────────
  {
    screen: "combat",
    title: "El enemigo",
    desc: "Observa su HP, AD y Armor. Los efectos activos (stun, sangrado, AD reducido…) aparecen como badges de colores. En combates de élite pueden aparecer 2 enemigos — haz clic para cambiar de objetivo.",
  },
  {
    screen: "combat",
    title: "Tu panel",
    desc: "Tu HP y recursos en tiempo real. La barra R muestra las cargas de definitiva — necesitas llenarla completamente para poder usar tu R. Se acumula ganando combates.",
  },
  {
    screen: "combat",
    position: "top",
    title: "Tus habilidades",
    desc: "Q está disponible desde el inicio. W, E y R se desbloquean con victorias. Mantén pulsado (o pasa el ratón) por cada botón para leer su descripción completa antes de usarla.",
  },
  {
    screen: "combat",
    position: "top",
    title: "Registro de combate",
    desc: "Aquí se registra todo el combate: daño infligido y recibido, efectos aplicados y eventos especiales. Léelo para entender la situación — especialmente útil para ver las marcas de Hemorragia de Darius.",
  },
];

export const MAP_HIGHLIGHT_TARGETS    = ["champBar", "inventoryWrap", "mapArea", "combatProgress", "bottomNav"];
export const COMBAT_HIGHLIGHT_TARGETS = ["enemyArea", "playerPanel", "controls", "logWrap"];

export default function TutorialCard() {
  const { tutorialStep, advanceTutorial, skipTutorial, screen, pendingUnlock } = useGameStore();

  if (tutorialStep === null || tutorialStep === undefined) return null;
  const step = STEPS[tutorialStep];
  if (!step || step.screen !== screen) return null;

  // Pause the tutorial while the ability-unlock modal is open — it would block the highlight.
  if (pendingUnlock) return null;

  const isLast    = tutorialStep === STEPS.length - 1;
  const stepLabel = `${tutorialStep + 1} / ${STEPS.length}`;
  const atTop     = step.position === "top";

  return (
    <>
      <div className={styles.dim} />
      <div className={`${styles.card} ${atTop ? styles.cardTop : ""}`}>
        <div className={styles.header}>
          <span className={styles.badge}>Tutorial {stepLabel}</span>
          <button className={styles.skipBtn} onClick={skipTutorial}>Saltar tutorial</button>
        </div>
        <div className={styles.title}>{step.title}</div>
        <p className={styles.desc}>{step.desc}</p>
        <button className={styles.nextBtn} onClick={advanceTutorial}>
          {isLast ? "¡Listo, a jugar! →" : "Siguiente →"}
        </button>
      </div>
    </>
  );
}
