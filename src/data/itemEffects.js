/**
 * itemEffects.js
 * Human-readable descriptions of item passives + the status-effect glossary.
 * Kept in sync with the real mechanics in game/combat.js.
 */

/**
 * getItemPassives(item) → array of { icon, text } describing the item's
 * special effects beyond raw stats. Only returns effects that actually
 * trigger in combat.
 */
export function getItemPassives(item) {
  if (!item) return [];
  const s = item.stats || {};
  const out = [];

  if (s.lifeSteal > 0) {
    out.push({ icon: "🩸", text: `Robo de vida: te curas por ${Math.round(s.lifeSteal * 100)}% del daño físico que infliges.` });
  }
  if (s.attackSpeedPct > 0) {
    out.push({ icon: "⚔️", text: `Velocidad de ataque: tus habilidades físicas infligen +${Math.round(s.attackSpeedPct * 50)}% de daño.` });
  }
  if (s.critChance > 0) {
    out.push({ icon: "💥", text: `Crítico: ${Math.round(s.critChance * 100)}% de probabilidad de asestar un golpe crítico (×1.75 daño).` });
  }
  if (s.moveSpeed > 0) {
    const dodge = Math.min(25, Math.round(s.moveSpeed * 0.4));
    out.push({ icon: "💨", text: `Velocidad: ${dodge}% de probabilidad de esquivar los ataques enemigos.` });
  }
  if (s.mp > 0) {
    out.push({ icon: "🔷", text: `Aumenta tu reserva de recurso en ${s.mp}.` });
  }
  if (s.hpRegen5 > 0) {
    out.push({ icon: "❤️", text: `Regeneras ${Math.max(5, Math.round(s.hpRegen5 * 10))} HP al final de cada turno.` });
  }

  // Item-specific passives (must match combat.js)
  if (item.id === 3135) {
    out.push({ icon: "🔥", text: "Quemadura: cada turno el enemigo pierde 6% de su vida actual como daño mágico." });
  }
  if (item.id === 3083) {
    out.push({ icon: "❤️", text: "Regeneras 2% de tu vida máxima cada turno (4% con otro objeto de vida)." });
  }
  if (item.id === 3089) {
    out.push({ icon: "🎩", text: "Sinergia: si llevas otro objeto de Poder de Habilidad, tu PH total aumenta +35%." });
  }
  if (item.id === 3031) {
    out.push({ icon: "⚔️", text: "Sinergia: con 2 o más objetos de crítico, tus críticos pasan a ×2.1." });
  }
  if (item.id === 3071) {
    out.push({ icon: "🪓", text: "Sinergia: con otro objeto de AD, ganas +15 de penetración de armadura." });
  }

  return out;
}

/** Status-effect glossary shown in the info panel. */
export const STATUS_GLOSSARY = [
  { icon: "⚡",  name: "Aturdido",        desc: "El objetivo pierde su turno: no ataca ni usa habilidades." },
  { icon: "🌿",  name: "Enraizado",       desc: "El objetivo no puede actuar durante su turno." },
  { icon: "🐢",  name: "Ralentizado",     desc: "El objetivo inflige un 30% menos de daño." },
  { icon: "🔇",  name: "Silenciado",      desc: "El enemigo no puede usar habilidades, solo su ataque básico." },
  { icon: "🩸",  name: "Sangrado",        desc: "Pierde una cantidad fija de HP al inicio de cada uno de sus turnos." },
  { icon: "🩸",  name: "Hemorragia",      desc: "Marca de Darius. Cada marca activa potencia tu definitiva (+40% de daño)." },
  { icon: "🎯",  name: "Expuesto",        desc: "Tus próximos ataques infligen +30% de daño." },
  { icon: "💨",  name: "Evasión",         desc: "Probabilidad de esquivar por completo el ataque enemigo." },
  { icon: "🛡️", name: "Escudo",          desc: "Absorbe daño antes de que afecte a tu HP." },
  { icon: "☠️", name: "Furia Indomable", desc: "No puedes bajar de 1 HP durante unos turnos." },
  { icon: "⬇️", name: "AD Reducido",     desc: "El enemigo inflige menos daño físico temporalmente." },
];
