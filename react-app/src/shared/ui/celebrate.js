import { UI_COLORS } from './colors.js';

// The particles of a roll that shouts, thrown from the corner the dice toast
// sits in: a natural 20's confetti bursting up, a natural 1's debris falling
// away. canvas-confetti is loaded the first time it is needed, so no page pays
// for it until someone rolls a 20 or a 1; it skips itself for anyone who asked
// for reduced motion.
function throwParticles(options) {
  if (typeof window === 'undefined') return;
  import('canvas-confetti')
    .then(({ default: confetti }) => confetti({ disableForReducedMotion: true, ...options }))
    .catch(() => {});
}

export function celebrateNatural20() {
  throwParticles({
    particleCount: 70,
    spread: 65,
    startVelocity: 38,
    origin: { x: 0.86, y: 0.88 },
    colors: [UI_COLORS.accent, UI_COLORS.secondary, UI_COLORS.spell, UI_COLORS.danger, UI_COLORS.info],
  });
}

// Grey and red chips crumbling off the toast and dropping.
export function lamentNatural1() {
  throwParticles({
    particleCount: 26,
    angle: 270,
    spread: 70,
    startVelocity: 10,
    gravity: 1.6,
    ticks: 140,
    scalar: 0.9,
    shapes: ['square'],
    origin: { x: 0.86, y: 0.8 },
    colors: [UI_COLORS.danger, UI_COLORS.dangerDeep, UI_COLORS.textMuted, UI_COLORS.outline],
  });
}
