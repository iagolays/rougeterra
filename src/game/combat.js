/**
 * combat.js — Pure combat engine
 * 
 * NEW: computeItemSynergies(), damage type tagging in log ({dmgType: 'physical'|'magic'|'true'})
 */

// ─── DAMAGE CALCULATION ────────────────────────────────────────────────────────
export function calculatePhysicalDamage(rawAD, targetArmor, armorPenFlat = 0, armorPenPct = 0) {
  const effectiveArmor = Math.max(0, targetArmor * (1 - armorPenPct) - armorPenFlat);
  return Math.max(1, Math.round(rawAD * 100 / (100 + effectiveArmor)));
}

export function calculateMagicDamage(rawAP, targetMR, magicPenFlat = 0, magicPenPct = 0) {
  const effectiveMR = Math.max(0, targetMR * (1 - magicPenPct) - magicPenFlat);
  return Math.max(1, Math.round(rawAP * 100 / (100 + effectiveMR)));
}

// ─── ITEM SYNERGIES ────────────────────────────────────────────────────────────
/**
 * computeItemSynergies(inventory)
 * Returns bonus multipliers from item combinations.
 *
 * Synergies:
 *  - Rabadon (id 3089) → AP * 1.35 bonus (instead of flat)
 *  - Infinity Edge (id 3031) + any crit item → crit damage x2.1
 *  - Warmog (id 3083) + any HP item → regen scales with missing HP
 *  - Liandry (id 3135) + any AP item → burn = 8% instead of 6%
 *  - Black Cleaver (id 3071) + any AD item → armorPen +15 bonus
 */
export function computeItemSynergies(inventory) {
  const ids = inventory.map(i => i.id);
  const synergies = {};

  // Rabadon: +35% AP if you have other AP items
  const hasRabadon = ids.includes(3089);
  const apItems = inventory.filter(i => i.id !== 3089 && (i.stats?.ap || 0) > 0);
  if (hasRabadon && apItems.length > 0) {
    synergies.rabadonsAPBoost = 0.35;
  }

  // Infinity Edge: crit multiplier boosted if 2+ crit items
  const critItems = inventory.filter(i => (i.stats?.critChance || 0) > 0);
  if (ids.includes(3031) && critItems.length >= 2) {
    synergies.infinityEdgeCritBoost = true; // crits deal 2.1x instead of 1.75x
  }

  // Liandry + another AP item → stronger burn
  const hasLiandry = ids.includes(3135);
  if (hasLiandry && apItems.length > 0) {
    synergies.liandryBurnBoost = 0.02; // +2% burn (total 8%)
  }

  // Black Cleaver + another AD item → extra armor pen
  const hasBC = ids.includes(3071);
  const adItems = inventory.filter(i => i.id !== 3071 && (i.stats?.ad || 0) > 0);
  if (hasBC && adItems.length > 0) {
    synergies.bcArmorPenBonus = 15;
  }

  // Warmog + 400+ bonus HP → passive regen 4% per turn instead of 2%
  const hasWarmog = ids.includes(3083);
  const totalBonusHP = inventory.reduce((sum, i) => sum + (i.stats?.hp || 0), 0);
  if (hasWarmog && totalBonusHP >= 400) {
    synergies.warmogRegenBoost = true; // 4% instead of 2%
  }

  return synergies;
}

// ─── ABILITY DAMAGE RESOLUTION ─────────────────────────────────────────────────
export function resolveAbilityDamage(ability, player, combatCtx, target) {
  const { ad, ap, armor: _pa, mr: _pm } = player;
  const { armor: targetArmor, mr: targetMr } = target;

  const armorPenFlat  = (player.itemStats?.armorPen || 0) + (player.itemSynergies?.bcArmorPenBonus || 0);
  const armorPenPct   = player.itemStats?.armorPenPct || 0;
  const magicPenFlat  = player.itemStats?.magicPen    || 0;
  const critChance    = player.itemStats?.critChance  || 0;
  // Attack speed → bonus physical damage (faster attacks = more hits per turn)
  const atkSpeedBonus = 1 + (player.itemStats?.attackSpeedPct || 0) * 0.5;

  // Rabadon synergy: boost effective AP
  const effectiveAP = ap * (1 + (player.itemSynergies?.rabadonsAPBoost || 0));

  // Infinity Edge synergy: stronger crits
  const critMultiplier = player.itemSynergies?.infinityEdgeCritBoost ? 2.1 : 1.75;

  const hits = ability.hits || 1;
  let physical = 0, magic = 0, trueDmg = 0;

  const computeOnce = () => {
    let p = 0, m = 0, t = 0;
    switch (ability.damageType) {
      case "adMult":
        p = calculatePhysicalDamage(ad * ability.adMult * atkSpeedBonus, targetArmor, armorPenFlat, ability.armorPen ?? armorPenPct);
        break;
      case "apMult":
        m = calculateMagicDamage(effectiveAP * ability.apMult, targetMr, magicPenFlat);
        break;
      case "mixed":
        p = calculatePhysicalDamage(ad * (ability.adMult || 0) * atkSpeedBonus, targetArmor, armorPenFlat, armorPenPct);
        m = calculateMagicDamage(effectiveAP * (ability.apMult || 0), targetMr, magicPenFlat);
        break;
      case "flat":
        m = ability.flatDmg || 0;
        break;
      case "execute": {
        const missingHpPct = 1 - target.currentHp / target.scaledStats.hp;
        const mult = (ability.baseExecuteMult || 2.5) + (ability.executeBonus || 0) * missingHpPct;
        p = calculatePhysicalDamage(ad * mult * atkSpeedBonus, targetArmor, armorPenFlat, armorPenPct);
        break;
      }
      case "trueDmg":
        t = Math.round(ad * (ability.adMult || 1));
        if (ability.missingHpPct) t += Math.round((target.scaledStats.hp - target.currentHp) * ability.missingHpPct);
        break;
      default: break;
    }

    // Crit
    if ((p + m) > 0 && critChance > 0 && Math.random() < critChance) {
      p = Math.round(p * critMultiplier);
      m = Math.round(m * critMultiplier);
    }

    // Expose bonus (+30%)
    if (combatCtx.playerExpose > 0) {
      p = Math.round(p * 1.3);
      m = Math.round(m * 1.3);
      t = Math.round(t * 1.3);
    }

    return { p, m, t };
  };

  for (let i = 0; i < hits; i++) {
    const { p, m, t } = computeOnce();
    physical += p; magic += m; trueDmg += t;
  }

  return { physical, magic, true: trueDmg, total: physical + magic + trueDmg };
}

// ─── APPLY PLAYER ABILITY ──────────────────────────────────────────────────────
export function applyPlayerAbility(ability, playerState, combatCtx, enemyState) {
  let player = { ...playerState };
  let combat = { ...combatCtx };
  let enemy  = { ...enemyState, effects: [...(enemyState.effects || [])] };
  const logEntries = [];

  const { damageType, effect, cost, costType, cooldown, key } = ability;

  // Spend resource
  if (costType !== "none" && player.mp >= cost) player = { ...player, mp: player.mp - cost };

  // Set cooldown
  const newCDs = { ...(player.abilityCooldowns || {}) };
  if (cooldown > 0) newCDs[key] = cooldown;
  player = { ...player, abilityCooldowns: newCDs };

  // Damage
  let dmgResult = { physical: 0, magic: 0, true: 0, total: 0 };
  if (damageType && damageType !== "none") {
    dmgResult = resolveAbilityDamage(ability, player, combat, {
      currentHp: enemy.currentHp,
      scaledStats: enemy.scaledStats,
      armor: enemy.scaledStats.armor,
      mr:    enemy.scaledStats.mr,
    });
    enemy = { ...enemy, currentHp: enemy.currentHp - dmgResult.total };

    const dmgType = dmgResult.true > 0 ? "true" : dmgResult.magic > dmgResult.physical ? "magic" : "physical";
    const dmgColor = dmgType === "true" ? "⬜" : dmgType === "magic" ? "🔵" : "🔴";
    logEntries.push({
      type: "player-action",
      dmgType,
      text: `${player.champion.emoji} **${player.champion.name}** — *${ability.gameplayName}* ${dmgColor} **${dmgResult.total}** ${dmgType} dmg`,
    });

    // Life steal — heal for % of physical damage dealt
    const lifeSteal = player.itemStats?.lifeSteal || 0;
    if (lifeSteal > 0 && dmgResult.physical > 0 && player.hp < player.maxHp) {
      const healed = Math.round(dmgResult.physical * lifeSteal);
      if (healed > 0) {
        player = { ...player, hp: Math.min(player.maxHp, player.hp + healed) };
        logEntries.push({ type: "system", text: `🩸 Robo de vida +${healed} HP` });
      }
    }

    if (combat.playerExpose > 0) combat = { ...combat, playerExpose: combat.playerExpose - 1 };
  } else {
    logEntries.push({ type: "player-action", text: `${player.champion.emoji} **${player.champion.name}** — *${ability.gameplayName}*` });
  }

  // Player effects (healing, shields, buffs)
  if (effect === "selfHeal") {
    const h = (ability.healBase || 0) + Math.round(player.ad * (ability.healADMult || 0)) + (ability.healFlat || 0);
    player = { ...player, hp: Math.min(player.maxHp, player.hp + h) };
    logEntries.push({ type: "system", text: `❤️ Healed ${h} HP` });
  }
  if (effect === "selfHealAD") {
    const h = Math.round(player.ad * (ability.selfHealADMult || 0));
    player = { ...player, hp: Math.min(player.maxHp, player.hp + h) };
    logEntries.push({ type: "system", text: `❤️ Healed ${h} HP` });
  }
  if (effect === "shield") {
    const shieldAmt = (ability.shieldBase || 0)
      + Math.round(player.ad    * (ability.shieldADMult    || 0))
      + Math.round(player.ap    * (ability.shieldAPMult    || 0))
      + Math.round(player.armor * (ability.shieldArmorMult || 0));
    combat = { ...combat, playerShield: (combat.playerShield || 0) + shieldAmt };
    logEntries.push({ type: "system", text: `🛡️ Shield +${shieldAmt}` });
  }
  if (effect === "undying")       { combat = { ...combat, playerUndying: ability.effectDur || 2 }; logEntries.push({ type: "system", text: `☠️ **Undying Rage** — cannot die for ${ability.effectDur} turns!` }); }
  if (effect === "evade")         { combat = { ...combat, playerEvade: ability.effectDur || 2, playerEvadeChance: ability.evadeChance || 0.4 }; logEntries.push({ type: "system", text: `💨 Evasion (${Math.round((ability.evadeChance||0.4)*100)}%) for ${ability.effectDur} turns` }); }
  if (effect === "expose")        { combat = { ...combat, playerExpose: ability.effectDur || 2 }; logEntries.push({ type: "system", text: `🎯 Exposed — next ${ability.effectDur} attacks +30% damage` }); }
  if (effect === "absorbNextHit") { combat = { ...combat, playerAbsorbNext: true }; logEntries.push({ type: "system", text: `🌬️ Wind Wall — next attack blocked` }); }
  if (effect === "absorbAndCounter") { combat = { ...combat, playerRiposte: { counterMult: ability.counterMult || 0.6 } }; logEntries.push({ type: "system", text: `🤺 Riposte ready` }); }

  // Yasuo stack
  if (ability.stackEffect) {
    const { stacks, stackKey, effect: se, effectDur } = ability.stackEffect;
    const cur = (combat[stackKey] || 0) + 1;
    if (cur >= stacks) {
      combat = { ...combat, [stackKey]: 0 };
      enemy = { ...enemy, effects: [...enemy.effects, { type: se, dur: effectDur }] };
      logEntries.push({ type: "system", text: `🌪️ Whirlwind! ${se} for ${effectDur} turns` });
    } else {
      combat = { ...combat, [stackKey]: cur };
      logEntries.push({ type: "system", text: `🌪️ Steel Tempest: ${cur}/${stacks}` });
    }
  }

  // Enemy CC/debuffs
  const ccEffects = ["stun", "root", "slow", "silence", "bleed"];
  if (ccEffects.includes(effect)) {
    const newEff = { type: effect, dur: ability.effectDur || 1 };
    if (effect === "bleed") newEff.val = ability.effectVal || 20;
    enemy = { ...enemy, effects: [...enemy.effects, newEff] };
    const labels = { stun:"⚡ Stunned", root:"🌿 Rooted", slow:"🐢 Slowed", silence:"🔇 Silenced", bleed:`🩸 Bleeding (${newEff.val}/turn)` };
    logEntries.push({ type: "system", text: `${labels[effect]} for ${ability.effectDur} turns` });
  }
  if (effect === "debuffAD") {
    const r = Math.round(enemy.scaledStats.ad * (ability.debuffPct || 0.15));
    enemy = { ...enemy, scaledStats: { ...enemy.scaledStats, ad: enemy.scaledStats.ad - r }, effects: [...enemy.effects, { type: "debuffAD", dur: ability.effectDur || 2, val: r }] };
    logEntries.push({ type: "system", text: `⬇️ Enemy AD -${r}` });
  }
  if (effect === "debuffArmor") {
    const r = ability.debuffVal || 8;
    enemy = { ...enemy, scaledStats: { ...enemy.scaledStats, armor: Math.max(0, enemy.scaledStats.armor - r) } };
    logEntries.push({ type: "system", text: `⬇️ Enemy Armor -${r}` });
  }

  // Regen resource
  if (player.resource === "mana")   player = { ...player, mp: Math.min(player.maxMp, player.mp + 20) };
  if (player.resource === "energy") player = { ...player, mp: Math.min(player.maxMp, player.mp + 35) };
  if (player.resource === "fury")   player = { ...player, mp: Math.min(player.maxMp, player.mp + 15) };

  // ── Darius: apply Hemorrhage mark ─────────────────────────────────────────
  if (ability.appliesMark) {
    const marks = Math.min(3, (combat.dariusMarks || 0) + 1);
    combat = { ...combat, dariusMarks: marks, dariusMarkTurns: 3 };
    logEntries.push({ type: "system", text: `🩸 Hemorrhage ${marks}/3 (resets in 3 turns)` });
  }

  // ── Darius R: consume marks for bonus damage ───────────────────────────────
  if (ability.usesMarks && (combat.dariusMarks || 0) > 0) {
    const bonus = Math.round(dmgResult.total * combat.dariusMarks * 0.4);
    enemy = { ...enemy, currentHp: enemy.currentHp - bonus };
    logEntries.push({ type: "system", text: `🩸 Guillotine — ${combat.dariusMarks} stacks! +${bonus} bonus damage` });
    combat = { ...combat, dariusMarks: 0, dariusMarkTurns: 0 };
  }

  // ── Akali W: recover ⅓ max energy on cast ────────────────────────────────
  if (ability.energyOnCast && player.resource === "energy") {
    const recovered = Math.round(player.maxMp * ability.energyOnCast);
    player = { ...player, mp: Math.min(player.maxMp, player.mp + recovered) };
    logEntries.push({ type: "system", text: `⚡ Shroud — +${recovered} energy recovered` });
  }

  // ── Akali E: store delayed ¼-damage ───────────────────────────────────────
  if (ability.delayedDamage && dmgResult.total > 0) {
    const delayDmg = Math.max(1, Math.round(dmgResult.total * ability.delayedDamage.mult));
    combat = { ...combat, akaliEPending: { dmg: delayDmg, turnsLeft: ability.delayedDamage.turnsDelay } };
    logEntries.push({ type: "system", text: `🥷 Shuriken lodged — ${delayDmg} dmg in ${ability.delayedDamage.turnsDelay} turns` });
  }

  // ── Akali R Part 1: queue Part 2 ──────────────────────────────────────────
  if (ability.rPart1 && ability.rPart2) {
    combat = { ...combat, akaliRPending: { ...ability.rPart2, turnsLeft: 1 } };
    logEntries.push({ type: "system", text: `🥷 Perfect Execution — Part 2 incoming in 1 turn!` });
  }

  // Tick cooldowns
  const updCDs = {};
  Object.entries(player.abilityCooldowns || {}).forEach(([k, v]) => {
    updCDs[k] = k === key ? (cooldown || 0) : Math.max(0, v - 1);
  });
  player = { ...player, abilityCooldowns: updCDs };

  return { player, combat, enemy, log: logEntries };
}

// ─── ENEMY TURN ────────────────────────────────────────────────────────────────
export function resolveEnemyTurn(playerState, combatCtx, enemyState) {
  let player = { ...playerState };
  let combat = { ...combatCtx };
  let enemy  = { ...enemyState, effects: [...(enemyState.effects || [])] };
  const logEntries = [];

  // Bleed ticks
  const bleeds = enemy.effects.filter(e => e.type === "bleed");
  for (const b of bleeds) {
    enemy = { ...enemy, currentHp: enemy.currentHp - b.val };
    logEntries.push({ type: "system", text: `🩸 ${enemy.name} bleeds ${b.val} HP` });
  }

  // Tick effects, restore debuffs on expiry
  enemy = {
    ...enemy,
    effects: enemy.effects.map(e => ({ ...e, dur: e.dur - 1 })).filter(e => {
      if (e.dur <= 0 && e.type === "debuffAD" && e.val) {
        enemy = { ...enemy, scaledStats: { ...enemy.scaledStats, ad: enemy.scaledStats.ad + e.val } };
      }
      return e.dur > 0;
    }),
  };

  // ── Darius: tick Hemorrhage mark duration ─────────────────────────────────
  if ((combat.dariusMarkTurns || 0) > 0) {
    const t = combat.dariusMarkTurns - 1;
    if (t <= 0 && (combat.dariusMarks || 0) > 0) {
      logEntries.push({ type: "system", text: `🩸 Hemorrhage stacks expired (${combat.dariusMarks})` });
      combat = { ...combat, dariusMarks: 0, dariusMarkTurns: 0 };
    } else {
      combat = { ...combat, dariusMarkTurns: t };
    }
  }

  // ── Akali E: delayed shuriken detonation ──────────────────────────────────
  if (combat.akaliEPending) {
    const ep = combat.akaliEPending;
    if (ep.turnsLeft <= 1) {
      enemy = { ...enemy, currentHp: enemy.currentHp - ep.dmg };
      logEntries.push({ type: "system", text: `🥷 Shuriken detonates — 🔴 **${ep.dmg}** damage!` });
      combat = { ...combat, akaliEPending: null };
    } else {
      combat = { ...combat, akaliEPending: { ...ep, turnsLeft: ep.turnsLeft - 1 } };
    }
  }

  // ── Akali R Part 2: auto-reactivation ────────────────────────────────────
  if (combat.akaliRPending) {
    const rp = combat.akaliRPending;
    if (rp.turnsLeft <= 1) {
      const missingHpPct = Math.max(0, 1 - enemy.currentHp / enemy.scaledStats.hp);
      const scaledMult   = 1 + missingHpPct * (rp.missingHpScale || 1.5);
      const physDmg = calculatePhysicalDamage(
        player.ad * rp.adMult * scaledMult,
        enemy.scaledStats.armor,
        player.itemStats?.armorPen || 0,
        player.itemStats?.armorPenPct || 0,
      );
      const magDmg = calculateMagicDamage(
        player.ap * rp.apMult * scaledMult,
        enemy.scaledStats.mr,
        player.itemStats?.magicPen || 0,
      );
      const rTotalDmg = physDmg + magDmg;
      enemy = { ...enemy, currentHp: enemy.currentHp - rTotalDmg };
      logEntries.push({
        type: "system",
        text: `🥷 Perfect Execution Part 2 — 🔴🔵 **${rTotalDmg}** dmg (×${scaledMult.toFixed(1)} missing HP)`,
      });
      combat = { ...combat, akaliRPending: null };
    } else {
      combat = { ...combat, akaliRPending: { ...rp, turnsLeft: rp.turnsLeft - 1 } };
    }
  }

  const isStunned = enemy.effects.some(e => e.type === "stun" || e.type === "root");
  if (isStunned) {
    logEntries.push({ type: "enemy-action", text: `${enemy.emoji} **${enemy.name}** is stunned — loses turn!` });
    return { player, combat, enemy, log: logEntries };
  }

  const isSilenced = enemy.effects.some(e => e.type === "silence");
  const isSlow     = enemy.effects.some(e => e.type === "slow");

  // Pick ability
  let chosenAbility = null, abilityIndex = -1;
  if (!isSilenced && (enemy.abilities || []).length > 0) {
    for (let i = 0; i < enemy.abilities.length; i++) {
      const ab = enemy.abilities[i];
      const cd = (enemy.abilityCooldowns || {})[i] || 0;
      if (cd <= 0 && (ab.damageMult > 0 || ab.effect)) { chosenAbility = ab; abilityIndex = i; break; }
    }
  }

  // Revive
  if (chosenAbility?.effect === "revive" && !enemy.hasRevived && enemy.currentHp <= 0) {
    const revHp = Math.round(enemy.scaledStats.hp * (chosenAbility.reviveHpPct || 0.3));
    enemy = { ...enemy, currentHp: revHp, hasRevived: true, abilityCooldowns: { ...(enemy.abilityCooldowns||{}), [abilityIndex]: 999 } };
    logEntries.push({ type: "enemy-action", text: `${enemy.emoji} **${enemy.name}** revives with ${revHp} HP!` });
    return { player, combat, enemy, log: logEntries };
  }

  let rawDamage = enemy.scaledStats.ad;
  let abilityLabel = "attacks";
  if (chosenAbility) {
    rawDamage = Math.round(rawDamage * chosenAbility.damageMult);
    abilityLabel = `uses *${chosenAbility.name}*`;
    const newCDs = { ...(enemy.abilityCooldowns || {}), [abilityIndex]: chosenAbility.cooldown || 4 };
    enemy = { ...enemy, abilityCooldowns: newCDs };
  }
  if (isSlow) rawDamage = Math.round(rawDamage * 0.7);

  const hits = chosenAbility?.hits || 1;
  let totalDamage = 0;
  for (let h = 0; h < hits; h++) {
    const dmg = chosenAbility?.isMagic
      ? calculateMagicDamage(rawDamage / hits, player.mr)
      : chosenAbility?.isTrue
        ? Math.round(rawDamage / hits)
        : calculatePhysicalDamage(rawDamage / hits, player.armor);
    totalDamage += dmg;
  }

  // Passive dodge chance from move speed (faster = harder to hit), capped at 25%
  const moveDodge = Math.min(0.25, (player.itemStats?.moveSpeed || 0) * 0.004);

  // Defensive mechanics
  if (combat.playerAbsorbNext) {
    logEntries.push({ type: "system", text: `🌬️ Wind Wall blocks the attack!` });
    combat = { ...combat, playerAbsorbNext: false };
    totalDamage = 0;
  } else if (combat.playerRiposte) {
    const ctr = Math.round(totalDamage * combat.playerRiposte.counterMult);
    enemy = { ...enemy, currentHp: enemy.currentHp - ctr };
    logEntries.push({ type: "system", text: `🤺 Riposte! Counter for ${ctr} true damage` });
    combat = { ...combat, playerRiposte: null };
    totalDamage = 0;
  } else if (combat.playerEvade > 0 && Math.random() < (combat.playerEvadeChance || 0.4)) {
    logEntries.push({ type: "system", text: `💨 ${player.champion.name} dodges!` });
    combat = { ...combat, playerEvade: Math.max(0, combat.playerEvade - 1) };
    totalDamage = 0;
  } else if (moveDodge > 0 && Math.random() < moveDodge) {
    logEntries.push({ type: "system", text: `💨 ${player.champion.name} esquiva (velocidad)!` });
    totalDamage = 0;
  } else {
    if (combat.playerShield > 0) {
      const absorbed = Math.min(totalDamage, combat.playerShield);
      combat = { ...combat, playerShield: combat.playerShield - absorbed };
      totalDamage -= absorbed;
      if (absorbed > 0) logEntries.push({ type: "system", text: `🛡️ Shield absorbs ${absorbed}` });
    }
    if (combat.playerUndying > 0 && player.hp - totalDamage <= 0) {
      player = { ...player, hp: 1 };
      combat = { ...combat, playerUndying: Math.max(0, combat.playerUndying - 1) };
      logEntries.push({ type: "system", text: `☠️ Undying Rage — survive with 1 HP!` });
      totalDamage = 0;
    } else {
      player = { ...player, hp: player.hp - totalDamage };
      if (combat.playerEvade > 0) combat = { ...combat, playerEvade: Math.max(0, combat.playerEvade - 1) };
    }
  }

  if (totalDamage > 0) {
    const dmgColor = chosenAbility?.isMagic ? "🔵" : chosenAbility?.isTrue ? "⬜" : "🔴";
    logEntries.push({ type: "enemy-action", dmgType: chosenAbility?.isMagic ? "magic" : chosenAbility?.isTrue ? "true" : "physical", text: `${enemy.emoji} **${enemy.name}** ${abilityLabel} ${dmgColor} **${totalDamage}** dmg` });
  }

  // Boss self-buffs
  if (chosenAbility?.effect === "selfBuffAD") { const b = Math.round(enemy.scaledStats.ad * chosenAbility.buffVal); enemy = { ...enemy, scaledStats: { ...enemy.scaledStats, ad: enemy.scaledStats.ad + b } }; logEntries.push({ type: "enemy-action", text: `${enemy.emoji} empowers! +${b} AD` }); }
  if (chosenAbility?.effect === "selfBuffArmor") { enemy = { ...enemy, scaledStats: { ...enemy.scaledStats, armor: enemy.scaledStats.armor + chosenAbility.buffVal } }; logEntries.push({ type: "enemy-action", text: `${enemy.emoji} hardens! +${chosenAbility.buffVal} Armor` }); }
  if (chosenAbility?.effect === "missingHpDmg") { const d = Math.round((player.maxHp - player.hp) * chosenAbility.missingPct); player = { ...player, hp: Math.max(0, player.hp - d) }; logEntries.push({ type: "enemy-action", text: `Exploits wounds for ${d} damage!` }); }
  if (chosenAbility?.effect === "maxHpDmg") { const d = Math.round(player.maxHp * chosenAbility.pct); player = { ...player, hp: Math.max(0, player.hp - d) }; logEntries.push({ type: "enemy-action", text: `⬜ **${d}** max HP damage!` }); }
  if (chosenAbility?.effect === "maxHpReduce") { const r = Math.round(player.maxHp * chosenAbility.reduceVal); player = { ...player, maxHp: player.maxHp - r, hp: Math.max(1, player.hp - r), baseMaxHp: player.baseMaxHp - r }; logEntries.push({ type: "system", text: `⬇️ Max HP -${r}!` }); }
  if (chosenAbility?.effect === "lifesteal" && totalDamage > 0) { const h = Math.round(totalDamage * chosenAbility.lsVal); enemy = { ...enemy, currentHp: Math.min(enemy.scaledStats.hp, enemy.currentHp + h) }; logEntries.push({ type: "system", text: `🧛 ${enemy.name} heals ${h} HP` }); }
  if (chosenAbility?.effect === "selfHeal") { const h = Math.round(enemy.scaledStats.hp * chosenAbility.pct); enemy = { ...enemy, currentHp: Math.min(enemy.scaledStats.hp, enemy.currentHp + h) }; logEntries.push({ type: "enemy-action", text: `${enemy.emoji} heals ${h} HP!` }); }

  // Item passives — Liandry burn (with synergy boost)
  const liandry = (player.inventory || []).find(i => i.id === 3135 || i.stats?.burn);
  if (liandry) {
    const burnPct = (liandry.stats?.burn || 0.06) + (player.itemSynergies?.liandryBurnBoost || 0);
    const burnDmg = Math.max(1, Math.round(enemy.currentHp * burnPct));
    enemy = { ...enemy, currentHp: enemy.currentHp - burnDmg };
    logEntries.push({ type: "system", text: `🔥 Liandry's 🔵 **${burnDmg}** magic burn` });
  }

  const sunfire = (player.inventory || []).find(i => i.stats?.burnAura);
  if (sunfire) {
    enemy = { ...enemy, currentHp: enemy.currentHp - sunfire.stats.burnAura };
    logEntries.push({ type: "system", text: `🌞 Sunfire 🔴 **${sunfire.stats.burnAura}** aura` });
  }

  // Warmog regen (% of max HP per turn, with synergy boost)
  const warmog = (player.inventory || []).find(i => i.id === 3083);
  if (warmog && player.hp > 0) {
    const regenPct = player.itemSynergies?.warmogRegenBoost ? 0.04 : 0.02;
    const regenAmt = Math.round(player.maxHp * regenPct);
    player = { ...player, hp: Math.min(player.maxHp, player.hp + regenAmt) };
    logEntries.push({ type: "system", text: `❤️ Warmog's +${regenAmt} HP regen` });
  }

  // Flat HP regen per turn from hpRegen5 stat (e.g. Doran's Shield)
  const regenStat = player.itemStats?.hpRegen5 || 0;
  if (regenStat > 0 && player.hp > 0 && player.hp < player.maxHp) {
    const flatRegen = Math.max(5, Math.round(regenStat * 10));
    player = { ...player, hp: Math.min(player.maxHp, player.hp + flatRegen) };
    logEntries.push({ type: "system", text: `❤️ Regeneración +${flatRegen} HP` });
  }

  // Tick enemy cooldowns
  const newCDs = {};
  Object.entries(enemy.abilityCooldowns || {}).forEach(([k, v]) => { newCDs[k] = v === 999 ? 999 : Math.max(0, v - 1); });
  enemy = { ...enemy, abilityCooldowns: newCDs };

  return { player, combat, enemy, log: logEntries };
}

// ─── COMBAT INIT ───────────────────────────────────────────────────────────────
export function initCombat(playerState, enemyTemplate) {
  return {
    player: { ...playerState, abilityCooldowns: { Q: 0, W: 0, E: 0, R: 0 } },
    enemy: {
      ...enemyTemplate,
      scaledStats: enemyTemplate.scaledStats || { hp: enemyTemplate.currentHp || 100, ad: 40, armor: 20, mr: 20 },
    },
    combat: {
      turn: "player", turnCount: 0, over: false, result: null,
      playerShield: 0, playerUndying: 0, playerEvade: 0, playerEvadeChance: 0,
      playerExpose: 0, playerAbsorbNext: false, playerRiposte: null,
      steelTempestStacks: 0, threshSouls: 0, pendingUnlock: null,
      healPotionUsed: false,
      // Darius Hemorrhage mark system
      dariusMarks: 0, dariusMarkTurns: 0,
      // Akali delayed-damage channels
      akaliEPending: null,   // { dmg: number, turnsLeft: number }
      akaliRPending: null,   // { adMult, apMult, missingHpScale, turnsLeft }
      // Moggeador achievement: consecutive "pass turn" presses
      consecutivePasses: 0,
      moggeadorReady: false,
      log: [{ type: "system", text: `⚔️ **Combat begins** vs **${enemyTemplate.name}** — HP: ${enemyTemplate.currentHp} | AD: ${enemyTemplate.scaledStats?.ad}` }],
    },
  };
}

// ─── PASS TURN ─────────────────────────────────────────────────────────────────
export function passTurn(playerState) {
  let player = { ...playerState };
  if (player.resource === "mana")   player = { ...player, mp: Math.min(player.maxMp, player.mp + 40) };
  if (player.resource === "energy") player = { ...player, mp: Math.min(player.maxMp, player.mp + 60) };
  if (player.resource === "fury")   player = { ...player, mp: Math.min(player.maxMp, player.mp + 20) };
  const updCDs = {};
  Object.entries(player.abilityCooldowns || {}).forEach(([k, v]) => { updCDs[k] = Math.max(0, v - 1); });
  player = { ...player, abilityCooldowns: updCDs };
  return { player, log: [{ type: "system", text: `${player.champion.emoji} Passes turn — resource recovered` }] };
}

// ─── ITEM STATS ────────────────────────────────────────────────────────────────
export function computeItemStats(inventory) {
  const result = {};
  for (const item of inventory) {
    for (const [k, v] of Object.entries(item.stats || {})) result[k] = (result[k] || 0) + v;
  }
  return result;
}

export function applyItemStatsToPlayer(basePlayer, inventory) {
  const bonuses = computeItemStats(inventory);
  const synergies = computeItemSynergies(inventory);

  // Apply Rabadon synergy to AP
  const rawAP = (basePlayer.baseAP || 0) + (bonuses.ap || 0);
  const effectiveAP = rawAP * (1 + (synergies.rabadonsAPBoost || 0));

  // Resource pool: mana/energy items raise max resource (none-resource champs stay at 0)
  const maxMp = basePlayer.resource === "none"
    ? 0
    : basePlayer.baseMaxMp + (bonuses.mp || 0);

  return {
    ...basePlayer,
    ad:    basePlayer.baseAD    + (bonuses.ad    || 0),
    ap:    Math.round(effectiveAP),
    maxHp: basePlayer.baseMaxHp + (bonuses.hp    || 0),
    armor: basePlayer.baseArmor + (bonuses.armor || 0),
    mr:    basePlayer.baseMR    + (bonuses.mr    || 0),
    maxMp,
    itemStats:    bonuses,
    itemSynergies: synergies,
  };
}
