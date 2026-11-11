import { UI_COLORS } from './colors.js';
import { inkShadow } from './shadows.js';
import { DURATIONS } from './motion.js';

// The comic speech bubble: every toast and roll bubble is one. A thick ink
// edge, a solid offset shadow — in ink, or in the moment's colour (the accent
// on a natural 20, danger on a natural 1, a notice's severity) — and a tail
// pointing where it speaks from.

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
    boxShadow: inkShadow(tone),
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

// The comic shapes behind a total that shouts: the spiky starburst of a
// natural 20 and the ragged splat of a natural 1, drawn behind the number
// and cut by clip-path.
const polygon = (points) => `polygon(${points.map(([x, y]) => `${x.toFixed(1)}% ${y.toFixed(1)}%`).join(', ')})`;

const BURST_POINTS = polygon(Array.from({ length: 24 }, (_, index) => {
  const radius = index % 2 === 0 ? 50 : 34;
  const angle = (Math.PI * index) / 12 - Math.PI / 2;
  return [50 + radius * Math.cos(angle), 50 + radius * Math.sin(angle)];
}));

// A splat is uneven on purpose: blunt lobes of different reach, no two alike.
const SPLAT_REACH = [46, 30, 40, 27, 49, 33, 37, 25, 44, 31, 42, 28, 47, 34];
const SPLAT_POINTS = polygon(SPLAT_REACH.map((radius, index) => {
  const angle = (2 * Math.PI * index) / SPLAT_REACH.length - Math.PI / 2;
  return [50 + radius * Math.cos(angle), 50 + radius * Math.sin(angle)];
}));

function shapeBehindSx(color, clipPath, turn) {
  return {
    position: 'relative',
    isolation: 'isolate',
    display: 'inline-block',
    px: 1.5,
    '&::before': {
      content: '""',
      position: 'absolute',
      left: '50%',
      top: '50%',
      width: '2.2em',
      height: '2.2em',
      transform: `translate(-50%, -50%) rotate(${turn})`,
      clipPath,
      bgcolor: color,
      zIndex: -1,
    },
  };
}

export function starburstSx(color = UI_COLORS.accent) {
  return shapeBehindSx(color, BURST_POINTS, '-8deg');
}

export function splatSx(color = UI_COLORS.danger) {
  return shapeBehindSx(color, SPLAT_POINTS, '14deg');
}

// A bubble that groans (a natural 1): it shakes once instead of popping in.
// A bubble that cheers (a natural 20): it leaps up stretched, lands squashed
// like a spring, rocks twice and settles at `end` — the larger shouting tilt
// on the dice toast, the bubble's own tilt over a token. With `delay` (ms) it
// is not there until it leaps in (the home cover's name, after the die lands).
export function bubbleCheerSx(end = SHOUT_TILT, { delay = 0 } = {}) {
  const cheer = `gbBubbleCheer ${DURATIONS.slow * 4}ms cubic-bezier(0.3, 0.9, 0.4, 1)`;
  return {
    transform: end,
    animation: delay ? `${cheer} ${delay}ms both, gbBubbleWait 1ms linear ${delay}ms both` : cheer,
    '@keyframes gbBubbleWait': { from: { opacity: 0 }, to: { opacity: 1 } },
    '@keyframes gbBubbleCheer': {
      // No fade: the bubble is there from the first frame, only small.
      '0%': { transform: 'translateY(12px) scale(0.6) rotate(-6deg)' },
      '22%': { transform: 'translateY(-18px) scale(0.94, 1.14) rotate(3deg)' },
      '40%': { transform: 'translateY(2px) scale(1.14, 0.88) rotate(-3deg)' },
      '56%': { transform: 'translateY(-6px) scale(0.98, 1.05) rotate(2.5deg)' },
      '72%': { transform: 'translateY(0) scale(1.04, 0.97) rotate(-2deg)' },
      '86%': { transform: 'rotate(1deg)' },
      '100%': { transform: end },
    },
    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
  };
}

// The bubble's own resting tilt, for a cheer that settles back into it.
export const BUBBLE_REST = `rotate(${TILT})`;

export const BUBBLE_SHAKE_SX = Object.freeze({
  animation: `gbBubbleShake ${DURATIONS.slow * 2}ms ease-in-out`,
  '@keyframes gbBubbleShake': {
    '0%, 100%': { transform: `rotate(${TILT}) translateX(0)` },
    '20%': { transform: 'rotate(-3deg) translateX(-6px)' },
    '40%': { transform: 'rotate(2deg) translateX(5px)' },
    '60%': { transform: 'rotate(-2deg) translateX(-4px)' },
    '80%': { transform: 'rotate(1deg) translateX(2px)' },
  },
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
});
