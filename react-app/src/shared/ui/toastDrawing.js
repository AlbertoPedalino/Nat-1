import { OPACITY } from './colors.js';
import { STROKE_ENDS, brushStroke, drawingBox, drawingCache, inkStroke, sketch } from './handDrawing.js';
import { crackPieces, skullPieces, stonePieces } from './stonework.js';
import { bulletHolePieces, foldedPaperPieces, frontPage, paperPieces, printPieces, rulePieces } from './paperwork.js';

// A roll's toast drawn as the style draws it (shapes.js rollToast.drawing), in
// place of the style's speech bubble: one thing the roll is written on,
// worked out here as pieces (the hand-drawing kit's) to the toast's size,
// drawn by MeasuredDrawing.jsx behind what the toast says.
//
// The gothic's tombstone (stonework.js): a stone under a low arch, a winged
// skull over the roll's name, a crack at each side; the dice and the total
// straight on the stone. A natural 20 grows roses up its sides, each on a
// stem of its own; a natural 1 splits it from the top, and a hand claws up
// before it: black, every edge straight, every finger to a point.
//
// The noir's newspaper (paperwork.js): a folded paper as the ones on a stand
// are drawn, lying a little askew, its front page a little waved at its top
// and its foot, the rest of it behind seen edge on: a hair of each page over
// its top, and down its left side thin bands turning round the fold into its
// lower corner, a thread of dark between them; on its front page the paper's
// name ("Tonight's Roll") between its rules, the roll's name its headline, a
// column of print down each side of the dice and the total, the total
// underlined twice. At a moment its headline is already printed on a block
// of its own, the roll's name under it, and the two are told apart at a
// glance: "Breaking news: Natural 20!" on red, the page arriving spinning,
// the photographers' bulbs going off round it one after the other, the total
// ringed by a pen; "Found dead: You" on ink, "Cause of death: Natural 1"
// typed under it, the page slapped down on the table and left askew, three
// rounds through it one after the other, the page jolting at each, the total
// struck out.

// The winged skull about (cx, cy): its feathers brush strokes fanning from
// the skull, longest at the top.
function wingedSkull(cx, cy) {
  const feathers = [-1, 1].flatMap((side) => [0, 1, 2, 3].map((k) => {
    const [x, y] = [cx + side * 9, cy + 2 + k * 1.5];
    return inkStroke([[x, y, 0.9], [x + side * (16 + k * 3), y - 8 + k * 4, 0.7], [x + side * (34 - k * 2), y - 14 + k * 9, 0.1]], 6 - k * 0.6, STROKE_ENDS.pointed);
  }));
  return [...feathers, ...skullPieces(cx, cy - 3, 9, 50)];
}

// The roses a natural 20 brings out, three up each side of the stone: each on
// a stem of its own, one brush stroke swaying up from the foot and thinning
// to its tip, a leaf or two off it; and at the tip its rose, a head sketched
// in two rounds of petals, a curl of ink at its heart.
//
// Each rose: its size, the side it grows on (-1 the left, 1 the right), how
// far `up` the stone it reaches (a share of its height), where its stem
// leaves the ground (`root`, px off the stone's side: the three of a side
// well apart, so each reads as a stem of its own) and how it sways on its way
// (`amp` px, from `phase`, drifting `drift` px by its tip).
const ROSES = Object.freeze([
  { size: 0.9, side: -1, up: 0.3, root: -14, amp: 5, phase: 0, drift: -2 },
  { size: 0.8, side: 1, up: 0.26, root: 14, amp: 5, phase: 0.7, drift: 2 },
  { size: 1, side: -1, up: 0.54, root: 16, amp: 7, phase: 1.3, drift: -12 },
  { size: 0.86, side: 1, up: 0.48, root: -16, amp: 7, phase: 2, drift: 12 },
  { size: 0.72, side: -1, up: 0.78, root: 1, amp: 6, phase: 2.4, drift: -3 },
  { size: 0.66, side: 1, up: 0.72, root: -1, amp: 6, phase: 3.1, drift: 3 },
].map(Object.freeze));

// How far a rose's stem stands off its side of the stone, px, `u` of the way
// up it (0 its root, 1 its tip, where the rose opens).
const off = ({ root, amp, phase, drift }, u) => root + Math.sin(u * 6 + phase) * amp * u ** 0.7 + drift * u;

// A rose's stem up a stone w by h, and its leaves.
function stem(w, h, rose, index) {
  const side = rose.side < 0 ? 3 : w - 3;
  const along = Array.from({ length: 15 }, (_, i) => {
    const u = i / 14;
    return [side + off(rose, u), h - u * rose.up * h, 1 - u * 0.7];
  });
  const leaves = [4, 9].filter((i) => rose.up > 0.4 || i === 4).flatMap((i, k) => sketch('ellipse', along[i][0] + (k % 2 ? 7 : -7), along[i][1] - 2, 12, 6, {
    seed: 300 + index * 5 + k, roughness: 0.8, stroke: 'edge', strokeWidth: 1, fill: 'success', fillStyle: 'solid',
  }));
  return [brushStroke(along, 2.2 + rose.size * 1.2, 'success', STROKE_ENDS.pointed), ...leaves];
}

// A rose's head `s` times its size (a box 28 by 28, the head at its middle).
const ROSE_BOX = 28;
function roseHead(s, seed) {
  const at = (x, y) => [x * s, y * s];
  const point = (x, y, pressure) => [...at(x, y), pressure];
  return [
    ...sketch('circle', ...at(14, 14), 24 * s, { seed, roughness: 1, stroke: 'edge', strokeWidth: 1.6, fill: 'accent', fillStyle: 'solid' }),
    ...sketch('circle', ...at(14.5, 13.5), 14 * s, { seed: seed + 1, roughness: 0.9, stroke: 'edge', strokeWidth: 1, fill: 'accentMuted', fillStyle: 'solid' }),
    inkStroke([point(11, 14, 0.3), point(14, 9.5, 0.8), point(18, 13.5, 0.7), point(14.5, 17.5, 0.5), point(12.5, 14.5, 0.2)], 2.4 * s),
  ];
}

// The hand, in a box 84 by 132, its wrist at the foot: forearm, palm, four
// fingers and a thumb, each a polygon of straight edges.
const HAND = Object.freeze([
  [[30, 132], [34, 82], [54, 82], [60, 132]],
  [[24, 86], [29, 60], [55, 57], [63, 80], [56, 90], [31, 90]],
  [[30, 62], [20, 42], [18, 24], [13, 2], [24, 22], [28, 40], [37, 60]],
  [[36, 60], [32, 34], [34, 15], [37, 0], [41, 15], [41, 34], [44, 59]],
  [[43, 59], [45, 36], [50, 18], [57, 3], [55, 21], [52, 38], [51, 59]],
  [[50, 60], [56, 42], [63, 28], [73, 16], [68, 32], [63, 45], [58, 62]],
  [[28, 80], [15, 68], [7, 54], [0, 40], [13, 55], [21, 64], [31, 70]],
]);
const HAND_BOX = Object.freeze({ width: 84, height: 132 });

// A flashbulb going off about (x, y), `r` px: its glare, its eight rays, its
// white heart.
function bulbPieces(x, y, r) {
  const rays = Array.from({ length: 8 }, (_, k) => {
    const angle = (k / 8) * Math.PI * 2 + 0.3;
    const far = r * (k % 2 ? 1.2 : 2.4);
    return brushStroke([[x, y, 1], [x + Math.cos(angle) * far * 0.5, y + Math.sin(angle) * far * 0.5, 0.5], [x + Math.cos(angle) * far, y + Math.sin(angle) * far, 0.05]], r * 0.36, 'white', STROKE_ENDS.pointed);
  });
  return [{ tag: 'circle', cx: x, cy: y, r: r * 1.6, fill: 'white', blur: r * 0.5, opacity: OPACITY.veil }, ...rays, { tag: 'circle', cx: x, cy: y, r: r * 0.4, fill: 'white' }];
}

// How large a toast writes its total, against the sheet's toast (1): what a
// drawing lays to the total (an underline, a pen's ring, a strike) is that
// much smaller on the smaller toast over a piece on the map. From where the
// toast places the total's middle and foot.
const totalScale = (totalMid, totalFoot) => (totalFoot === undefined ? 1 : Math.min(1, Math.max(0.5, (totalFoot - totalMid) / 30)));

// Each drawing: the room it keeps over the roll's name (`head`, px), its
// `look` (whether it is the style's paper, written in the bubble's ink; the
// role a natural 20's total is written in; whether it leans at a natural 1,
// whether a flash goes off at a natural 20; how it `arrive`s at a moment:
// 'spin' or 'slap'; whether it `jolts` when hit at a natural 1; whether the
// roll's name is its `headline`, and its total lettered as a page's), the
// `masthead` it prints over everything, the `headlines` it prints over the
// roll's name at a moment and the `band` they are printed on, its frame's
// pieces at a moment (laid by where the toast `places` its masthead, its dice
// and its total, where it is told), and what more it has: what grows up it
// and claws up before it (the tombstone's), the marks made on it at a moment
// (each its pieces, the point it is made `at`, the `beat` it comes on and its
// `motion`).
//
// How a mark comes (its `motion`) and how a toast arrives (its look's
// `arrive`), by the names DrawnToast.jsx moves them by.
export const TOAST_MARK_MOTIONS = Object.freeze(['pop', 'fade', 'bulb']);
export const TOAST_ARRIVALS = Object.freeze(['spin', 'slap']);

const DRAWINGS = Object.freeze({
  tombstone: Object.freeze({
    head: 58,
    look: Object.freeze({ paper: false, gold: 'warning', lean: true, flash: false }),
    frame(w, h, moment) {
      // The split a natural 1 opens, from the top down through the stone.
      let [x, y] = [w * 0.56, 12];
      const split = [[x, y, 0.3]];
      [[-8, 22], [9, 20], [-12, 24], [7, 26], [-9, 30], [5, 22]].forEach(([dx, dy], i) => { x += dx; y += dy; split.push([x, y, 1 - i * 0.13]); });
      return [
        ...stonePieces(w, h, 'low', 21),
        ...wingedSkull(w / 2, 32),
        ...crackPieces([w, h * 0.3], [[-9, 6], [-3, 10], [-10, 5], [-2, 9]], 3.2),
        ...crackPieces([0, h * 0.7], [[10, 4], [3, 9], [9, 6]], 3),
        ...(moment === 'nat1' ? [inkStroke(split, 6)] : []),
      ];
    },
    climbers(w, h) {
      return ROSES.flatMap((rose, index) => stem(w, h, rose, index));
    },
    blooms: ROSES,
    bloom(index) {
      const { size } = ROSES[index];
      return drawingBox(roseHead(size, 200 + index * 9), ROSE_BOX * size, ROSE_BOX * size, 3);
    },
    hand() {
      return HAND.flatMap((polygon, i) => sketch('polygon', polygon, { seed: 100 + i, roughness: 0.9, bowing: 0.4, stroke: 'edge', strokeWidth: 1.6, fill: 'edge', fillStyle: 'solid' }));
    },
  }),
  newspaper: Object.freeze({
    head: 22,
    look: Object.freeze({ paper: true, gold: 'accentText', lean: false, flash: true, headline: true, arrive: Object.freeze({ nat20: 'spin', nat1: 'slap' }), jolts: true, tilt: -3 }),
    masthead: "Tonight's Roll",
    headlines: Object.freeze({
      nat20: Object.freeze({ news: 'Breaking news: Natural 20!' }),
      nat1: Object.freeze({ news: 'Found dead: You', deck: 'Cause of death: Natural 1' }),
    }),
    // The block a headline is printed on: red for the news, ink for the dead.
    band(w, h, moment) {
      const block = moment === 'nat1' ? 'onPaper' : 'dangerDeep';
      return sketch('rectangle', 0, 0, w, h, { seed: 5, roughness: 0.8, bowing: 0.5, stroke: block, strokeWidth: 1.2, fill: block, fillStyle: 'solid' });
    },
    frame(w, h, moment, { dice = h * 0.5, totalMid, totalFoot, masthead = 36, wide = 0 } = {}) {
      // Its two outer columns of print, down the page beside the dice and the
      // total: as wide as those leave them (two dice and what is added take
      // more of the page than one), none where that is too little to read as
      // a column.
      const top = dice + 2;
      const tall = Math.max(0, h - 14 - top);
      const line = 52 * totalScale(totalMid, totalFoot);
      const side = Math.min(w * 0.2, w / 2 - Math.max(wide, 110) / 2 - 27);
      const gutter = (x) => ({ tag: 'rect', x, y: top, width: 0.7, height: tall, fill: 'onPaper', opacity: OPACITY.line });
      const columns = side < 18 ? [] : [...printPieces(10, top, side, tall, 31), ...printPieces(w - 10 - side, top, side, tall, 32), gutter(10 + side + 5), gutter(w - 10 - side - 5)];
      return [
        // A folded paper: the rest of it behind its front page.
        ...foldedPaperPieces(w, h, 40),
        ...paperPieces(frontPage(w, h), 4),
        // A thick and a thin rule over the paper's name (its corner left to
        // the X that closes the page) and under it, a hairline under its headline.
        ...rulePieces(10, 10, w - 50, 2.2),
        ...rulePieces(10, 14, w - 50, 0.7),
        ...rulePieces(10, masthead + 3, w - 20, 1.7),
        ...rulePieces(10, masthead + 7, w - 20, 0.7),
        ...rulePieces(10, dice - 5, w - 20, 0.7),
        ...columns,
        // The total, underlined twice.
        ...(totalFoot ? [...rulePieces(w / 2 - line, totalFoot + 1, line * 2, 2.2), ...rulePieces(w / 2 - line, totalFoot + 5, line * 2, 0.7)] : []),
      ];
    },
    // Each comes after the page has spun in and stopped.
    marks(w, h, moment, { totalMid = h - 34, totalFoot } = {}) {
      const [tx, ty] = [w / 2, totalMid];
      const s = totalScale(totalMid, totalFoot);
      if (moment === 'nat20') {
        // A pen run round the total, a little past where it started.
        const ring = Array.from({ length: 30 }, (_, k) => {
          const angle = (k / 26) * Math.PI * 2 - 2;
          const out = 1 + k * 0.004;
          return [tx + Math.cos(angle) * 46 * s * out, ty + Math.sin(angle) * 31 * s * out, 0.4 + Math.sin((k / 30) * Math.PI) * 0.5];
        });
        return [
          // The photographers' bulbs, round the page, one after the other.
          ...[[-8, 30, 14], [w + 8, h * 0.4, 17], [-6, h * 0.8, 13], [w + 6, h * 0.94, 15]].map(([x, y, r], k) => ({ pieces: bulbPieces(x, y, r), at: [x, y], beat: 4 + k, motion: 'bulb' })),
          { pieces: [brushStroke(ring, 3, 'accentText')], at: [tx, ty], beat: 6, motion: 'fade' },
        ];
      }
      if (moment !== 'nat1') return [];
      return [
        ...[[0.14, 0.42, 5], [0.86, 0.6, 4.4], [0.3, 0.92, 4.6]].map(([u, v, r], k) => ({
          pieces: bulletHolePieces(w * u, h * v, r, { cracks: 7, reach: 17, seed: 20 + k }), at: [w * u, h * v], beat: 4 + k * 1.2, motion: 'pop',
        })),
        { pieces: [{ ...brushStroke([[tx - 44 * s, ty + 14 * s, 0.3], [tx, ty, 1], [tx + 46 * s, ty - 16 * s, 0.3]], 7 * s, 'dangerDeep'), opacity: OPACITY.veil }], at: [tx, ty], beat: 7.8, motion: 'fade' },
      ];
    },
  }),
});

export const TOAST_DRAWING_KINDS = Object.freeze(['none', ...Object.keys(DRAWINGS)]);

// Whether the drawing `kind` draws a roll's toast ('none' leaves it the
// style's bubble).
export function drawsToast(kind) {
  return Boolean(DRAWINGS[kind]);
}

// How a toast drawn as `kind` is written and moved (its `look`): `paper`,
// `gold`, `lean`, `flash`, `arrive`, `jolts`, `headline`, `tilt` (the degrees
// it lies askew at rest, if any).
export function toastLook(kind) {
  return DRAWINGS[kind].look;
}

// What a toast drawn as `kind` prints over everything it says (a paper's
// name), and over the roll's name at `moment`: its `news`, which says the
// moment (the toast then leaves the moment's own words out), and the `deck`
// typed under it, if any; null where it prints nothing.
export function toastMasthead(kind) {
  return DRAWINGS[kind]?.masthead ?? null;
}
export function toastHeadline(kind, moment = '') {
  return DRAWINGS[kind]?.headlines?.[moment || ''] ?? null;
}

// The block the news is printed on (toastHeadline), `width` by `height` px
// (the headline's own size), as `kind` draws it at `moment`; null where it
// prints on none.
const bands = drawingCache((kind, width, height, moment) => drawingBox(DRAWINGS[kind].band(width, height, moment), width, height, 6));
export function toastBand(kind, width, height, moment = '') {
  return DRAWINGS[kind]?.band && moment ? bands(kind, width, height, moment) : null;
}

// Where a toast places what its drawing is laid by, as a drawing takes it:
// the top of its dice, the middle and the foot of its total, the foot of its
// masthead, and how `wide` the dice or the total stand across it, px (each
// left out where the toast shows none).
const placed = (dice, totalMid, totalFoot, masthead, wide) => ({
  ...(dice === undefined ? null : { dice }), ...(totalMid === undefined ? null : { totalMid, totalFoot }),
  ...(masthead === undefined ? null : { masthead }), ...(wide === undefined ? null : { wide }),
});

// The marks made on a toast `width` by `height` px drawn as `kind`, at
// `moment`: each its `pieces` and the `box` they are seen through, the point
// it is made `at`, the `beat` it comes on, its `motion`. None where the
// drawing marks nothing.
const NO_MARKS = Object.freeze([]);
const marked = drawingCache((kind, width, height, moment, ...places) => DRAWINGS[kind].marks(width, height, moment, placed(...places))
  .map(({ pieces, ...mark }) => ({ ...mark, ...drawingBox(pieces, width, height, 12) })));
export function toastMarks(kind, width, height, moment = '', places = []) {
  return DRAWINGS[kind]?.marks ? marked(kind, width, height, moment || '', ...places) : NO_MARKS;
}

// The room, px, a toast drawn as `kind` keeps over the roll's name.
export function toastHead(kind) {
  return DRAWINGS[kind].head;
}

// The toast `width` by `height` px as `kind` draws it, at `moment` ('nat20',
// 'nat1' or '' for neither), laid by its `places` ([top of the dice, middle
// of the total, its foot, foot of the masthead, width of the dice or the
// total], px) where it is told them.
const frames = drawingCache((kind, width, height, moment, ...places) => drawingBox(DRAWINGS[kind].frame(width, height, moment, placed(...places)), width, height));
export function toastFrame(kind, width, height, moment = '', places = []) {
  return DRAWINGS[kind] ? frames(kind, width, height, moment || '', ...places) : null;
}

// What a natural 20 grows up a toast drawn as `kind`, `width` by `height` px
// (the stems of the tombstone's roses).
const climbers = drawingCache((kind, width, height) => drawingBox(DRAWINGS[kind].climbers(width, height), width, height, 16));
export function toastClimbers(kind, width, height) {
  return DRAWINGS[kind]?.climbers ? climbers(kind, width, height) : null;
}

// What opens along them: each bloom's place (`side` -1 the left edge or 1 the
// right, `shift` px off it, `up` a share of the toast's height from its
// foot) and its `size` px, in the order they open; and the bloom at `index`
// as its drawing.
export function toastBlooms(kind) {
  return (DRAWINGS[kind]?.blooms || []).map((rose) => ({
    side: rose.side, up: rose.up, shift: Math.round((rose.side < 0 ? 3 : -3) + off(rose, 1)), size: Math.round(ROSE_BOX * rose.size),
  }));
}
const blooms = drawingCache((kind, index) => DRAWINGS[kind].bloom(index));
export function toastBloom(kind, index) {
  return DRAWINGS[kind]?.bloom ? blooms(kind, index) : null;
}

// What a natural 1 raises before a toast drawn as `kind`, and the size it is
// drawn at.
export const TOAST_HAND_BOX = HAND_BOX;
const hands = drawingCache((kind) => drawingBox(DRAWINGS[kind].hand(), HAND_BOX.width, HAND_BOX.height, 0));
export function toastHand(kind) {
  return DRAWINGS[kind]?.hand ? hands(kind) : null;
}
