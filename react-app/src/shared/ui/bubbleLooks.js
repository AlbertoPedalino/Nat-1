import { OPACITY, UI_COLORS, uiAlpha, uiMix } from './colors.js';
import { styleShapes } from './shapes.js';
import { themedValue } from './themedValues.js';
import { dataPicture } from './svgPicture.js';
import { UI_SHADOWS, inkDrop, inkShadow } from './shadows.js';

// How each style draws its speech bubble (shapes.js `bubble`): every toast,
// every roll and game notice, every bubble on the map is drawn from here
// (bubble.js bubbleSx, bubbleTailSx). A style picks, by name, the bubble's
// `fill` (a palette role) and `texture` (BUBBLE_TEXTURES), its `frame`
// (BUBBLE_FRAMES: none, or a drawn edge for a shape CSS cannot round), its
// `radius`, `border` and `outline`, its `tilt` (degrees), its `shadow`
// (BUBBLE_SHADOWS) and its `tail` (BUBBLE_TAILS: drawn only where the bubble
// speaks from something). A new look is an entry in one of these lists.
//
// Every value is worked out for the chosen style and palette (themedValue),
// so a bubble is written once and wears whatever the page, or its scope
// (StyleScope), wears. Its shadow takes the moment's colour from
// --gb-bubble-tone (and how far it falls from --gb-bubble-drop), which the
// bubble's user sets (bubbleToneSx).

const { black: BLACK, white: WHITE } = UI_COLORS;
const TONE = 'var(--gb-bubble-tone)';
const DROP = 'var(--gb-bubble-drop)';
const fall = (share = 1) => inkDrop(`${DROP} * ${share}`);

// The inside of the bubble: CSS backgrounds over its fill.
const BUBBLE_TEXTURES = Object.freeze({
  plain: (fill) => fill,
  // A wash of the accent from one corner.
  wash: (fill) => `linear-gradient(160deg, ${uiMix(fill, UI_COLORS.accent, 0.14)}, ${fill})`,
  // Darker at the top, under an arch.
  arch: (fill) => `linear-gradient(180deg, ${uiMix(fill, BLACK, 0.12)}, ${fill})`,
  // A screen's scanlines.
  scanlines: (fill) => `linear-gradient(${uiAlpha(UI_COLORS.edge, OPACITY.tint)} 50%, transparent 50%) 0 0 / 100% 3px, ${fill}`,
  // Night glass dusted with stars.
  stardust: (fill) => `radial-gradient(circle at 20% 30%, ${uiAlpha(WHITE, OPACITY.strong)} 0 1px, transparent 1.5px) 0 0 / 23px 19px, `
    + `radial-gradient(circle at 70% 60%, ${uiAlpha(WHITE, OPACITY.edge)} 0 .8px, transparent 1.3px) 0 0 / 31px 27px, `
    + `linear-gradient(160deg, ${uiMix(fill, UI_COLORS.accent, 0.18)}, ${fill})`,
  // A typed form's ruled lines.
  ruled: (fill) => `repeating-linear-gradient(0deg, transparent 0 15px, ${uiAlpha(BLACK, OPACITY.fill)} 15px 16px), ${fill}`,
  // A light caught from one side.
  glow: (fill) => `radial-gradient(ellipse at 30% 20%, ${uiAlpha(UI_COLORS.accent, OPACITY.shade)}, transparent 60%), ${fill}`,
  // Stained paper.
  stain: (fill) => `radial-gradient(circle at 30% 20%, ${uiAlpha(UI_COLORS.warning, OPACITY.fill)}, transparent 40%), `
    + `radial-gradient(circle at 80% 90%, ${uiAlpha(UI_COLORS.warning, OPACITY.shade)}, transparent 45%), ${fill}`,
  // A stone's grain.
  grain: (fill) => `repeating-linear-gradient(45deg, ${uiAlpha(BLACK, OPACITY.tint)} 0 2px, transparent 2px 5px), linear-gradient(160deg, ${uiMix(fill, WHITE, 0.08)}, ${fill})`,
});

// A drawn edge round the bubble (CSS border-image, nine slices of a 48-unit
// square: its corners kept, its sides stretched or repeated), for a shape
// CSS corners cannot make: cut corners, a torn edge, rivets. Its inside is
// the texture's. Each draws its band in the fill, its line in `line`.
const FRAME = 48;
const SLICE = 16;
const frameSvg = (inside) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FRAME} ${FRAME}">${inside}</svg>`;
const torn = () => {
  const edge = (from, to, along) => Array.from({ length: 9 }, (_, i) => along(from + ((to - from) * i) / 8, i % 2 ? 2.5 : 0.5));
  return [
    ...edge(0, FRAME, (x, d) => [x, d]),
    ...edge(0, FRAME, (y, d) => [FRAME - d, y]),
    ...edge(FRAME, 0, (x, d) => [x, FRAME - d]),
    ...edge(FRAME, 0, (y, d) => [d, y]),
  ].map(([x, y]) => `${x} ${y}`).join(' ');
};
const BUBBLE_FRAMES = Object.freeze({
  none: null,
  // A console's panel: two corners cut, a lit line along it.
  chamfer: ({ fill, line }) => ({
    repeat: 'stretch',
    svg: frameSvg(`<polygon points="10,1 47,1 47,38 38,47 1,47 1,10" fill="${fill}" stroke="${line}" stroke-width="1.5"/>`),
  }),
  // A carved slab: every corner chiselled, a heavy line.
  slab: ({ fill, line }) => ({
    repeat: 'stretch',
    svg: frameSvg(`<polygon points="7,1 41,1 47,7 47,41 41,47 7,47 1,41 1,7" fill="${fill}" stroke="${line}" stroke-width="2.5"/>`),
  }),
  // A torn scrap: every edge ragged, repeated along the sides.
  torn: ({ fill }) => ({ repeat: 'round', svg: frameSvg(`<polygon points="${torn()}" fill="${fill}"/>`) }),
  // A brass plate: a bevelled rim and a rivet in each corner.
  plate: ({ fill, line }) => {
    const rivet = (x, y) => `<circle cx="${x}" cy="${y}" r="2.6" fill="${uiMix(line, WHITE, 0.35)}" stroke="${uiMix(line, BLACK, 0.5)}" stroke-width=".8"/>`;
    return {
      repeat: 'stretch',
      svg: frameSvg(`<rect x="1.5" y="1.5" width="45" height="45" rx="3" fill="${fill}" stroke="${line}" stroke-width="3"/>`
        + `<rect x="4.5" y="4.5" width="39" height="39" rx="2" fill="none" stroke="${uiMix(line, BLACK, 0.5)}" stroke-width="1"/>`
        + `${rivet(8, 8)}${rivet(40, 8)}${rivet(8, 40)}${rivet(40, 40)}`),
    };
  },
  // A slanted panel: a big cut corner, a small one, a lit bar down its side.
  slant: ({ fill, line }) => ({
    repeat: 'stretch',
    svg: frameSvg(`<polygon points="0,0 34,0 48,14 48,48 10,48 0,38" fill="${fill}"/><rect x="0" y="0" width="4" height="38" fill="${line}"/>`),
  }),
});

// The shadow the bubble throws, in --gb-bubble-tone: as CSS box-shadow, or as
// a filter where a frame or a soft glow draws its shape.
const BUBBLE_SHADOWS = Object.freeze({
  // The comic's solid shadow, down and right: the ink's own (inkShadow).
  ink: () => ({ boxShadow: inkShadow(TONE, DROP), filter: 'none' }),
  // A solid shadow straight under it.
  under: () => ({ boxShadow: `0 ${fall(1.6)} 0 ${TONE}`, filter: 'none' }),
  // A soft dark shadow, as a hanging thing casts.
  soft: () => ({ boxShadow: `${UI_SHADOWS.popup}, 0 ${fall(0.6)} 0 ${TONE}`, filter: 'none' }),
  // A glow of its colour round it.
  glow: () => ({ boxShadow: 'none', filter: `drop-shadow(0 0 7px ${uiAlpha(TONE, OPACITY.strong)})` }),
  // Its drawn shape's shadow, solid, down and right.
  drop: () => ({ boxShadow: 'none', filter: `drop-shadow(${fall()} ${fall()} 0 ${TONE})` }),
  // A pixel block's shadow, clear of its outline.
  block: () => ({ boxShadow: `${fall(1.6)} ${fall(1.6)} 0 3px ${TONE}`, filter: 'none' }),
});

// The tail, where a bubble speaks from something: an SVG `width` by `height`
// px, its point at the bottom, drawn `overlap` px over the bubble's edge so it
// joins it. `fill` and `line` are the style's tail roles.
const BUBBLE_TAILS = Object.freeze({
  // The comic's: an inked triangle, open where it meets the bubble.
  triangle: ({ fill, line }) => ({ width: 22, height: 18, overlap: 3, svg: `<path d="M0 0L11 18L22 0Z" fill="${fill}"/><path d="M1 3L11 17L21 3" fill="none" stroke="${line}" stroke-width="3"/>` }),
  // Two puffs of cloud trailing off.
  puffs: ({ fill, line }) => ({ width: 26, height: 30, overlap: 2, svg: `<circle cx="10" cy="9" r="7" fill="${fill}" stroke="${line}" stroke-width="3"/><circle cx="20" cy="23" r="4.5" fill="${fill}" stroke="${line}" stroke-width="3"/>` }),
  // Candle wax running off it.
  drip: ({ fill }) => ({ width: 24, height: 18, overlap: 2, svg: `<path d="M2 0h10v11a5 5 0 0 1-10 0z" fill="${fill}"/><path d="M15 0h6v6a3 3 0 0 1-6 0z" fill="${fill}"/>` }),
  // A console's leader line, ending in a dot on what it points at.
  leader: ({ line }) => ({ width: 10, height: 26, overlap: 0, svg: `<path d="M5 0V20" stroke="${line}" stroke-width="1.4"/><circle cx="5" cy="22" r="3.5" fill="${line}"/>` }),
  // A paper corner folded down.
  paper: ({ fill }) => ({ width: 20, height: 14, overlap: 1, svg: `<path d="M0 0H20L6 14Z" fill="${fill}"/>` }),
  // Three stars trailing off, fading.
  stars: ({ fill }) => ({ width: 28, height: 30, overlap: 0, svg: `<circle cx="7" cy="6" r="4.5" fill="${fill}"/><circle cx="16" cy="16" r="3.2" fill="${fill}"/><circle cx="23" cy="25" r="2.2" fill="${fill}"/>` }),
  // A torn strip of paper.
  torn: ({ fill }) => ({ width: 24, height: 16, overlap: 2, svg: `<path d="M0 0H24L17 6L20 9L9 16L12 9L7 7Z" fill="${fill}"/>` }),
  // A bracket holding it up.
  bracket: ({ fill, line }) => ({ width: 22, height: 20, overlap: 3, svg: `<rect x="7" y="0" width="8" height="15" fill="${fill}" stroke="${line}" stroke-width="1"/><rect x="1" y="14" width="20" height="5" rx="2" fill="${fill}" stroke="${line}" stroke-width="1"/>` }),
  // A stone wedge.
  wedge: ({ fill, line }) => ({ width: 20, height: 15, overlap: 3, svg: `<path d="M0 0H20L6 15Z" fill="${fill}" stroke="${line}" stroke-width="2" stroke-linejoin="bevel"/>` }),
  // A tendril curling off.
  curl: ({ line }) => ({ width: 26, height: 24, overlap: 2, svg: `<path d="M8 0C8 10 20 8 20 16C20 22 12 22 13 17" fill="none" stroke="${line}" stroke-width="2.4" stroke-linecap="round"/>` }),
  // Ink running off it in two drips.
  drips: ({ fill, line }) => ({ width: 24, height: 20, overlap: 3, svg: `<path d="M3 0h9v12a4.5 4.5 0 0 1-9 0z" fill="${fill}" stroke="${line}" stroke-width="1.6"/><path d="M15 0h6v6a3 3 0 0 1-6 0z" fill="${fill}" stroke="${line}" stroke-width="1.6"/>` }),
  // A tail in pixel steps.
  stairs: ({ fill, line }) => ({ width: 18, height: 15, overlap: 3, svg: `<path d="M0 0H18V3H12V6H9V9H6V12H3V15H0Z" fill="${fill}"/><path d="M18 3H12V6H9V9H6V12H3V15H0" fill="none" stroke="${line}" stroke-width="3" shape-rendering="crispEdges"/>` }),
  // An angular tab.
  angular: ({ fill }) => ({ width: 20, height: 14, overlap: 1, svg: `<path d="M0 0H20V14Z" fill="${fill}"/>` }),
});

export const BUBBLE_TEXTURE_KINDS = Object.freeze(Object.keys(BUBBLE_TEXTURES));
export const BUBBLE_FRAME_KINDS = Object.freeze(Object.keys(BUBBLE_FRAMES));
export const BUBBLE_SHADOW_KINDS = Object.freeze(Object.keys(BUBBLE_SHADOWS));
export const BUBBLE_TAIL_KINDS = Object.freeze(Object.keys(BUBBLE_TAILS));

// The style's bubble's tail, drawn (its size, overlap and SVG).
export function bubbleTail(bubble) {
  const { kind, fill, line } = bubble.tail;
  const tail = BUBBLE_TAILS[kind]({ fill: UI_COLORS[fill], line: UI_COLORS[line] });
  return { ...tail, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tail.width} ${tail.height}">${tail.svg}</svg>` };
}

// The style's bubble's frame, drawn; null for none.
export function bubbleFrame(bubble) {
  const frame = BUBBLE_FRAMES[bubble.frame];
  return frame ? frame({ fill: UI_COLORS[bubble.fill], line: UI_COLORS[bubble.border.role] }) : null;
}

// Every CSS value of the style's bubble, its colours resolved by `resolve`
// (a palette's hexes; left as roles where none is given): what bubble.js
// writes, and what a test reads.
export function bubbleLook(styleId, resolve = (text) => text) {
  const shapes = styleShapes(styleId);
  const { bubble } = shapes;
  const fill = UI_COLORS[bubble.fill];
  const frame = bubbleFrame(bubble);
  const tail = bubbleTail(bubble);
  const picture = (svg) => dataPicture(resolve(svg));
  const { width, style, role } = bubble.border;
  const look = {
    background: BUBBLE_TEXTURES[bubble.texture](fill),
    // Inside a frame only: the frame draws the band round it.
    backgroundClip: frame ? 'padding-box' : 'border-box',
    border: frame ? `${SLICE / 2}px solid transparent` : (width ? `calc(${width}px * var(--gb-ink-line)) ${style} ${UI_COLORS[role]}` : 'none'),
    radius: frame ? '0' : (bubble.radius === 'theme' ? `${shapes.radius * 2}px` : bubble.radius),
    outline: bubble.outline.width ? `${bubble.outline.width}px solid ${UI_COLORS[bubble.outline.role]}` : 'none',
    outlineOffset: `${bubble.outline.offset}px`,
    tilt: `${bubble.tilt}deg`,
    ...BUBBLE_SHADOWS[bubble.shadow](),
    tailWidth: `${tail.width}px`,
    tailHeight: `${tail.height}px`,
    tailReach: `${tail.height - tail.overlap}px`,
  };
  return {
    ...Object.fromEntries(Object.entries(look).map(([key, text]) => [key, resolve(text)])),
    borderImage: frame ? `${picture(frame.svg)} ${SLICE} / ${SLICE / 2}px ${frame.repeat}` : 'none',
    tail: picture(tail.svg),
  };
}

// One of the bubble's values as the chosen style's variable.
const value = (key) => themedValue(`bubble:${key}`, (resolve, { styleId }) => bubbleLook(styleId, resolve)[key]);

export const BUBBLE = Object.freeze(Object.fromEntries(
  ['background', 'backgroundClip', 'border', 'borderImage', 'radius', 'outline', 'outlineOffset', 'tilt', 'boxShadow', 'filter', 'tail', 'tailWidth', 'tailHeight', 'tailReach']
    .map((key) => [key, value(key)]),
));
