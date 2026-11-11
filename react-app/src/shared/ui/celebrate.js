import { UI_COLORS } from './colors.js';
import { LAYERS } from './layers.js';

// A natural 20's confetti, bursting from where the roll is shown: the dice
// toast's corner, or a roll bubble over its token on the battle map (`origin`,
// as fractions of the screen). canvas-confetti is loaded the first time it is
// needed, so no page pays for it until someone rolls a 20; it skips itself for
// anyone who asked for reduced motion.
//
// The battle map is often fullscreen, and a fullscreen element hides the rest
// of the page: the confetti is then drawn on a canvas of its own inside it.
const TOAST_CORNER = { x: 0.86, y: 0.88 };
const FULLSCREEN_LIFE_MS = 4000;

export function celebrateNatural20({ origin = TOAST_CORNER } = {}) {
  if (typeof window === 'undefined') return;
  import('canvas-confetti')
    .then(({ default: confetti }) => {
      const options = {
        particleCount: 70,
        spread: 65,
        startVelocity: 38,
        origin,
        colors: [UI_COLORS.accent, UI_COLORS.secondary, UI_COLORS.spell, UI_COLORS.danger, UI_COLORS.info],
        disableForReducedMotion: true,
      };
      const host = document.fullscreenElement;
      if (!host) return confetti(options);
      const canvas = document.createElement('canvas');
      Object.assign(canvas.style, {
        position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: String(LAYERS.diceToast + 1),
      });
      host.appendChild(canvas);
      const burst = confetti.create(canvas, { resize: true });
      burst(options);
      window.setTimeout(() => { burst.reset(); canvas.remove(); }, FULLSCREEN_LIFE_MS);
      return null;
    })
    .catch(() => {});
}
