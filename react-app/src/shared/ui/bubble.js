import { UI_COLORS, uiMix } from './colors.js';
import { inkShadow, inkEdge } from './shadows.js';
import { DURATIONS, motionTime } from './motion.js';
import { svgStylePicture } from './svgPicture.js';
import { BURST_ASPECT } from './shapes.js';

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
    border: inkEdge(3),
    borderRadius: 2,
    boxShadow: inkShadow(tone),
    transform: `rotate(${TILT})`,
    ...(pop ? {
      animation: `gbBubblePop ${motionTime(DURATIONS.slow)} cubic-bezier(0.34, 1.56, 0.64, 1)`,
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

// The two shapes are the style's (shapes.js bursts); drawn here from them.
function kapowPath({ width, squash, spikes, valleys }) {
  const at = (reach, angle) => [width / 2 + reach * Math.cos(radians(angle)), 50 + reach * squash * Math.sin(radians(angle))];
  return polygon(spikes.flatMap(([angle, reach, lean], index) => {
    const next = spikes[(index + 1) % spikes.length][0] + (index === spikes.length - 1 ? 360 : 0);
    return [at(reach * 0.97, angle + lean), at(valleys[index] * 0.97, (angle + next) / 2)];
  }));
}

function crashPath({ arms, kinks, middle }) {
  const at = (reach, angle) => [50 + reach * Math.cos(radians(angle)), 50 + reach * Math.sin(radians(angle))];
  return polygon(arms.flatMap(([angle, reach], index) => {
    const next = arms[(index + 1) % arms.length][0] + (index === arms.length - 1 ? 360 : 0);
    return [at(reach, angle), ...kinks.map(([share, off]) => at(reach * share, angle + off)), at(middle, (angle + next) / 2)];
  }));
}

// Each burst's path and the width of its box (100 tall) in a style's bursts.
const BURST_DRAWINGS = Object.freeze({
  kapow: Object.freeze({ path: (bursts) => kapowPath(bursts.kapow), width: (bursts) => bursts.kapow.width }),
  crash: Object.freeze({ path: (bursts) => crashPath(bursts.crash), width: () => 100 }),
});

// The dots' screen, in shape units, and the ink line round the shape. The
// shape is drawn a little inside its box so the ink is not cut off.
const DOT_STEP = 5;
const DOT_RADIUS = 1.25;
const DOT_SHADE = 0.45;
const BURST_INK = 3.4;
const INSET = 0.92;

function shapeSvg(path, width, color) {
  const fit = `transform="translate(${width / 2} 50) scale(${INSET}) translate(${-width / 2} -50)"`;
  const half = DOT_STEP / 2;
  const dot = uiMix(color, UI_COLORS.edge, DOT_SHADE);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 100">`
    // Rows DOT_STEP apart, every other row shifted half a step.
    + `<defs><pattern id="d" width="${DOT_STEP}" height="${DOT_STEP * 2}" patternUnits="userSpaceOnUse">`
    + `<g fill="${dot}"><circle cx="${half / 2}" cy="${half}" r="${DOT_RADIUS}"/><circle cx="${half * 1.5}" cy="${half * 3}" r="${DOT_RADIUS}"/></g></pattern></defs>`
    + `<g ${fit}><path d="${path}" fill="${color}"/>`
    + `<path d="${path}" fill="url(#d)"/>`
    + `<path d="${path}" fill="none" stroke="${UI_COLORS.edge}" stroke-width="${BURST_INK}" stroke-linejoin="miter" stroke-miterlimit="6"/></g></svg>`;
}

// A burst's picture, in a colour, drawn per style (the same key is the same
// picture: made once for every throw of its colour).
function shapeBehindSx(color, kind, turn) {
  const drawing = BURST_DRAWINGS[kind];
  const picture = svgStylePicture(`burst:${kind}|${color}`, ({ bursts }) => shapeSvg(drawing.path(bursts), drawing.width(bursts), color));
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
      width: `calc(2.2em * ${BURST_ASPECT[kind]})`,
      height: '2.2em',
      transform: `translate(-50%, -50%) rotate(${turn})`,
      backgroundImage: picture,
      backgroundSize: '100% 100%',
      zIndex: -1,
    },
  };
}

export function starburstSx(color = UI_COLORS.accent) {
  return shapeBehindSx(color, 'kapow', '-8deg');
}

export function splatSx(color = UI_COLORS.danger) {
  return shapeBehindSx(color, 'crash', '14deg');
}

// A bubble spoken by something on the map (a piece's roll, the hex the party
// stands on): it grows out of its tail, which sits on the speaker, so it reads
// as said by it rather than dropped onto the map from off screen.
export const BUBBLE_FROM_TAIL_SX = Object.freeze({
  transformOrigin: 'bottom center',
  animation: `gbBubbleFromTail ${motionTime(DURATIONS.slow)} cubic-bezier(0.34, 1.4, 0.64, 1)`,
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
  const cheer = `gbBubbleCheer ${motionTime(DURATIONS.slow * 4)} cubic-bezier(0.3, 0.9, 0.4, 1)`;
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
  animation: `gbBubbleShake ${motionTime(DURATIONS.slow * 2)} ease-in-out`,
  '@keyframes gbBubbleShake': {
    '0%, 100%': { transform: `rotate(${TILT}) translateX(0)` },
    '20%': { transform: 'rotate(-3deg) translateX(-6px)' },
    '40%': { transform: 'rotate(2deg) translateX(5px)' },
    '60%': { transform: 'rotate(-2deg) translateX(-4px)' },
    '80%': { transform: 'rotate(1deg) translateX(2px)' },
  },
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
});
