/**
 * sfx.js — Tiny sound-effect player.
 * Caches one Audio per effect and replays from the start each time.
 */
const SOUNDS = {
  achievement:     "/assets/sfx/achievement.mp3",
  levelup:         "/assets/sfx/levelup.wav",
  levelup_click:   "/assets/sfx/levelup_click.wav",
  levelup_release: "/assets/sfx/levelup_release.wav",
  respawn:         "/assets/sfx/respawn.wav",
  heal:            "/assets/sfx/heal.wav",
};

const cache = {};

export function playSfx(name, volume = 0.6) {
  const src = SOUNDS[name];
  if (!src) return;
  try {
    const audio = cache[name] || (cache[name] = new Audio(src));
    audio.currentTime = 0;
    audio.volume = volume;
    audio.play().catch(() => { /* autoplay blocked before first interaction — ignore */ });
  } catch { /* ignore */ }
}
