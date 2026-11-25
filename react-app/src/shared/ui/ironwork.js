import { OPACITY } from './colors.js';
import { seededRandom } from '../seededRandom.js';
import { STROKE_ENDS, brushStroke, resampled } from './handDrawing.js';

// Rusted steel and barbed wire, as the hand-drawing kit draws them
// (handDrawing.js): what the war's dugout is made of, wherever a piece of it
// is bolted (a panel's banner, panelBanner.js; an app notice,
// noticeDrawing.js). Pieces coloured by the palette's role names. Lit, not
// inked: a plate is shaded top to foot, worn bright along its top.

// A plate of dull metal or dressed stone, shaded top to foot.
export const STEEL = Object.freeze({ shade: [[0, 'surfaceRaised'], [0.5, 'surfaceHeader'], [1, 'surfaceDeep']] });

// A plate of steel cut to the path `outline`, `width` px wide from `top` and
// `height` px high: the plate, rust bloomed over it (as `seed` throws it; in
// the palette's orange, never its red: on a pale plate red reads as blood),
// its top edge worn bright.
export function steelPieces(outline, width, top, height, seed, blooms = Math.max(2, Math.round(width / 140))) {
  const random = seededRandom(`steel-${seed}`);
  const rust = Array.from({ length: blooms }, () => ({
    tag: 'ellipse', cx: random() * width, cy: top + 4 + random() * (height - 6), rx: 18 + random() * 34, ry: 5 + random() * 9, fill: 'warningStrong', blur: 4, opacity: OPACITY.shade,
  }));
  return [
    { tag: 'path', d: outline, fill: STEEL, stroke: 'edge', strokeWidth: 1 },
    { tag: 'g', clip: outline, children: [...rust, { tag: 'rect', x: 0, y: top, width, height: 1.2, fill: 'textPrimary', opacity: OPACITY.tint }] },
  ];
}

// A bolt's head at (cx, cy).
export const boltPieces = (cx, cy) => [{ tag: 'circle', cx, cy, r: 2.4, fill: 'outline' }, { tag: 'circle', cx: cx - 0.5, cy: cy - 0.5, r: 1, fill: 'surfaceDarkest' }];

// Rust run down from (x, y), `far` px: one brush stroke thinning to nothing.
export const dripPieces = (x, y, far, size = 2.2) => [
  { ...brushStroke([[x, y, 0.9], [x + 1, y + far * 0.5, 0.6], [x - 1, y + far, 0.1]], size, 'warningStrong', STROKE_ENDS.pointed), opacity: OPACITY.edge },
];

// A dent a round left, `r` px at (cx, cy): the dark of it, the light caught
// on its lower lip.
export const dentPieces = (cx, cy, r) => [
  { tag: 'circle', cx, cy, r, fill: 'black', opacity: OPACITY.heavy },
  { ...brushStroke([[cx - r, cy + r * 0.3, 0.2], [cx - r * 0.2, cy + r * 1.1, 0.9], [cx + r * 0.95, cy + r * 0.5, 0.2]], 1.5, 'textPrimary'), opacity: OPACITY.strong },
];

// Days counted in scratches from (x, y), each `height` px: every group of
// `groups` its strokes, a fifth struck across the four.
export function tallyPieces(x, y, height, groups) {
  const scratch = (points) => ({ ...brushStroke(points, 1.7, 'textPrimary'), opacity: OPACITY.strong });
  return groups.flatMap((count, group) => {
    const left = x + group * 40;
    const bars = Array.from({ length: Math.min(count, 4) }, (_, i) => scratch([[left + i * 6.5 + (i % 2), y, 0.3], [left + i * 6.5, y + height * 0.5, 0.9], [left + i * 6.5 + 1.2, y + height, 0.4]]));
    return count > 4 ? [...bars, scratch([[left - 5, y + height * 0.78, 0.3], [left + 10, y + height * 0.5, 0.9], [left + 25, y + height * 0.18, 0.3]])] : bars;
  });
}

// Barbed wire along a run of points: its shadow, two strands twisted round
// each other, and every `every` px a knot with its four barbs.
export function barbedWirePieces(points, { every = 24 } = {}) {
  const run = resampled(points, 4);
  const strand = (side) => brushStroke(run.map(([x, y], i) => [x, y + Math.sin(i * 0.9) * 1.3 * side, 0.8]), 1.5, 'textMuted', STROKE_ENDS.blunt);
  const knots = [];
  let travelled = every / 2;
  for (let i = 1; i < run.length; i += 1) {
    travelled += Math.hypot(run[i][0] - run[i - 1][0], run[i][1] - run[i - 1][1]);
    if (travelled >= every) {
      travelled = 0;
      const [x, y] = run[i];
      knots.push(
        brushStroke([[x - 3.5, y - 5, 0.3], [x, y, 0.9], [x + 3, y + 5, 0.3]], 1.7, 'textMuted'),
        brushStroke([[x + 3.5, y - 5, 0.3], [x, y, 0.9], [x - 3, y + 5, 0.3]], 1.7, 'textMuted'),
        { tag: 'circle', cx: x, cy: y, r: 1.8, fill: 'textMuted' },
      );
    }
  }
  return [
    { ...brushStroke(run.map(([x, y]) => [x, y + 1.2, 0.8]), 3.1, 'black', STROKE_ENDS.blunt), opacity: OPACITY.strong },
    strand(1),
    strand(-1),
    ...knots,
  ];
}

// The staple a wire is held by at (x, y).
export const staplePieces = (x, y) => [brushStroke([[x - 3, y + 6, 0.8], [x - 3, y - 4, 0.8], [x + 3, y - 4, 0.8], [x + 3, y + 6, 0.8]], 1.8, 'outline', STROKE_ENDS.blunt)];
