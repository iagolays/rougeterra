/**
 * UI/index.jsx — Shared reusable components
 */

import React from "react";
import styles from "./UI.module.css";

// ─── STAT BAR ─────────────────────────────────────────────────────────────────
export function StatBar({ current, max, type = "hp", label, showValues = true, fullWidth = false }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  const fillClass = type === "hp" ? "bar-hp" : type === "energy" ? "bar-energy" : "bar-mp";
  const lowHp = type === "hp" && pct < 25;

  if (fullWidth) {
    return (
      <div className={styles.statBarFullWrap}>
        <div className={styles.statBarFullTrack}>
          <div
            className={`${styles.statBarFullFill} ${fillClass} ${lowHp ? styles.barLow : ""}`}
            style={{ width: `${pct}%` }}
          />
          {showValues && (
            <span className={styles.statBarFullOverlay}>
              {Math.ceil(current)}/{max}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.statBarWrap}>
      {label && (
        <div className={styles.statBarLabel}>
          <span>{label}</span>
          {showValues && (
            <span className={styles.statBarValues}>
              {Math.ceil(current)}/{max}
            </span>
          )}
        </div>
      )}
      <div className="bar-track">
        <div
          className={`bar-fill ${fillClass} ${lowHp ? styles.barLow : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── ABILITY BUTTON ────────────────────────────────────────────────────────────
export function AbilityButton({ ability, cooldown, resourceCurrent, disabled, onClick, abilityImageUrl }) {
  const key = ability.key.toLowerCase();
  const onCooldown = cooldown > 0;
  const noResource = ability.costType !== "none" && resourceCurrent < ability.cost;
  const isDisabled = disabled || onCooldown || noResource;

  // Build tooltip text
  const costStr = ability.costType !== "none"
    ? `Cost: ${ability.cost} ${ability.costType}`
    : "No resource cost";
  const cdStr = ability.cooldown > 0 ? `Cooldown: ${ability.cooldown} turns` : "No cooldown";
  const tooltip = `${ability.gameplayName}\n${ability.description}\n${costStr} · ${cdStr}`;

  const dmgPreview = (() => {
    // This is just a label, actual calc is in combat engine
    if (ability.damageType === "none") return ability.effect || "Utility";
    if (ability.damageType === "adMult") return `~${ability.adMult}x AD`;
    if (ability.damageType === "apMult") return `~${ability.apMult}x AP`;
    if (ability.damageType === "mixed") return `AD + AP`;
    if (ability.damageType === "execute") return "Execute";
    if (ability.damageType === "trueDmg") return "True Dmg";
    if (ability.damageType === "flat") return `${ability.flatDmg || "?"}`;
    return "";
  })();

  return (
    <button
      className={`${styles.abilityBtn} ${styles[`key${ability.key}`]} ${isDisabled ? styles.disabled : ""}`}
      onClick={() => !isDisabled && onClick(ability.key)}
      disabled={isDisabled}
      data-tooltip={tooltip}
      aria-label={ability.gameplayName}
    >
      <div className={styles.abilityBtnInner}>
        {abilityImageUrl ? (
          <img
            src={abilityImageUrl}
            alt={ability.gameplayName}
            className={styles.abilityIcon}
            onError={e => { e.target.style.display = "none"; }}
          />
        ) : (
          <div className={`key-tag key-${key}`}>{ability.key}</div>
        )}
        {onCooldown && (
          <div className={styles.cooldownOverlay}>{cooldown}</div>
        )}
      </div>
      <div className={styles.abilityBtnName}>{ability.gameplayName}</div>
      <div className={styles.abilityBtnMeta}>
        {ability.costType !== "none" && (
          <span className={styles.costBadge}>
            {ability.cost} {ability.costType === "mana" ? "💧" : ability.costType === "energy" ? "⚡" : "🔥"}
          </span>
        )}
        <span className={styles.dmgPreview}>{dmgPreview}</span>
      </div>
    </button>
  );
}

// ─── ITEM CARD ─────────────────────────────────────────────────────────────────
const STAT_META = {
  hp:             { label: "HP",      color: "#C04040" },
  ad:             { label: "AD",      color: "#C89B3C" },
  ap:             { label: "AP",      color: "#7B9FD4" },
  armor:          { label: "Armor",   color: "#C8A030" },
  mr:             { label: "MR",      color: "#7B5EA7" },
  critChance:     { label: "Crit",    color: "#E8C060" },
  attackSpeedPct: { label: "Vel. At", color: "#70C080" },
  lifeSteal:      { label: "Robo V",  color: "#C04040" },
  moveSpeed:      { label: "Vel. M",  color: "#80B4C8" },
  magicPen:       { label: "Pen. M",  color: "#9B70C8" },
  armorPen:       { label: "Pen. F",  color: "#D4882A" },
  hpRegen5:       { label: "Regen",   color: "#80C840" },
  manaRestore:    { label: "Maná",    color: "#5090E0" },
  healNow:        { label: "Cura",    color: "#C04040" },
};

function formatStatValue(key, v) {
  if (key === "critChance" || key === "attackSpeedPct" || key === "lifeSteal")
    return `+${Math.round(v * 100)}%`;
  return `+${v}`;
}

export function ItemCard({ item, onBuy, canAfford = true, showCost = true, size = "md", selected = false, onClick }) {
  if (!item) return null;

  const visibleStats = Object.entries(item.stats || {})
    .filter(([k, v]) => v !== 0 && STAT_META[k])
    .map(([k, v]) => ({ key: k, value: formatStatValue(k, v), ...STAT_META[k] }));

  const tooltipStats = Object.entries(item.stats || {})
    .filter(([, v]) => v !== 0)
    .map(([k, v]) => {
      const meta = STAT_META[k];
      return `${formatStatValue(k, v)} ${meta?.label || k}`;
    }).join("  ·  ");

  const tooltip = `${item.name}\n${item.plaintext || item.description || ""}${tooltipStats ? "\n" + tooltipStats : ""}`;

  return (
    <div
      className={`${styles.itemCard} ${styles[`itemCard_${size}`]} ${!canAfford ? styles.cantAfford : ""} ${selected ? styles.selected : ""}`}
      onClick={onClick || (onBuy ? () => onBuy(item) : undefined)}
      data-tooltip={tooltip}
    >
      <div className={styles.itemImgWrap}>
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className={styles.itemImg}
            style={item.imageFilter ? { filter: item.imageFilter } : undefined}
            onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
          />
        ) : null}
        <div className={styles.itemImgFallback} style={{ display: item.imageUrl ? "none" : "flex" }}>
          🗡️
        </div>
      </div>
      <div className={styles.itemCardBody}>
        <div className={styles.itemName}>{item.name}</div>
        {showCost && (
          <div className={styles.itemCost}>
            <span className="text-gold">💰 {item.gold.total}</span>
            {!canAfford && <span className={styles.cantAffordLabel}> No hay oro</span>}
          </div>
        )}
        {visibleStats.length > 0 && (
          <div className={styles.statTags}>
            {visibleStats.map(s => (
              <span key={s.key} className={styles.statTag} style={{ color: s.color }}>
                {s.value} {s.label}
              </span>
            ))}
          </div>
        )}
        {item.consumable && item.plaintext && (
          <div className={styles.itemDesc}>{item.plaintext}</div>
        )}
      </div>
    </div>
  );
}

// ─── INVENTORY SLOT ────────────────────────────────────────────────────────────
export function InventorySlot({ item, index }) {
  if (!item) {
    return <div className={`${styles.invSlot} ${styles.invEmpty}`}>·</div>;
  }

  const statLines = Object.entries(item.stats || {})
    .map(([k, v]) => {
      const f = typeof v === "number" && v < 1 && v > 0 ? `+${Math.round(v*100)}%` : `+${v}`;
      const labels = { hp:"HP", ad:"AD", ap:"AP", armor:"Armor", mr:"MR", critChance:"Crit", attackSpeedPct:"AS", burn:"Burn", burnAura:"Aura", hpRegen5:"Regen" };
      return `${f} ${labels[k] || k}`;
    }).join("\n");
  const tooltip = `${item.name}\n${statLines}`;

  return (
    <div className={styles.invSlot} data-tooltip={tooltip}>
      {item.imageUrl && (
        <img src={item.imageUrl} alt={item.name} className={styles.invImg}
          onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "block"; }} />
      )}
      <span className={styles.invEmoji} style={{ display: "none" }}>🗡️</span>
    </div>
  );
}

// ─── GAME HEADER ───────────────────────────────────────────────────────────────
export function GameHeader({ player, gold, bank, regionName, rightContent }) {
  if (!player) return null;

  const resourceIcon = player.resource === "mana" ? "💧"
    : player.resource === "energy" ? "⚡"
    : player.resource === "fury" ? "🔥"
    : null;

  return (
    <header className="game-header">
      <span className={styles.headerLogo}>⚔ RUNETERRA</span>
      <div className={styles.headerStats}>
        <div className={styles.hstat}>
          <span className={styles.hstatLabel}>❤️</span>
          <span className={styles.hstatValue}>{Math.ceil(player.hp)}/{player.maxHp}</span>
        </div>
        {resourceIcon && (
          <div className={styles.hstat}>
            <span className={styles.hstatLabel}>{resourceIcon}</span>
            <span className={styles.hstatValue}>{player.mp}/{player.maxMp}</span>
          </div>
        )}
        <div className={styles.hstat}>
          <span className={styles.hstatLabel}>💰</span>
          <span className={styles.hstatValue}>{gold}</span>
        </div>
        {bank > 0 && (
          <div className={styles.hstat}>
            <span className={styles.hstatLabel}>🏦</span>
            <span className={styles.hstatValue}>{bank}</span>
          </div>
        )}
        {regionName && (
          <div className={styles.hstat}>
            <span className={styles.hstatLabel}>🗺️</span>
            <span className={styles.hstatValue}>{regionName}</span>
          </div>
        )}
      </div>
      {rightContent && <div>{rightContent}</div>}
    </header>
  );
}

// ─── EFFECT BADGES ─────────────────────────────────────────────────────────────
export function EffectBadges({ effects = [] }) {
  if (!effects.length) return null;
  const labels = {
    stun: ["⚡", "Stunned"],
    root: ["🌿", "Rooted"],
    slow: ["🐢", "Slowed"],
    silence: ["🔇", "Silenced"],
    bleed: ["🩸", "Bleeding"],
    undying: ["☠️", "Undying"],
    evade: ["💨", "Evasion"],
    expose: ["🎯", "Exposed"],
    debuffAD: ["⬇️", "AD↓"],
    selfBuffAD: ["⬆️", "AD↑"],
  };
  return (
    <div className={styles.effectRow}>
      {effects.map((e, i) => {
        const [icon, name] = labels[e.type] || ["?", e.type];
        return (
          <span key={i} className={`badge ${styles.effectBadge} effect-${e.type}`}>
            {icon} {name} {e.dur}t
          </span>
        );
      })}
    </div>
  );
}

// ─── SECTION LABEL ────────────────────────────────────────────────────────────
export function SectionLabel({ children }) {
  return <div className={styles.sectionLabel}>{children}</div>;
}

// ─── LOADING SCREEN ────────────────────────────────────────────────────────────
export function LoadingScreen({ error }) {
  return (
    <div className={styles.loadingScreen}>
      <div className={styles.loadingInner}>
        <div className={styles.loadingLogo}>⚔</div>
        <div className={styles.loadingTitle}>RUNETERRA ROGUELIKE</div>
        {error ? (
          <>
            <div className={styles.loadingError}>
              ⚠️ Data files not found.
            </div>
            <div className={styles.loadingHint}>
              Run <code>npm run fetch-data</code> to download champion and item data from Data Dragon.
              <br /><br />
              Requires Python 3 and internet connection.
            </div>
          </>
        ) : (
          <div className={styles.loadingSpinner}>Loading data from Data Dragon…</div>
        )}
      </div>
    </div>
  );
}
