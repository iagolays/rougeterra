/**
 * Combat/index.jsx — Mobile-first redesign
 * - Multiple enemies stacked
 * - Real enemy images from DDragon
 * - Ult charge bar
 * - Ability lock/unlock states
 * - Damage type colors in log
 */

import React, { useRef, useEffect } from "react";
import { useGameStore } from "../../store/gameStore";
import { StatBar, EffectBadges, InventorySlot } from "../UI";
import styles from "./Combat.module.css";
import { REGIONS } from "../../data/regions";
import { playSfx } from "../../game/sfx";

// Map enemy ids to DDragon champion names for splash art
const ENEMY_IMAGE_MAP = {
  demacia_guard:    "Garen",
  demacia_knight:   "Jarvan IV",
  demacia_mageseeker: "Lux",
  noxus_raider:     "Darius",
  noxus_executioner:"Draven",
  noxus_conquerer:  "Swain",
  noxus_general:    "Katarina",
  freljord_bear:    null,
  freljord_shaman:  "Lissandra",
  freljord_barbarian:"Tryndamere",
  freljord_anivia:  "Anivia",
  piltover_enforcer:"Vi",
  piltover_mech:    null,
  piltover_saboteur:"Jinx",
  piltover_jaeger:  null,
  shadow_specter:   "Nocturne",
  shadow_revenant:  "Mordekaiser",
  shadow_wraith:    "Thresh",
  shadow_lord:      "Hecarim",
  void_crawler:     "KhaZix",
  void_rift:        null,
  void_xer:         "RekSai",
  void_watcher:     "Belveth",
};

function getEnemyImageUrl(enemy) {
  const champId = ENEMY_IMAGE_MAP[enemy.id];
  if (champId) return `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${champId}_0.jpg`;
  return null;
}

export default function Combat() {
  const {
    player, gold, regionIdx,
    enemies, activeEnemyIdx, combatCtx, combatLog,
    useAbility, passTurn: storePassTurn, useConsumable,
    proceedAfterCombat, setActiveEnemy,
    unlockAbility, dismissUnlock, pendingUnlock,
    tutorialStep,
  } = useGameStore();

  // Combat tutorial targets: 5/6=enemyArea 7=playerPanel 8=controls 9=logWrap
  const hl = (...steps) => steps.includes(tutorialStep) ? "tutorial-highlight" : "";

  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [combatLog]);

  if (!player || !enemies.length || !combatCtx) return null;

  const region        = REGIONS[regionIdx];
  const isPlayerTurn  = combatCtx.turn === "player" && !combatCtx.over;
  const activeEnemy   = enemies[activeEnemyIdx] || enemies[0];
  const aliveEnemies  = enemies.filter(e => e.currentHp > 0);

  // Keys to display for unlock
  const unlockedKeys = Object.entries(player.abilityUnlocked || {}).filter(([,v]) => v).map(([k]) => k);
  const lockedKeys   = ["Q","W","E","R"].filter(k => !player.abilityUnlocked?.[k]);

  return (
    <div className={styles.screen}>

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerRegion}>{region?.emoji} {region?.name}</span>
          {aliveEnemies.length > 1 && <span className={styles.multiEnemyTag}>{aliveEnemies.length} enemies</span>}
        </div>
        <div className={styles.headerRight}>
          <span>❤️ {Math.ceil(player.hp)}/{player.maxHp}</span>
          <span>💰 {gold}</span>
        </div>
      </div>

      {/* ── ENEMY AREA ──────────────────────────────────────────────────── */}
      <div className={`${styles.enemyArea} ${hl(5, 6)}`}>
        {enemies.map((enemy, idx) => {
          const isActive = idx === activeEnemyIdx;
          const isDead   = enemy.currentHp <= 0;
          const imgUrl   = getEnemyImageUrl(enemy);
          const hpPct    = Math.max(0, enemy.currentHp / enemy.scaledStats.hp * 100);

          return (
            <div
              key={idx}
              className={`${styles.enemyCard} ${isActive ? styles.enemyActive : ""} ${isDead ? styles.enemyDead : ""}`}
              onClick={() => !isDead && setActiveEnemy(idx)}
            >
              {/* Enemy portrait */}
              <div className={styles.enemyPortraitWrap}>
                {imgUrl && !isDead ? (
                  <img src={imgUrl} alt={enemy.name} className={styles.enemyPortrait}
                    onError={e => { e.target.style.display="none"; e.target.nextSibling.style.display="flex"; }} />
                ) : null}
                <div className={styles.enemyPortraitFallback} style={{ display: (imgUrl && !isDead) ? "none" : "flex" }}>
                  <span style={{ fontSize: 36 }}>{enemy.emoji}</span>
                </div>
                {isDead && <div className={styles.deadOverlay}>💀</div>}
                {isActive && !isDead && <div className={styles.targetIndicator}>▼</div>}
                {enemy.isBoss && !isDead && <div className={styles.bossTag}>BOSS</div>}
              </div>

              {/* Enemy info */}
              <div className={styles.enemyInfo}>
                <div className={styles.enemyName}>{enemy.name}</div>
                <EffectBadges effects={[
                  ...(enemy.effects || []),
                  ...(isActive && (combatCtx.dariusMarks || 0) > 0
                    ? [{ type: "hemorrhage", dur: combatCtx.dariusMarkTurns, stacks: combatCtx.dariusMarks }]
                    : []),
                ]} />
                {!isDead && (
                  <>
                    <div className={styles.hpBarLabel}>{Math.max(0,enemy.currentHp)}/{enemy.scaledStats.hp}</div>
                    <div className={styles.hpBarTrack}>
                      <div className={styles.hpBarFill} style={{ width: `${hpPct}%`, background: hpPct < 25 ? "#E05050" : hpPct < 50 ? "#D4922A" : "#C04040" }} />
                    </div>
                    <div className={styles.enemyMiniStats}>
                      <span>⚔️ {enemy.scaledStats.ad}</span>
                      <span>🛡️ {enemy.scaledStats.armor}</span>
                      <span>🔮 {enemy.scaledStats.mr}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── PLAYER PANEL ────────────────────────────────────────────────── */}
      <div className={`${styles.playerPanel} ${hl(7)}`}>

        {/* Row: icon + name + effects */}
        <div className={styles.playerPanelTop}>
          <div className={styles.playerPanelLeft}>
            {player.champion.iconUrl
              ? <img src={player.champion.iconUrl} alt={player.champion.name} className={styles.playerIcon} onError={e=>e.target.style.display="none"} />
              : <span style={{fontSize:22}}>{player.champion.emoji}</span>
            }
            <div className={styles.playerName}>{player.champion.name}</div>
          </div>
          <EffectBadges effects={[
            ...(combatCtx.playerShield > 0   ? [{ type:"shield",  dur:"🛡️"+combatCtx.playerShield }] : []),
            ...(combatCtx.playerUndying > 0  ? [{ type:"undying", dur: combatCtx.playerUndying    }] : []),
            ...(combatCtx.playerEvade > 0    ? [{ type:"evade",   dur: combatCtx.playerEvade      }] : []),
            ...(combatCtx.playerExpose > 0   ? [{ type:"expose",  dur: combatCtx.playerExpose     }] : []),
          ]} />
        </div>

        {/* Full-width HP bar */}
        <StatBar current={player.hp} max={player.maxHp} type="hp" fullWidth />

        {/* Full-width resource bar */}
        {player.resource !== "none" && (
          <StatBar
            current={player.mp} max={player.maxMp}
            type={player.resource === "mana" ? "mp" : "energy"}
            fullWidth
          />
        )}

        {/* Ult charge bar */}
        <div className={styles.ultRow}>
          <span className={styles.ultLabel}>R</span>
          <div className={styles.ultTrack}>
            {Array.from({ length: player.ultChargeMax || 8 }).map((_, i) => (
              <div key={i} className={`${styles.ultPip} ${i < (player.ultCharge||0) ? styles.ultPipFull : ""}`} />
            ))}
          </div>
          <span className={styles.ultVal}>{player.ultCharge||0}/{player.ultChargeMax||8}</span>
        </div>

        {/* Inventory row */}
        <div className={styles.inventoryRow}>
          {Array.from({ length: 6 }).map((_, i) => (
            <InventorySlot key={i} item={player.inventory?.[i]} index={i} />
          ))}
        </div>

        {/* Consumables */}
        {player.consumables?.length > 0 && (
          <div className={styles.consumableRow}>
            {player.consumables.map((item, i) => {
              const isHealPotion = !!item.stats?.healNow;
              const blocked = !isPlayerTurn || (isHealPotion && combatCtx.healPotionUsed);
              const tipSuffix = isHealPotion && combatCtx.healPotionUsed ? "\n⛔ Already used a heal potion this combat" : "\nClick to use";
              const tip = `${item.name}\n${item.stats?.healNow ? `+${item.stats.healNow} HP` : ""}${item.stats?.manaRestore ? ` +${item.stats.manaRestore} ${player.resource}` : ""}${tipSuffix}`;
              return (
                <button
                  key={i}
                  className={`${styles.consumableSlot} ${blocked ? styles.consumableOff : ""}`}
                  onClick={() => !blocked && useConsumable(item)}
                  disabled={blocked}
                  data-tooltip={tip}
                >
                  {item.imageUrl
                    ? <img src={item.imageUrl} alt={item.name} className={styles.consumableImg} style={item.imageFilter ? { filter: item.imageFilter } : undefined} onError={e => e.target.style.display="none"} />
                    : <span className={styles.consumableEmoji}>🧪</span>
                  }
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── COMBAT LOG ──────────────────────────────────────────────────── */}
      <div className={`${styles.logWrap} ${hl(9)}`} ref={logRef}>
        {combatLog.map((entry, i) => {
          const dmgClass = entry.dmgType === "magic" ? styles.logMagic : entry.dmgType === "true" ? styles.logTrue : entry.dmgType === "physical" ? styles.logPhysical : "";
          return (
            <div key={i} className={`${styles.logLine} ${styles[`log_${(entry.type||"").replace("-","_")}`]} ${dmgClass}`}>
              <span dangerouslySetInnerHTML={{ __html: entry.text?.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/\*(.+?)\*/g,"<em>$1</em>") }} />
            </div>
          );
        })}
      </div>

      {/* ── ABILITY BAR ─────────────────────────────────────────────────── */}
      {!combatCtx.over && (
        <div className={`${styles.controls} ${hl(8)}`}>
          <div className={styles.turnLine}>
            {isPlayerTurn ? "⚔️ Your turn" : "⏳ Enemy turn…"}
            {isPlayerTurn && activeEnemy && <span className={styles.targetLine}> — targeting {activeEnemy.name}</span>}
          </div>
          <div className={styles.abilitiesBar}>
            {player.champion.abilities.map(ab => {
              const cd         = (player.abilityCooldowns || {})[ab.key] || 0;
              const unlocked   = player.abilityUnlocked?.[ab.key];
              const ultReady   = ab.key !== "R" || (player.ultCharge || 0) >= (player.ultChargeMax || 8);
              const noResource = ab.costType !== "none" && player.mp < ab.cost;
              const disabled   = !isPlayerTurn || cd > 0 || noResource || !unlocked || !ultReady;

              const costStr = ab.costType !== "none" ? `${ab.cost}${ab.costType==="mana"?"💧":ab.costType==="energy"?"⚡":"🔥"}` : "";
              const tooltip = `${ab.gameplayName}\n${ab.description}${costStr ? "\nCost: "+costStr : ""}${ab.cooldown > 0 ? "\nCD: "+ab.cooldown+" turns" : ""}`;

              return (
                <button
                  key={ab.key}
                  className={`${styles.abilityBtn} ${!unlocked ? styles.abilityLocked : ""} ${ab.key==="R" && !ultReady ? styles.abilityNotReady : ""} ${disabled ? styles.abilityDisabled : ""}`}
                  onClick={() => useAbility(ab.key)}
                  disabled={disabled && unlocked}
                  data-tooltip={tooltip}
                >
                  <div className={styles.abilityIconWrap}>
                    {player.champion.abilityImages?.[ab.key] ? (
                      <img src={player.champion.abilityImages[ab.key]} alt={ab.key} className={styles.abilityIcon}
                        onError={e => e.target.style.display="none"} />
                    ) : (
                      <div className={`key-tag key-${ab.key.toLowerCase()}`}>{ab.key}</div>
                    )}
                    {cd > 0   && <div className={styles.cdOverlay}>{cd}</div>}
                    {!unlocked && <div className={styles.lockOverlay}>🔒</div>}
                    {ab.key==="R" && unlocked && !ultReady && <div className={styles.chargeOverlay}>{player.ultCharge||0}/{player.ultChargeMax||8}</div>}
                  </div>
                  <span className={styles.abilityKey}>{ab.key}</span>
                  {costStr && <span className={styles.abilityCost}>{costStr}</span>}
                </button>
              );
            })}
            <button className={styles.passBtn} onClick={storePassTurn} disabled={!isPlayerTurn}>
              ⏭
              <span className={styles.passBtnLabel}>Pass</span>
            </button>
          </div>
        </div>
      )}

      {/* ── VICTORY / CONTINUE ──────────────────────────────────────────── */}
      {combatCtx.over && combatCtx.result === "victory" && (
        <div className={styles.victoryBar}>
          <span>🏆 Victory!</span>
          <button className="btn btn-gold" onClick={proceedAfterCombat}>Continue →</button>
        </div>
      )}

      {/* ── ABILITY UNLOCK MODAL ─────────────────────────────────────────── */}
      {pendingUnlock && (
        <div className={styles.unlockOverlay}>
          <div className={styles.unlockModal}>
            <div className={styles.unlockTitle}>⬆️ Level Up!</div>
            <div className={styles.unlockDesc}>Choose an ability to unlock:</div>
            <div className={styles.unlockOptions}>
              {pendingUnlock.map(key => {
                const ab = player.champion.abilities.find(a => a.key === key);
                if (!ab) return null;
                return (
                  <button
                    key={key}
                    className={styles.unlockOption}
                    onMouseDown={() => playSfx("levelup_click", 0.6)}
                    onMouseUp={() => playSfx("levelup_release", 0.6)}
                    onClick={() => unlockAbility(key)}
                  >
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
            <button className={styles.unlockSkip} onClick={dismissUnlock}>Unlock later</button>
          </div>
        </div>
      )}
    </div>
  );
}
