import React, { useState, useRef } from "react";
import { useGameStore } from "../../store/gameStore";
import styles from "./ChampionSelect.module.css";

const RESOURCE_LABELS = {
  mana:   { label: "Mana",   icon: "💧", color: "var(--mp-light)" },
  energy: { label: "Energy", icon: "⚡", color: "var(--energy)" },
  fury:   { label: "Fury",   icon: "🔥", color: "#FF8A8A" },
  none:   { label: "None",   icon: "—",  color: "var(--text-dim)" },
};

export default function ChampionSelect() {
  const { champPool, selectChampion, dataError } = useGameStore();
  const [currentIdx, setCurrentIdx] = useState(0);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const mouseStartX = useRef(null);
  const isDragging  = useRef(false);

  if (dataError) {
    return (
      <div className={styles.errorScreen}>
        <div className={styles.errorIcon}>⚠️</div>
        <h2 className={styles.errorTitle}>Data Not Found</h2>
        <p className={styles.errorText}>
          Champion and item data files are missing. Run the data fetcher first:
        </p>
        <code className={styles.errorCode}>npm run fetch-data</code>
        <p className={styles.errorHint}>
          This script downloads all assets from Riot's Data Dragon CDN.
          It requires Python 3 and an internet connection.
        </p>
      </div>
    );
  }

  if (!champPool.length) {
    return (
      <div className={styles.errorScreen}>
        <div className={styles.errorText}>No champions loaded. Run <code>npm run fetch-data</code>.</div>
      </div>
    );
  }

  const total   = champPool.length;
  const champion = champPool[currentIdx];

  function goTo(idx) {
    setCurrentIdx(Math.max(0, Math.min(total - 1, idx)));
  }

  // Touch handlers
  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }
  function onTouchEnd(e) {
    if (touchStartX.current === null) return;
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = Math.abs(touchStartY.current - e.changedTouches[0].clientY);
    if (Math.abs(dx) > 40 && Math.abs(dx) > dy) {
      if (dx > 0) goTo(currentIdx + 1);
      else         goTo(currentIdx - 1);
    }
    touchStartX.current = null;
  }

  // Mouse drag handlers (desktop)
  function onMouseDown(e) {
    isDragging.current = true;
    mouseStartX.current = e.clientX;
  }
  function onMouseUp(e) {
    if (!isDragging.current) return;
    isDragging.current = false;
    const dx = mouseStartX.current - e.clientX;
    if (Math.abs(dx) > 40) {
      if (dx > 0) goTo(currentIdx + 1);
      else         goTo(currentIdx - 1);
    }
  }
  function onMouseLeave() { isDragging.current = false; }

  // Carousel offset: center the active card
  // Card width = 84vw, gap = 16px → offset = (100vw - 84vw) / 2 = 8vw
  const trackTransform = `translateX(calc(8vw - ${currentIdx} * (84vw + 16px)))`;

  return (
    <div className={`${styles.screen} screen-enter`}>

      {/* ── HEADER ── */}
      <div className={styles.header}>
        <h1 className={styles.title}>CHAMP SELECT</h1>
        <p className={styles.subtitle}>Pickea tu champ y lanzate a lo desconocido.</p>
      </div>

      {/* ── CAROUSEL ── */}
      <div
        className={styles.carouselWrap}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
      >
        <div className={styles.carouselTrack} style={{ transform: trackTransform }}>
          {champPool.map((champ, idx) => (
            <div
              key={champ.id}
              className={`${styles.slide} ${idx === currentIdx ? styles.slideActive : ""}`}
              onClick={() => idx !== currentIdx && goTo(idx)}
            >
              <ChampCard champion={champ} />
            </div>
          ))}
        </div>

        {/* Arrow hints (desktop) */}
        {currentIdx > 0 && (
          <button className={`${styles.arrow} ${styles.arrowLeft}`} onClick={() => goTo(currentIdx - 1)}>‹</button>
        )}
        {currentIdx < total - 1 && (
          <button className={`${styles.arrow} ${styles.arrowRight}`} onClick={() => goTo(currentIdx + 1)}>›</button>
        )}
      </div>

      {/* ── DOTS ── */}
      <div className={styles.dots}>
        {champPool.map((_, i) => (
          <button
            key={i}
            className={`${styles.dot} ${i === currentIdx ? styles.dotActive : ""}`}
            onClick={() => goTo(i)}
          />
        ))}
      </div>

      {/* ── FOOTER ── */}
      <div className={styles.footer}>
        <button className="btn btn-gold" onClick={() => selectChampion(champion)}>
          Begin Adventure →
        </button>
      </div>
    </div>
  );
}

// ─── CARD ─────────────────────────────────────────────────────────────────────

function ChampCard({ champion }) {
  const [activeTab, setActiveTab] = useState("abilities");
  const res = RESOURCE_LABELS[champion.resource] || RESOURCE_LABELS.none;

  return (
    <div className={styles.champCard}>
      {/* Splash */}
      <div className={styles.splashWrap}>
        {champion.loadingUrl ? (
          <img
            src={champion.loadingUrl}
            alt={champion.name}
            className={styles.splashImg}
            onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
          />
        ) : null}
        <div className={styles.splashFallback} style={{ display: champion.loadingUrl ? "none" : "flex" }}>
          <span style={{ fontSize: 72 }}>{champion.emoji}</span>
        </div>
        <div className={`badge badge-${champion.type} ${styles.typeBadgeOverlay}`}>
          {champion.type === "melee" ? "⚔ Melee" : "🏹 Ranged"}
        </div>
        <div className={styles.splashGradient} />
        <div className={styles.splashNameBlock}>
          <div className={styles.champName}>{champion.name}</div>
          <div className={styles.champTitle}>{champion.title}</div>
        </div>
      </div>

      {/* Info */}
      <div className={styles.champInfo}>
        <div className={styles.resourceRow} style={{ color: res.color }}>
          <span>{res.icon}</span>
          <span>{res.label}</span>
        </div>

        <div className={styles.baseStats}>
          <StatPill icon="❤️" value={champion.stats.hp}        label="HP"    />
          <StatPill icon="⚔️" value={champion.stats.ad}        label="AD"    />
          {champion.apBase > 0 && <StatPill icon="✨" value={champion.apBase} label="AP" />}
          <StatPill icon="🛡️" value={champion.stats.armor}     label="Armor" />
          <StatPill icon="💨" value={champion.stats.moveSpeed} label="MS"    />
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "abilities" ? styles.tabActive : ""}`}
            onClick={e => { e.stopPropagation(); setActiveTab("abilities"); }}
          >Abilities</button>
          <button
            className={`${styles.tab} ${activeTab === "lore" ? styles.tabActive : ""}`}
            onClick={e => { e.stopPropagation(); setActiveTab("lore"); }}
          >Lore</button>
        </div>

        <div className={styles.tabContent}>
          {activeTab === "abilities" && (
            <div className={styles.abilitiesList}>
              {champion.abilities.map(ab => (
                <AbilityRow key={ab.key} ability={ab} imageUrl={champion.abilityImages?.[ab.key]} />
              ))}
            </div>
          )}
          {activeTab === "lore" && (
            <p className={styles.loreText}>{champion.lore}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatPill({ icon, value, label }) {
  return (
    <div className={styles.statPill} title={label}>
      <span>{icon}</span>
      <span className={styles.statPillValue}>{value}</span>
    </div>
  );
}

function AbilityRow({ ability, imageUrl }) {
  const costStr = ability.costType !== "none" ? `${ability.cost} ${ability.costType}` : "No cost";
  return (
    <div className={styles.abilityRow} data-tooltip={`${ability.gameplayName}\n${ability.description}\n${costStr}`}>
      <div className={styles.abilityRowLeft}>
        {imageUrl ? (
          <img src={imageUrl} alt={ability.key} className={styles.abilityRowIcon}
            onError={e => { e.target.style.display = "none"; }} />
        ) : (
          <div className={`key-tag key-${ability.key.toLowerCase()}`}>{ability.key}</div>
        )}
        <div>
          <div className={styles.abilityRowName}>{ability.gameplayName}</div>
          <div className={styles.abilityRowDesc}>{ability.description}</div>
        </div>
      </div>
      {ability.costType !== "none" && (
        <div className={styles.abilityRowCost}>
          {ability.cost}
          {ability.costType === "mana" ? " 💧" : ability.costType === "energy" ? " ⚡" : " 🔥"}
        </div>
      )}
    </div>
  );
}
