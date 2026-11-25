import { OPACITY } from './colors.js';
import { seededRandom } from '../seededRandom.js';
import { STROKE_ENDS, boxPath, brushStroke, polygonPath, resampled, roundedBoxPath, sketch, softShadow } from './handDrawing.js';

// Rusted steel and barbed wire, as the hand-drawing kit draws them
// (handDrawing.js): what the war's dugout is made of, wherever a piece of it
// is bolted (a panel's banner, panelBanner.js; an app notice,
// noticeDrawing.js), and what its soldiers leave in it: the tags they wear
// (the ability scores, abilityDrawing.js), the count they keep in chalk (a
// spell's slots, counterDrawing.js), the belt of rounds and the corrugated
// iron over their heads (a panel's and a stat tile's banner), the medal that
// comes with a telegram (a roll's toast, toastDrawing.js). Pieces coloured by
// the palette's role names. Lit, not inked: a plate is shaded top to foot,
// worn bright along its top.

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
const dripPieces = (x, y, far, size = 2.2) => [
  { ...brushStroke([[x, y, 0.9], [x + 1, y + far * 0.5, 0.6], [x - 1, y + far, 0.1]], size, 'warningStrong', STROKE_ENDS.pointed), opacity: OPACITY.edge },
];

// A dent a round left, `r` px at (cx, cy): the dark of it, the light caught
// on its lower lip.
export const dentPieces = (cx, cy, r) => [
  { tag: 'circle', cx, cy, r, fill: 'black', opacity: OPACITY.heavy },
  { ...brushStroke([[cx - r, cy + r * 0.3, 0.2], [cx - r * 0.2, cy + r * 1.1, 0.9], [cx + r * 0.95, cy + r * 0.5, 0.2]], 1.5, 'textPrimary'), opacity: OPACITY.strong },
];

// A tally's marks, as the points of their strokes ([x, y, pressure]): an
// upright one at `x`, `height` px down from `top`, leaning `lean` px; and the
// fifth, struck across the four before it from `left`, `wide` px.
export const tallyUpright = (x, top, height, lean = 0) => [[x + lean, top, 0.5], [x - lean * 0.4, top + height * 0.5, 0.9], [x + lean * 0.6, top + height, 0.5]];
export const tallyAcross = (left, wide, top, height) => [[left, top + height * 0.78, 0.5], [left + wide * 0.5, top + height * 0.5, 0.9], [left + wide, top + height * 0.18, 0.5]];

// A mark of chalk through `points`, `size` px at its thickest, in `fill`: put
// on twice, as chalk goes on (a second, thinner pass a hair beside the
// first), pointed at both ends; or, `rubbed`, what a thumb leaves of one: its
// smear, and the ghost of its line.
const CHALKED = Object.freeze({ ...STROKE_ENDS.tapered, thinning: 0.5 });
export function chalkPieces(points, size, fill, rubbed = false) {
  if (rubbed) {
    return [
      { ...brushStroke(points, size * 2.6, fill, { ...CHALKED, thinning: 0.2 }), blur: size * 0.5, opacity: OPACITY.tint },
      { ...brushStroke(points, size * 0.5, fill, CHALKED), opacity: OPACITY.fill },
    ];
  }
  const beside = points.map(([x, y, pressure], at) => [x + (1 - at) * size * 0.2, y, pressure]);
  return [
    { ...brushStroke(points, size, fill, CHALKED), opacity: OPACITY.solid },
    { ...brushStroke(beside, size * 0.6, fill, CHALKED), opacity: OPACITY.solid },
  ];
}

// A soldier's tag, `width` by `height` px: a plate of stamped steel with
// round corners, the notch in its right end the stamping machine held it by.
export function tagOutline(width, height) {
  const r = Math.min(height * 0.22, 12);
  const notch = height * 0.62;
  return `M${r} 0 H${width - r} Q${width} 0 ${width} ${r} V${notch - 4} L${width - 4} ${notch} L${width} ${notch + 4} V${height - r} Q${width} ${height} ${width - r} ${height} H${r} Q0 ${height} 0 ${height - r} V${r} Q0 0 ${r} 0 Z`;
}

// A soldier's tag lying flat, cut to `outline` in a box `width` by `height`
// px: its shadow, close under it; the steel, a cool grey (the paper's shade
// greyed and cooled, so what is stamped on it reads in the paper's ink in
// either palette), brushed along its length, a light caught across it; the rolled
// rim stamped round its face, lit along its top and dark along its foot;
// the thin black rubber it is rimmed with; and the hole its chain runs
// through, `hole` px from its left end. `dull` for the one lying under
// another; a fleck or two of rust as `seed` throws them.
export function tagPieces(outline, width, height, seed, { dull = false, hole = 10 } = {}) {
  const random = seededRandom(`tag-${seed}`);
  const rim = tagOutline(width - 8, height - 8);
  // The rim's line once lit, once in shade: set in 4px, nudged up or down.
  const rolled = (shift, fill, opacity) => {
    const moved = `translate(${4 + shift} ${4 + shift})`;
    return { tag: 'g', transform: moved, opacity, children: [{ tag: 'path', d: rim, fill: 'none', stroke: fill, strokeWidth: 1.1 }] };
  };
  const lower = height / 2;
  const rust = Array.from({ length: 2 }, () => ({
    tag: 'ellipse', cx: random() * width, cy: random() < 0.5 ? 2 : height - 2, rx: 3 + random() * 4, ry: 2 + random() * 2, fill: 'warningStrong', blur: 1.5, opacity: OPACITY.line,
  }));
  return [
    softShadow(outline, { blur: 1.5, opacity: OPACITY.heavy, shift: [1, 2] }),
    { tag: 'path', d: outline, fill: 'paperShade' },
    {
      tag: 'g',
      clip: outline,
      children: [
        { tag: 'rect', x: 0, y: 0, width, height, fill: 'textMuted', opacity: OPACITY.edge },
        { tag: 'rect', x: 0, y: 0, width, height, fill: 'info', opacity: OPACITY.tint },
        ...sketch('rectangle', -4, 1, width + 8, height - 2, { seed, roughness: 0.2, fill: 'white', fillStyle: 'hachure', hachureAngle: 0, hachureGap: 1.8, fillWeight: 0.3, opacity: OPACITY.tint }),
        { tag: 'path', d: polygonPath([[width * 0.18, 0], [width * 0.36, 0], [width * 0.22, height], [width * 0.04, height]]), fill: 'white', blur: 3, opacity: OPACITY.fill },
        { tag: 'rect', x: 0, y: height * 0.6, width, height: lower, fill: 'black', blur: 4, opacity: OPACITY.tint },
        ...rust,
        ...(dull ? [{ tag: 'rect', x: 0, y: 0, width, height, fill: 'black', opacity: OPACITY.shade }] : []),
        rolled(-0.6, 'white', OPACITY.strong),
        rolled(0.6, 'black', OPACITY.line),
      ],
    },
    { tag: 'path', d: outline, fill: 'none', stroke: 'black', strokeWidth: 2, opacity: OPACITY.heavy },
    { tag: 'circle', cx: hole, cy: height / 2, r: 3.2, fill: 'black' },
    { ...brushStroke([[hole - 2, height / 2 + 3.6, 0.8], [hole + 3.4, height / 2 + 1.6, 0.8]], 0.9, 'white', STROKE_ENDS.blunt), opacity: OPACITY.edge },
  ];
}

// A ball chain along a run of points, its beads `r` px: each its shadow, the
// bead, the light on it.
export function ballChainPieces(points, r = 1.3) {
  return resampled(points, r * 2.3).flatMap(([x, y]) => [
    { tag: 'circle', cx: x, cy: y + 0.7, r: r + 0.5, fill: 'black', opacity: OPACITY.strong },
    { tag: 'circle', cx: x, cy: y, r, fill: 'textMuted' },
    { tag: 'circle', cx: x - r * 0.3, cy: y - r * 0.3, r: r * 0.36, fill: 'white', opacity: OPACITY.veil },
  ]);
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

// A sheet of corrugated iron from `x0` to `x1` across a bar, `top` to `foot`,
// as a trench is roofed with: its two edges waved, a ridge every RIDGE px
// lit along its crown and dark in its trough, rust along its foot and bloomed
// over it as `seed` throws it; at each of `bolts` (shares of its width) a
// bolt on its washer, and the rust run down from it.
const RIDGE = 20;
export function corrugatedPieces(x0, x1, top, foot, seed, bolts = []) {
  const random = seededRandom(`corrugated-${seed}`);
  const span = x1 - x0;
  const wave = (x) => Math.sin((x / RIDGE) * Math.PI * 2) * 2.6;
  const edge = (y) => [...resampled([[x0, y], [x1, y]], 4)].map(([x]) => [x, y + wave(x)]);
  const outline = polygonPath([...edge(top), ...edge(foot).reverse()]);
  const ridges = [];
  for (let x = Math.floor(x0 / RIDGE) * RIDGE - RIDGE; x < x1; x += RIDGE) {
    ridges.push(
      { tag: 'rect', x: x + RIDGE * 0.61, y: top - 4, width: RIDGE * 0.28, height: foot - top + 8, fill: 'white', blur: 2, opacity: OPACITY.strong },
      { tag: 'rect', x: x + RIDGE * 0.09, y: top - 4, width: RIDGE * 0.32, height: foot - top + 8, fill: 'black', blur: 2, opacity: OPACITY.edge },
    );
  }
  const rust = Array.from({ length: Math.max(2, Math.round(span / 80)) }, () => ({
    tag: 'ellipse', cx: x0 + random() * span, cy: top + random() * (foot - top), rx: 10 + random() * 18, ry: 5 + random() * 8, fill: 'warningStrong', blur: 4, opacity: OPACITY.shade,
  }));
  const at = (share) => x0 + span * share;
  return [
    softShadow(outline),
    { tag: 'path', d: outline, fill: 'outline' },
    {
      tag: 'g',
      clip: outline,
      children: [
        ...ridges,
        { tag: 'rect', x: x0, y: foot - 4, width: span, height: 8, fill: 'warningStrong', blur: 4, opacity: OPACITY.edge },
        ...rust,
        ...bolts.flatMap((share) => dripPieces(at(share), top + 12, foot - top - 12, 3)),
      ],
    },
    ...sketch('path', outline, { seed: 5, roughness: 0.4, stroke: 'edge', strokeWidth: 1.2 }),
    ...bolts.flatMap((share) => [{ tag: 'circle', cx: at(share), cy: top + 10, r: 5, fill: 'surfaceDarkest', stroke: 'edge', strokeWidth: 1 }, ...boltPieces(at(share), top + 10)]),
  ];
}

// Webbing cut to the path `outline`: olive canvas, its weave, its edge.
export function webbingPieces(outline, seed) {
  return [
    softShadow(outline),
    { tag: 'path', d: outline, fill: 'secondaryStrong' },
    { tag: 'path', d: outline, fill: 'black', opacity: OPACITY.strong },
    ...sketch('path', outline, { seed, roughness: 0.6, fill: 'black', fillStyle: 'cross-hatch', hachureAngle: 45, hachureGap: 3.4, fillWeight: 0.5, opacity: OPACITY.line }),
    ...sketch('path', outline, { seed: seed + 1, roughness: 0.8, stroke: 'edge', strokeWidth: 1.3 }),
  ];
}

// A machine gun's belt from `from` to `to` about the line `cy`: a rifle
// round every BELT_PITCH px, held in links of steel, as many live as `held`
// says (a share, as `seed` throws them: nobody has a full belt for long),
// the rest the spent cases of rounds fired. Drawn lit, not inked: each round in proportion (a long case narrowing at its shoulder to
// its neck, the pointed bullet in it, the groove round its base), round as a
// cylinder is round, the light down one side of it and the shade down the
// other; a spent case darker, its mouth open and sooted.
const BELT_PITCH = 10;
const CARTRIDGE = Object.freeze({ radius: 3, neck: 1.9, shoulder: 24, length: 30, bullet: 11 });
const casePath = (x, base) => {
  const { radius, neck, shoulder, length } = CARTRIDGE;
  return `M${x - radius} ${base} V${base - shoulder} L${x - neck} ${base - shoulder - 3} V${base - length} H${x + neck} V${base - shoulder - 3} L${x + radius} ${base - shoulder} V${base} Z`;
};
const bulletPath = (x, base) => {
  const { neck, length, bullet } = CARTRIDGE;
  const mouth = base - length;
  return `M${x - neck} ${mouth} Q${x - neck} ${mouth - bullet * 0.6} ${x} ${mouth - bullet} Q${x + neck} ${mouth - bullet * 0.6} ${x + neck} ${mouth} Z`;
};
// Rounds standing in a row on `base` ([{ x, live }] each: live, its bullet
// in it, or the spent case of one fired), their cases in `metal` (brass, or
// a kind's own colour on a counter): the one drawing of a round, for one
// alone (a slot's counter) as for a whole belt. Drawn as few shapes as can
// be, each part of every round in one path with the same part of the others
// (all the brass in one, all the light down them in another…): a sheet holds
// a belt on every panel, some forty rounds each, and drawn a round at a time
// they were thousands of shapes, each its own clip and blur, laid out and
// painted again whenever the page changed.
// One path of a part of each thing in `list` (`part` its path for one).
const join = (list, part) => list.map(part).join(' ');
function roundsPieces(rounds, base, metal = 'warning') {
  const { radius, neck, length, bullet } = CARTRIDGE;
  const live = rounds.filter((round) => round.live);
  const spent = rounds.filter((round) => !round.live);
  const brass = join(rounds, ({ x }) => casePath(x, base));
  const lead = join(live, ({ x }) => bulletPath(x, base));
  const whole = `${brass} ${lead}`;
  const top = (round) => base - length - (round.live ? bullet : 0);
  // A strip down every round, as far out from its middle as `from` and as wide as `wide`, shares of its radius.
  const strip = (from, wide, extra = 0) => join(rounds, (round) => boxPath(radius * wide + extra, base - top(round), round.x + radius * from, top(round)));
  return [
    ...(lead ? [{ tag: 'path', d: lead, fill: 'warningStrong' }] : []),
    { tag: 'path', d: brass, fill: metal },
    // A spent case: its brass gone dark.
    ...(spent.length ? [{ tag: 'path', d: join(spent, ({ x }) => casePath(x, base)), fill: 'black', opacity: OPACITY.line }] : []),
    // Round as a cylinder is round: the light down its left, the shade down its right.
    {
      tag: 'g',
      clip: whole,
      children: [
        { tag: 'path', d: strip(-0.55, 0.45), fill: 'white', opacity: OPACITY.edge },
        { tag: 'path', d: strip(0.2, 1), fill: 'black', opacity: OPACITY.line },
        { tag: 'path', d: strip(-1, 0, 1), fill: 'black', opacity: OPACITY.line },
        // A spent case's mouth, open and sooted.
        ...spent.map(({ x }) => ({ tag: 'ellipse', cx: x, cy: base - length, rx: radius, ry: 4, fill: 'black', opacity: OPACITY.edge })),
      ],
    },
    ...(spent.length ? [{ tag: 'path', d: join(spent, ({ x }) => `M${x - neck} ${base - length}a${neck} 0.8 0 1 0 ${neck * 2} 0a${neck} 0.8 0 1 0 ${-neck * 2} 0Z`), fill: 'black' }] : []),
    // The groove round its base.
    { tag: 'path', d: join(rounds, ({ x }) => boxPath(radius * 2, 0.9, x - radius, base - 3.4)), fill: 'black', opacity: OPACITY.strong },
    { tag: 'path', d: whole, fill: 'none', stroke: 'black', strokeWidth: 0.5, opacity: OPACITY.edge },
  ];
}

// A rifle round standing at x, its base at `base`: live or spent, its case in
// `metal`. CARTRIDGE_HEIGHT px from its base to its bullet's point.
export const CARTRIDGE_HEIGHT = CARTRIDGE.length + CARTRIDGE.bullet;
export const cartridgePieces = (x, base, live, metal) => roundsPieces([{ x, live }], base, metal);

export function cartridgeBeltPieces(from, to, cy, { seed = 3, held = 1 } = {}) {
  const random = seededRandom(`belt-${seed}`);
  const base = cy + 17;
  const { radius } = CARTRIDGE;
  const rounds = [];
  for (let x = from + 8; x < to - 4; x += BELT_PITCH) rounds.push({ x, live: random() < held });
  const loop = (y) => join(rounds, ({ x }) => roundedBoxPath(radius * 2 + 2.4, 4.2, 1.2, x - radius - 1.2, y));
  const loops = `${loop(base - 21)} ${loop(base - 9)}`;
  const straps = join(rounds.slice(0, -1), ({ x }) => boxPath(BELT_PITCH - radius * 2 - 2.4, 2.4, x + radius + 1.2, base - 15.6));
  const along = (y, height) => join(rounds, ({ x }) => boxPath(radius * 2 + 2, height, x - radius - 1, y));
  return [
    softShadow(boxPath(to - from, 26, from, base - 26), { blur: 3, opacity: OPACITY.strong, shift: [0, 3] }),
    ...roundsPieces(rounds, base),
    // The steel links: two loops round every case, a strap to the next.
    { tag: 'path', d: loops, fill: 'textMuted' },
    { tag: 'path', d: loops, fill: 'black', opacity: OPACITY.strong },
    { tag: 'path', d: `${along(base - 20.6, 0.9)} ${along(base - 8.6, 0.9)}`, fill: 'white', opacity: OPACITY.line },
    { tag: 'path', d: `${along(base - 18, 1.2)} ${along(base - 6, 1.2)}`, fill: 'black', opacity: OPACITY.edge },
    { tag: 'path', d: loops, fill: 'none', stroke: 'black', strokeWidth: 0.5, opacity: OPACITY.strong },
    { tag: 'path', d: straps, fill: 'textMuted' },
    { tag: 'path', d: straps, fill: 'black', opacity: OPACITY.heavy },
  ];
}

// A medal hung from (cx, top), its cross `r` px to the end of an arm: its
// ribbon, the ring it hangs by, the cross of blackened iron edged in brass.
export function medalPieces(cx, top, r, seed) {
  const ribbon = polygonPath([[cx - r * 0.52, top], [cx + r * 0.52, top], [cx + r * 0.52, top + r * 1.3], [cx, top + r * 1.7], [cx - r * 0.52, top + r * 1.3]]);
  const cy = top + r * 3;
  const cross = polygonPath([0, 1, 2, 3].flatMap((arm) => {
    const turn = (arm * Math.PI) / 2 - Math.PI / 2;
    const at = (far, by) => [cx + Math.cos(turn + by) * r * far, cy + Math.sin(turn + by) * r * far];
    return [at(1, -0.44), at(1, 0.44), at(0.3, Math.PI / 4)];
  }));
  return [
    softShadow(ribbon, { blur: 2 }),
    { tag: 'path', d: ribbon, fill: 'dangerDeep' },
    { tag: 'g', clip: ribbon, children: [-1, 1].map((side) => ({ tag: 'rect', x: cx + side * r * 0.4 - r * 0.12, y: top, width: r * 0.24, height: r * 2, fill: 'black', opacity: OPACITY.veil })) },
    ...sketch('path', ribbon, { seed, roughness: 0.6, stroke: 'edge', strokeWidth: 1 }),
    ...sketch('circle', cx, top + r * 1.86, r * 0.66, { seed: seed + 1, roughness: 0.5, stroke: 'warning', strokeWidth: 1.6 }),
    softShadow(cross),
    { tag: 'path', d: cross, fill: 'black' },
    { tag: 'path', d: cross, fill: 'outline', opacity: OPACITY.strong },
    ...sketch('path', cross, { seed: seed + 2, roughness: 0.5, stroke: 'warning', strokeWidth: 1.5 }),
    ...sketch('circle', cx, cy, r * 0.9, { seed: seed + 3, roughness: 0.5, stroke: 'warning', strokeWidth: 1.1, fill: 'black', fillStyle: 'solid' }),
  ];
}
