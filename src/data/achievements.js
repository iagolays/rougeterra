/**
 * achievements.js — Definición de logros.
 *
 * Cada logro:
 *   id        — identificador único (persistido)
 *   name      — nombre mostrado
 *   emoji     — icono provisional (en el futuro se sustituirá por imageUrl)
 *   imageUrl  — (opcional, futuro) ruta a la imagen del logro
 *   desc      — descripción
 *   hidden    — si es true, se muestra como "?" hasta desbloquearlo
 *   check(ctx)— (opcional) predicado evaluado sobre el estado. Si no existe,
 *               el logro se desbloquea manualmente en un momento concreto del juego.
 *
 * ctx (contexto de comprobación):
 *   { bank, regionIdx, runRested, runGoldEarned, runInfoOpens,
 *     runManaPotionsUsed, championId, collectedCount, totalItemCount }
 */

export const ACHIEVEMENTS = [
  { id: "monedero",     name: "Monedero",        emoji: "💰", desc: "Ten 10.000 de oro en el banco.",                       check: c => c.bank >= 10000 },
  { id: "inversor",     name: "Inversor",        emoji: "🏦", desc: "Ten 50.000 de oro en el banco.",                       check: c => c.bank >= 50000 },
  { id: "richy",        name: "Richy Rich",      emoji: "🤑", desc: "Ten 100.000 de oro en el banco.",                      check: c => c.bank >= 100000 },
  { id: "arcane",       name: "Arcane Enjoyer",  emoji: "⚙️", desc: "Llega a Piltover.",                                    check: c => c.regionIdx >= 3 },
  { id: "silent_hill",  name: "Silent Hill",     emoji: "💀", desc: "Llega a las Islas de la Sombra.",                      check: c => c.regionIdx >= 4 },
  { id: "el_fin",       name: "¿El fin?",        emoji: "🌌", desc: "Llega al Vacío.",                                      check: c => c.regionIdx >= 5 },
  { id: "afortunado",   name: "Afortunado",      emoji: "🐹", desc: "Encuentra a Poppy.",                                   hidden: true },
  { id: "chad",         name: "Chad",            emoji: "🗿", desc: "Llega al Vacío sin haber descansado ni una vez.",      check: c => c.regionIdx >= 5 && !c.runRested },
  { id: "cain",         name: "Cain",            emoji: "🪙", desc: "Consigue 25.000 de oro en una sola partida (sin contar el banco).", check: c => c.runGoldEarned >= 25000 },
  { id: "saitama",      name: "Saitama",         emoji: "👊", desc: "Mata a un enemigo de un solo golpe." },
  { id: "por_noxus",    name: "¡Por Noxus!",     emoji: "🪓", desc: "Llega al Vacío con Darius.",                           check: c => c.regionIdx >= 5 && c.championId === "Darius" },
  { id: "por_freljord", name: "¡Por Freljord!",  emoji: "🏹", desc: "Llega al Vacío con Ashe.",                             check: c => c.regionIdx >= 5 && c.championId === "Ashe" },
  { id: "aura",         name: "Aura",            emoji: "🥷", desc: "Llega al Vacío con Akali.",                            check: c => c.regionIdx >= 5 && c.championId === "Akali" },
  { id: "coleccionista", name: "Coleccionista",  emoji: "📦", desc: "Recoge al menos una vez todos los objetos.",          check: c => c.totalItemCount > 0 && c.collectedCount >= c.totalItemCount },
  { id: "olvidadizo",   name: "Olvidadizo",      emoji: "🧠", desc: "Abre el panel de información 10 veces en una sola partida.", hidden: true, check: c => c.runInfoOpens >= 10 },
  { id: "adicto",       name: "Adicto",          emoji: "🧪", desc: "Usa 30 pociones de maná en una partida.",             check: c => c.runManaPotionsUsed >= 30 },
  { id: "superviviente", name: "Superviviente",  emoji: "❤️‍🩹", desc: "Sobrevive a un combate con menos del 10% de vida." },
  { id: "moggeador",    name: "Moggeador",       emoji: "⏳", desc: "Pasa el turno 10 veces seguidas y luego gana el combate." },
  { id: "hall_fama",    name: "Hall de la Fama", emoji: "🏆", desc: "Derrota al Jefe del Vacío." },
];

export const ACHIEVEMENTS_BY_ID = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));
