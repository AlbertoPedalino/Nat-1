import { UI_COLORS } from './colors.js';

// A natural 20's confetti: a short burst from the corner the dice toast sits
// in, in the interface's bright colours. canvas-confetti is loaded the first
// time it is needed, so no page pays for it until someone rolls a 20; it skips
// itself for anyone who asked for reduced motion.
export function celebrateNatural20() {
  if (typeof window === 'undefined') return;
  import('canvas-confetti')
    .then(({ default: confetti }) => confetti({
      particleCount: 70,
      spread: 65,
      startVelocity: 38,
      origin: { x: 0.86, y: 0.88 },
      colors: [UI_COLORS.accent, UI_COLORS.secondary, UI_COLORS.spell, UI_COLORS.danger, UI_COLORS.info],
      disableForReducedMotion: true,
    }))
    .catch(() => {});
}
