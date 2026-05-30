import React, { useState } from "react";
import { useGameStore } from "../../store/gameStore";
import { getItemPassives, STATUS_GLOSSARY } from "../../data/itemEffects";
import styles from "./InfoPanel.module.css";

const STAT_LABELS = {
  hp: "HP", ad: "AD", ap: "AP", armor: "Armor", mr: "MR",
  critChance: "Crit", attackSpeedPct: "Vel. Ataque", lifeSteal: "Robo Vida",
  moveSpeed: "Vel. Mov.", magicPen: "Pen. Mágica", armorPen: "Pen. Física",
  armorPenPct: "Pen. Arm. %", hpRegen5: "Regen HP", mp: "Recurso",
};

function fmtStat(k, v) {
  if (k === "critChance" || k === "attackSpeedPct" || k === "lifeSteal") return `+${Math.round(v * 100)}%`;
  return `+${v}`;
}

/**
 * InfoPanel — a self-contained ℹ button + modal showing the player's
 * abilities, equipped items (with passives) and a status-effect glossary.
 * Drop it anywhere; it reads the player from the store.
 */
export default function InfoPanel({ className = "" }) {
  const player = useGameStore(s => s.player);
  const [open, setOpen] = useState(false);
  const [tab, setTab]   = useState("abilities");

  if (!player) return null;

  return (
    <>
      <button
        className={`${styles.trigger} ${className}`}
        onClick={() => setOpen(true)}
        title="Ver habilidades, objetos y estados"
      >
        ℹ
      </button>

      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.header}>
              <div className={styles.tabs}>
                <button className={`${styles.tab} ${tab === "abilities" ? styles.tabActive : ""}`} onClick={() => setTab("abilities")}>
                  Habilidades
                </button>
                <button className={`${styles.tab} ${tab === "items" ? styles.tabActive : ""}`} onClick={() => setTab("items")}>
                  Objetos ({player.inventory?.length || 0})
                </button>
                <button className={`${styles.tab} ${tab === "status" ? styles.tabActive : ""}`} onClick={() => setTab("status")}>
                  Estados
                </button>
              </div>
              <button className={styles.close} onClick={() => setOpen(false)}>✕</button>
            </div>

            <div className={styles.body}>
              {tab === "abilities" && (
                <div className={styles.list}>
                  {player.champion.abilities.map(ab => {
                    const unlocked = player.abilityUnlocked?.[ab.key];
                    const imgUrl   = player.champion.abilityImages?.[ab.key];
                    const costStr  = ab.costType !== "none" ? `${ab.cost} ${ab.costType}` : "Sin coste";
                    const cdStr    = ab.cooldown > 0 ? `${ab.cooldown} turnos` : "Sin CD";
                    return (
                      <div key={ab.key} className={`${styles.row} ${!unlocked ? styles.rowLocked : ""}`}>
                        <div className={styles.icon}>
                          {imgUrl
                            ? <img src={imgUrl} alt={ab.key} className={styles.img} onError={e => e.target.style.display = "none"} />
                            : <div className={`key-tag key-${ab.key.toLowerCase()}`}>{ab.key}</div>}
                          {!unlocked && <div className={styles.lockTag}>🔒</div>}
                        </div>
                        <div className={styles.text}>
                          <div className={styles.name}>{ab.gameplayName} <span className={styles.key}>[{ab.key}]</span></div>
                          <div className={styles.desc}>{ab.description}</div>
                          <div className={styles.meta}>{costStr} · CD: {cdStr}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {tab === "items" && (
                <div className={styles.list}>
                  {(player.inventory || []).length === 0 && (
                    <p className={styles.empty}>No llevas ningún objeto.</p>
                  )}
                  {(player.inventory || []).map((item, i) => {
                    const passives = getItemPassives(item);
                    return (
                      <div key={i} className={styles.row}>
                        <div className={styles.icon}>
                          {item.imageUrl && <img src={item.imageUrl} alt={item.name} className={styles.img} style={item.imageFilter ? { filter: item.imageFilter } : undefined} onError={e => e.target.style.display = "none"} />}
                        </div>
                        <div className={styles.text}>
                          <div className={styles.name}>{item.name} <span className={styles.gold}>· {item.gold?.total}💰</span></div>
                          <div className={styles.stats}>
                            {Object.entries(item.stats || {}).filter(([, v]) => v !== 0).map(([k, v]) => (
                              <span key={k} className={styles.stat}>{fmtStat(k, v)} {STAT_LABELS[k] || k}</span>
                            ))}
                          </div>
                          {passives.map((p, j) => (
                            <div key={j} className={styles.passive}><span>{p.icon}</span> {p.text}</div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {tab === "status" && (
                <div className={styles.list}>
                  {STATUS_GLOSSARY.map((s, i) => (
                    <div key={i} className={styles.statusRow}>
                      <span className={styles.statusIcon}>{s.icon}</span>
                      <div className={styles.text}>
                        <div className={styles.name}>{s.name}</div>
                        <div className={styles.desc}>{s.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
