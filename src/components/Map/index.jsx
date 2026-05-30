/**
 * Map/index.jsx — Mobile-first redesign
 * Layout: champion header top → Runeterra map center → bottom nav bar
 */
import React from "react";
import { useGameStore } from "../../store/gameStore";
import { InventorySlot } from "../UI";
import { REGIONS } from "../../data/regions";
import RuneterraMap from "./RuneterraMap";
import InfoPanel from "../InfoPanel";
import styles from "./Map.module.css";

// Static Runeterra map regions with approximate positions (% of image)
const REGION_PINS = {
  demacia:      { x: 28, y: 52 },
  noxus:        { x: 46, y: 45 },
  freljord:     { x: 42, y: 18 },
  piltover:     { x: 35, y: 55 },
  shadow_isles: { x: 18, y: 48 },
  void:         { x: 50, y: 72 },
};

const DEST_FIXED = [
  { id: "combat", label: "Fight", icon: "⚔️", imgSrc: "/assets/items/1055.png", desc: "Enter combat" },
  { id: "shop",   label: "Shop",  icon: "🏪", imgSrc: "/assets/ui/coin.png",    desc: "Buy items"    },
];
const DEST_VARIABLE = {
  rest:  { id: "rest",  label: "Rest",  icon: "🏕️", desc: "Recover HP"   },
  event: { id: "event", label: "Event", icon: "❓", imgSrc: "/assets/ui/missing_ping.png", desc: "Mystery event" },
};

export default function Map() {
  const {
    player, gold, bank, regionIdx, combatIndex, totalKills, winStreak,
    chooseDestination, pendingUnlock, unlockAbility, dismissUnlock,
    tutorialStep, sideDest, sideDestUsed,
  } = useGameStore();
  const varDest = DEST_VARIABLE[sideDest] || DEST_VARIABLE.rest;

  // Map tutorial targets: 0=champBar 1=inventoryWrap 2=mapArea 3=combatProgress 4=bottomNav
  const hl = (step) => tutorialStep === step ? "tutorial-highlight" : "";

  const region = REGIONS[regionIdx];
  if (!player) return null;

  const resourceIcon = player.resource === "mana" ? "💧" : player.resource === "energy" ? "⚡" : player.resource === "fury" ? "🔥" : null;
  const hpPct = Math.round(player.hp / player.maxHp * 100);
  const mpPct = player.maxMp > 0 ? Math.round(player.mp / player.maxMp * 100) : 0;

  return (
    <div className={styles.screen}>

      {/* ── TOP: Champion status bar ─────────────────────────────────────── */}
      <div className={`${styles.champBar} ${hl(0)}`}>
        <div className={styles.champBarLeft}>
          {player.champion.iconUrl
            ? <img src={player.champion.iconUrl} alt={player.champion.name} className={styles.champIcon} onError={e => e.target.style.display="none"} />
            : <div className={styles.champIconFallback}>{player.champion.emoji}</div>
          }
          <div className={styles.champBarInfo}>
            <div className={styles.champBarName}>{player.champion.name}</div>
            <div className={styles.barsWrap}>
              <div className={styles.miniBarRow}>
                <span>❤️</span>
                <div className={styles.miniBarTrack}>
                  <div className={styles.miniBarFillHp} style={{ width: `${hpPct}%` }} />
                </div>
                <span className={styles.miniBarVal}>{Math.ceil(player.hp)}/{player.maxHp}</span>
              </div>
              {resourceIcon && (
                <div className={styles.miniBarRow}>
                  <span>{resourceIcon}</span>
                  <div className={styles.miniBarTrack}>
                    <div className={styles.miniBarFillMp} style={{ width: `${mpPct}%` }} />
                  </div>
                  <span className={styles.miniBarVal}>{player.mp}/{player.maxMp}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.champBarRight}>
          <div className={styles.goldBadge}>💰 {gold}</div>
          {bank > 0 && <div className={styles.bankBadge}>🏦 {bank}</div>}
          {winStreak >= 2 && <div className={styles.streakBadge}>🔥 ×{winStreak}</div>}
        </div>
      </div>

      {/* ── STATS ROW ───────────────────────────────────────────────────── */}
      <div className={styles.statsRow}>
        <StatChip label="AD" value={player.ad} icon="⚔️" />
        {player.ap > 0 && <StatChip label="AP" value={player.ap} icon="✨" />}
        <StatChip label="Armor" value={player.armor} icon="🛡️" />
        <StatChip label="MR" value={player.mr} icon="🔮" />
        <StatChip label="Kills" value={totalKills} icon="💀" />
      </div>

      {/* ── INVENTORY LoL-style ──────────────────────────────────────────── */}
      <div className={`${styles.inventoryWrap} ${hl(1)}`}>
        <div className={styles.inventorySlots}>
          {Array.from({ length: 6 }).map((_, i) => (
            <InventorySlot key={i} item={player.inventory?.[i]} index={i} />
          ))}
        </div>
        {player.inventory?.length === 0 && (
          <span className={styles.invEmpty}>No items yet</span>
        )}
        <InfoPanel className={styles.infoBtn} />
      </div>

      {/* ── MAP CENTER ──────────────────────────────────────────────────── */}
      <div className={`${styles.mapArea} ${hl(2)}`}>
        <RuneterraMap
          currentRegionId={region.id}
          nextRegionId={REGIONS[regionIdx + 1]?.id}
        />
      </div>

      {/* ── COMBAT PROGRESS ─────────────────────────────────────────────── */}
      <div className={`${styles.combatProgress} ${hl(3)}`}>
        <span className={styles.progressRegion}>{region.emoji} {region.name}</span>
        <div className={styles.progressDots}>
          {Array.from({ length: region.combatsPerRegion }).map((_, i) => (
            <span
              key={i}
              className={`${styles.progressDot} ${i < combatIndex ? styles.dotDone : i === combatIndex ? styles.dotCurrent : ""}`}
            />
          ))}
        </div>
        <span className={styles.progressLabel}>
          {region.combatsPerRegion - combatIndex} left
        </span>
      </div>

      {/* ── BOTTOM NAV ──────────────────────────────────────────────────── */}
      <nav className={`${styles.bottomNav} ${hl(4)}`}>
        {/* Left: variable (rest or event) — usable once per combat cycle */}
        <button
          className={`${styles.navBtn} ${styles.navBtnSecondary} ${sideDestUsed ? styles.navBtnUsed : ""}`}
          onClick={() => chooseDestination(varDest.id)}
          disabled={sideDestUsed}
        >
          <NavIcon dest={varDest} big={false} />
          <span className={styles.navLabel}>{sideDestUsed ? "Usado" : varDest.label}</span>
        </button>

        {/* Center: combat (always) */}
        <button className={`${styles.navBtn} ${styles.navBtnCombat}`} onClick={() => chooseDestination("combat")}>
          <NavIcon dest={DEST_FIXED[0]} big />
          <span className={styles.navLabel}>Fight</span>
        </button>

        {/* Right: shop */}
        <button className={`${styles.navBtn} ${styles.navBtnSecondary}`} onClick={() => chooseDestination("shop")}>
          <NavIcon dest={DEST_FIXED[1]} big={false} />
          <span className={styles.navLabel}>Shop</span>
        </button>
      </nav>

      {/* ── ABILITY UNLOCK MODAL ─────────────────────────────────────────── */}
      {pendingUnlock && (
        <div className={styles.unlockOverlay}>
          <div className={styles.unlockModal}>
            <div className={styles.unlockTitle}>⬆️ Choose an Ability</div>
            <div className={styles.unlockDesc}>Select one ability to unlock:</div>
            <div className={styles.unlockOptions}>
              {pendingUnlock.map(key => {
                const ab = player.champion.abilities.find(a => a.key === key);
                if (!ab) return null;
                return (
                  <button key={key} className={styles.unlockOption} onClick={() => unlockAbility(key)}>
                    {player.champion.abilityImages?.[key]
                      ? <img src={player.champion.abilityImages[key]} alt={key} className={styles.unlockIcon} />
                      : <div className={`key-tag key-${key.toLowerCase()}`}>{key}</div>
                    }
                    <div className={styles.unlockAbName}>{ab.gameplayName}</div>
                    <div className={styles.unlockAbDesc}>{ab.description}</div>
                  </button>
                );
              })}
            </div>
            {Object.values(player.abilityUnlocked).some(v => v) && (
              <button className={styles.unlockSkip} onClick={dismissUnlock}>Unlock later</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NavIcon({ dest, big }) {
  if (dest.imgSrc) {
    return (
      <img
        src={dest.imgSrc}
        alt={dest.label}
        className={big ? styles.navIconImg : styles.navIconImgSm}
        onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "inline"; }}
      />
    );
  }
  return <span className={big ? styles.navIconBig : styles.navIcon}>{dest.icon}</span>;
}

function StatChip({ icon, label, value }) {
  return (
    <div className={styles.statChip}>
      <span className={styles.statChipIcon}>{icon}</span>
      <span className={styles.statChipValue}>{value}</span>
    </div>
  );
}
