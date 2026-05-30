/**
 * Reward/index.jsx
 * If inventory is full, lets the player discard one existing item to pick the reward.
 */
import React, { useState } from "react";
import { useGameStore } from "../../store/gameStore";
import { SectionLabel } from "../UI";
import InfoPanel from "../InfoPanel";
import { REGIONS } from "../../data/regions";
import { getItemPassives } from "../../data/itemEffects";
import { applyItemStatsToPlayer, computeItemSynergies } from "../../game/combat";
import styles from "./Reward.module.css";

function computeStatDelta(player, item) {
  const newInv = [...(player.inventory || []), item];
  const newPlayer = applyItemStatsToPlayer({ ...player, inventory: newInv }, newInv);
  const keys = ["hp", "maxHp", "ad", "ap", "armor", "mr"];
  const deltas = {};
  for (const k of keys) {
    const diff = (newPlayer[k] || 0) - (player[k] || 0);
    if (diff !== 0) deltas[k] = diff;
  }
  const oldSyn = Object.keys(player.itemSynergies || {});
  const newSyn = Object.keys(computeItemSynergies(newInv));
  return { deltas, newSynergies: newSyn.filter(s => !oldSyn.includes(s)) };
}

const STAT_LABELS = { maxHp: "HP", ad: "AD", ap: "AP", armor: "Armor", mr: "MR" };
const SYNERGY_LABELS = {
  rabadonsAPBoost:       "🎩 Rabadon's: +35% AP",
  infinityEdgeCritBoost: "⚔️ IE: Crits deal 2.1×",
  liandryBurnBoost:      "🔥 Liandry: +2% burn",
  bcArmorPenBonus:       "🪓 Black Cleaver: +15 Armor Pen",
  warmogRegenBoost:      "❤️ Warmog: 4% HP regen",
};

export default function Reward() {
  const { player, gold, regionIdx, rewardItems, pickRewardItem, skipReward, discardAndPickItem } = useGameStore();
  const [hovered, setHovered]           = useState(null);
  const [discardForItem, setDiscardForItem] = useState(null); // reward item pending discard

  const region = REGIONS[regionIdx];
  if (!player) return null;

  const inventoryFull = (player.inventory?.length || 0) >= 6;

  const handleRewardClick = (item) => {
    if (inventoryFull) {
      setDiscardForItem(item);
    } else {
      pickRewardItem(item);
    }
  };

  // ── Discard mode ────────────────────────────────────────────────────────────
  if (discardForItem) {
    return (
      <div className={`${styles.screen} screen-enter`}>
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <span style={{ fontSize: 28 }}>🔄</span>
            <div>
              <div className={styles.title}>Swap Item</div>
              <div className={styles.sub}>
                Choose an item to discard — it will be replaced by{" "}
                <strong className="text-gold">{discardForItem.name}</strong>
              </div>
            </div>
            <button className={`btn btn-ghost ${styles.cancelBtn}`} onClick={() => setDiscardForItem(null)}>
              Cancel
            </button>
          </div>
        </div>

        {/* Incoming item preview */}
        <div className={styles.incomingCard}>
          <div className={styles.incomingImgWrap}>
            {discardForItem.imageUrl && (
              <img src={discardForItem.imageUrl} alt={discardForItem.name} className={styles.incomingImg}
                onError={e => { e.target.style.display = "none"; }} />
            )}
          </div>
          <div>
            <div className={styles.incomingName}>{discardForItem.name}</div>
            {discardForItem.plaintext && <div className={styles.incomingPlain}>{discardForItem.plaintext}</div>}
          </div>
        </div>

        <SectionLabel>Select item to discard</SectionLabel>
        <div className={styles.discardGrid}>
          {(player.inventory || []).map((item, i) => (
            <button
              key={i}
              className={styles.discardSlot}
              onClick={() => discardAndPickItem(i, discardForItem)}
            >
              <div className={styles.discardImgWrap}>
                {item.imageUrl
                  ? <img src={item.imageUrl} alt={item.name} className={styles.discardImg}
                      onError={e => { e.target.style.display = "none"; }} />
                  : <span className={styles.discardEmoji}>🗡️</span>
                }
              </div>
              <div className={styles.discardName}>{item.name}</div>
              <div className={styles.discardValue}>Lose {item.gold?.total ?? "?"}💰</div>
              <div className={styles.discardHint}>Discard ✕</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Normal mode ─────────────────────────────────────────────────────────────
  return (
    <div className={`${styles.screen} screen-enter`}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <span style={{ fontSize: 28 }}>🏆</span>
          <div>
            <div className={styles.title}>Choose Your Reward</div>
            <div className={styles.sub}>
              {inventoryFull
                ? "Inventory full — pick an item to swap with one you already have"
                : "Hover an item to preview stat changes"}
            </div>
          </div>
          <div className={styles.headerActions}>
            <InfoPanel />
            <div className={styles.headerGold}>💰 {gold}</div>
          </div>
        </div>
      </div>

      <div className={styles.rewardGrid}>
        {(rewardItems || []).map((item, idx) => {
          const { deltas, newSynergies } = computeStatDelta(player, item);
          const isHovered = hovered === idx;
          return (
            <button
              key={item.id}
              className={`${styles.rewardCard} ${isHovered ? styles.rewardCardHover : ""}`}
              onClick={() => handleRewardClick(item)}
              onMouseEnter={() => setHovered(idx)}
              onMouseLeave={() => setHovered(null)}
              onTouchStart={() => setHovered(idx)}
            >
              <div className={styles.itemImgWrap}>
                {item.imageUrl
                  ? <img src={item.imageUrl} alt={item.name} className={styles.itemImg}
                      onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} />
                  : null}
                <div className={styles.itemImgFallback} style={{ display: item.imageUrl ? "none" : "flex" }}>🗡️</div>
              </div>
              <div className={styles.itemBody}>
                <div className={styles.itemName}>{item.name}</div>
                <div className={styles.itemWorth}>Worth {item.gold.total}💰</div>
                {(Object.keys(deltas).length > 0 || newSynergies.length > 0) && (
                  <div className={styles.deltas}>
                    {Object.entries(deltas).map(([k, v]) => (
                      <div key={k} className={`${styles.delta} ${v > 0 ? styles.deltaPos : styles.deltaNeg}`}>
                        {v > 0 ? "+" : ""}{v} {STAT_LABELS[k] || k}
                      </div>
                    ))}
                    {newSynergies.map(s => (
                      <div key={s} className={styles.synergyTag}>{SYNERGY_LABELS[s] || s}</div>
                    ))}
                  </div>
                )}
                {getItemPassives(item).map((p, i) => (
                  <div key={i} className={styles.passiveLine}>{p.icon} {p.text}</div>
                ))}
              </div>
              <div className={styles.pickHint}>{inventoryFull ? "Swap ⇄" : "Pick →"}</div>
            </button>
          );
        })}
      </div>

      <div className={styles.skipRow}>
        <button className="btn btn-ghost" onClick={skipReward}>Skip reward</button>
      </div>

      <div className={styles.inventorySection}>
        <SectionLabel>Inventory ({player.inventory?.length || 0}/6)</SectionLabel>
        <div className={styles.inventoryRow}>
          {Array.from({ length: 6 }).map((_, i) => {
            const item = player.inventory?.[i];
            return item ? (
              <div key={i} className={styles.invSlot} title={item.name}>
                <img src={item.imageUrl} alt={item.name} className={styles.invImg}
                  onError={e => { e.target.style.display = "none"; }} />
              </div>
            ) : (
              <div key={i} className={styles.invSlotEmpty} />
            );
          })}
        </div>
      </div>
    </div>
  );
}
