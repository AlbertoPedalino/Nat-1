import { UI_COLORS } from './colors.js';
import { inkShadow } from './shadows.js';
import { DURATIONS } from './motion.js';

// The comic speech bubble: every toast and roll bubble is one. A thick ink
// edge, a solid offset shadow — in ink, or in the moment's colour (the accent
// on a natural 20, danger on a natural 1, a notice's severity) — and a tail
// pointing where it speaks from.

// The bubble's solid shadow, as a comic panel's.
export const comicShadow = inkShadow;

// The bubble's slight tilt, and the larger one of a moment that shouts.
const TILT = '-0.8deg';
export const SHOUT_TILT = 'rotate(-1.6deg) scale(1.06)';

// The bubble itself, filled with `fill`; `tone` colours its shadow. It sits a
// little askew and, with `pop`, snaps in like a speech balloon drawn in.
export function bubbleSx({ fill = UI_COLORS.surfaceRaised, tone = UI_COLORS.edge, pop = true } = {}) {
  return {
    bgcolor: fill,
    border: `3px solid ${UI_COLORS.edge}`,
    borderRadius: 2,
    boxShadow: comicShadow(tone),
    transform: `rotate(${TILT})`,
    ...(pop ? {
      animation: `gbBubblePop ${DURATIONS.slow}ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
      '@keyframes gbBubblePop': {
        from: { opacity: 0, transform: 'rotate(-4deg) scale(0.7)' },
        to: { opacity: 1, transform: `rotate(${TILT}) scale(1)` },
      },
      '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
    } : null),
  };
}

// The tail, drawn by the bubble's own ::before (the ink) and ::after (the
// fill over it), on its `side` ('top' or 'bottom') at `at` along it. The
// bubble must be positioned (relative, fixed or absolute).
export function bubbleTailSx({ fill = UI_COLORS.surfaceRaised, side = 'bottom', at = '50%' } = {}) {
  const point = side === 'top' ? 'borderBottom' : 'borderTop';
  const piece = (width, height, offset, color) => ({
    content: '""',
    position: 'absolute',
    left: at,
    [side]: -offset,
    transform: 'translateX(-50%)',
    width: 0,
    height: 0,
    borderLeft: `${width}px solid transparent`,
    borderRight: `${width}px solid transparent`,
    [point]: `${height}px solid ${color}`,
    pointerEvents: 'none',
  });
  return {
    '&::before': piece(11, 15, 15, UI_COLORS.edge),
    '&::after': piece(7, 10, 10, fill),
  };
}
