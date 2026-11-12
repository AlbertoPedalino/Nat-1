import { UI_COLORS, uiMix, OPACITY } from './colors.js';
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
export function bubbleSx({ fill = UI_COLORS.bubble, tone = UI_COLORS.edge, pop = true } = {}) {
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
export function bubbleTailSx({ fill = UI_COLORS.bubble, side = 'bottom', at = '50%' } = {}) {
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

// The comic shapes behind a total that shouts, drawn as a printed comic
// draws them: a flat colour under an even screen of Ben-Day dots a shade
// darker, edged in a thick ink line. A natural 20 is the classic KAPOW burst,
// a natural 1 a crash of kinked spikes. Each is an SVG path in a box `width`
// units wide and 100 tall, painted as a picture over the shape's box, so it
// scales with the number.
const xy = ([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`;
const radians = (degrees) => (degrees * Math.PI) / 180;
const polygon = (corners) => `M${corners.map(xy).join('L')}Z`;

// The natural 20: wider than tall, sharp spikes of a few lengths, each leaning
// a little ([angle, reach, lean] in degrees and units), valleys of a few depths.
const KAPOW_WIDTH = 130;
const KAPOW_SQUASH = 0.78;
const KAPOW_SPIKES = [[-90, 64, 4], [-62, 52, -3], [-38, 62, 5], [-14, 50, 0], [8, 60, -4], [32, 54, 3], [58, 63, 6], [84, 50, -2], [108, 61, 4], [134, 53, -5], [158, 64, 3], [182, 51, 0], [206, 62, -4], [232, 52, 4]];
const KAPOW_VALLEYS = [37, 40, 36, 39, 38, 35, 40, 37, 39, 36, 38, 40, 36, 39];
const KAPOW_PATH = (() => {
  const at = (reach, angle) => [KAPOW_WIDTH / 2 + reach * Math.cos(radians(angle)), 50 + reach * KAPOW_SQUASH * Math.sin(radians(angle))];
  return polygon(KAPOW_SPIKES.flatMap(([angle, reach, lean], index) => {
    const next = KAPOW_SPIKES[(index + 1) % KAPOW_SPIKES.length][0] + (index === KAPOW_SPIKES.length - 1 ? 360 : 0);
    return [at(reach * 0.97, angle + lean), at(KAPOW_VALLEYS[index] * 0.97, (angle + next) / 2)];
  }));
})();

// The natural 1: six arms of different reach ([angle, reach]), each kinked
// along its trailing edge, round a full middle the number sits inside.
const CRASH_ARMS = [[-85, 48], [-20, 42], [40, 47], [110, 40], [170, 48], [235, 43]];
const CRASH_KINKS = [[0.74, 8], [0.84, 13]];
const CRASH_MIDDLE = 33;
const CRASH_PATH = (() => {
  const at = (reach, angle) => [50 + reach * Math.cos(radians(angle)), 50 + reach * Math.sin(radians(angle))];
  return polygon(CRASH_ARMS.flatMap(([angle, reach], index) => {
    const next = CRASH_ARMS[(index + 1) % CRASH_ARMS.length][0] + (index === CRASH_ARMS.length - 1 ? 360 : 0);
    return [at(reach, angle), ...CRASH_KINKS.map(([share, off]) => at(reach * share, angle + off)), at(CRASH_MIDDLE, (angle + next) / 2)];
  }));
})();

// The dots' screen, in shape units, and the ink line round the shape. The
// shape is drawn a little inside its box so the ink is not cut off.
const DOT_STEP = 5;
const DOT_RADIUS = 1.25;
const DOT_SHADE = 0.45;
const INK_WIDTH = 3.4;
const INSET = 0.92;

function shapeImage(path, width, color) {
  const fit = `transform="translate(${width / 2} 50) scale(${INSET}) translate(${-width / 2} -50)"`;
  const half = DOT_STEP / 2;
  const dot = uiMix(color, UI_COLORS.edge, DOT_SHADE);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 100">`
    // Rows DOT_STEP apart, every other row shifted half a step.
    + `<defs><pattern id="d" width="${DOT_STEP}" height="${DOT_STEP * 2}" patternUnits="userSpaceOnUse">`
    + `<g fill="${dot}"><circle cx="${half / 2}" cy="${half}" r="${DOT_RADIUS}"/><circle cx="${half * 1.5}" cy="${half * 3}" r="${DOT_RADIUS}"/></g></pattern></defs>`
    + `<g ${fit}><path d="${path}" fill="${color}"/>`
    + `<path d="${path}" fill="url(#d)"/>`
    + `<path d="${path}" fill="none" stroke="${UI_COLORS.edge}" stroke-width="${INK_WIDTH}" stroke-linejoin="miter" stroke-miterlimit="6"/></g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

// A shape's picture is the same for every throw of its colour: made once.
const pictures = new Map();
function shapeBehindSx(color, path, width, turn) {
  const key = `${path}|${color}`;
  if (!pictures.has(key)) pictures.set(key, shapeImage(path, width, color));
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
      width: `${(2.2 * width) / 100}em`,
      height: '2.2em',
      transform: `translate(-50%, -50%) rotate(${turn})`,
      backgroundImage: pictures.get(key),
      backgroundSize: '100% 100%',
      zIndex: -1,
    },
  };
}

// Magic sparkles round a natural 20's burst: four-pointed stars inked like
// everything else, a gold pair and a spell-coloured one, set off the burst's
// edge in a box wider than it. They twinkle while the bubble is up.
const SPARKLE_PATH = 'M0 -10C1 -3 3 -1 10 0C3 1 1 3 0 10C-1 3 -3 1 -10 0C-3 -1 -1 -3 0 -10Z';
const SPARKLES = [[14, 22, 1.1, UI_COLORS.accentHighlight], [150, 16, 0.75, UI_COLORS.spell], [142, 86, 0.9, UI_COLORS.accentHighlight]];
const SPARKLES_IMAGE = (() => {
  const stars = SPARKLES.map(([x, y, scale, fill]) => `<path transform="translate(${x} ${y}) scale(${scale})" d="${SPARKLE_PATH}" fill="${fill}" stroke="${UI_COLORS.edge}" stroke-width="2.4" stroke-linejoin="round"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 164 100">${stars}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
})();

export function starburstSx(color = UI_COLORS.accent) {
  return {
    ...shapeBehindSx(color, KAPOW_PATH, KAPOW_WIDTH, '-8deg'),
    '&::after': {
      content: '""',
      position: 'absolute',
      left: '50%',
      top: '50%',
      width: '3.6em',
      height: '2.2em',
      transform: 'translate(-50%, -50%)',
      backgroundImage: SPARKLES_IMAGE,
      backgroundSize: '100% 100%',
      pointerEvents: 'none',
      animation: `gbSparkle ${DURATIONS.slow * 4}ms ease-in-out infinite`,
      '@keyframes gbSparkle': {
        '0%, 100%': { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
        '50%': { opacity: OPACITY.strong, transform: 'translate(-50%, -50%) scale(0.92)' },
      },
      '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
    },
  };
}

export function splatSx(color = UI_COLORS.danger) {
  return shapeBehindSx(color, CRASH_PATH, 100, '14deg');
}

// A bubble spoken by something on the map (a piece's roll, the hex the party
// stands on): it grows out of its tail, which sits on the speaker, so it reads
// as said by it rather than dropped onto the map from off screen.
export const BUBBLE_FROM_TAIL_SX = Object.freeze({
  transformOrigin: 'bottom center',
  animation: `gbBubbleFromTail ${DURATIONS.slow}ms cubic-bezier(0.34, 1.4, 0.64, 1)`,
  '@keyframes gbBubbleFromTail': {
    from: { opacity: 0, transform: 'scale(0.25)' },
    to: { opacity: 1, transform: 'scale(1)' },
  },
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
});

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
