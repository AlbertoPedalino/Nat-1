import { STROKE_ENDS, brushStroke, drawingBox, drawingCache, inkStroke, sketch } from './handDrawing.js';
import { crackPieces, skullPieces, stonePieces } from './stonework.js';

// A roll's toast drawn as the style draws it (shapes.js rollToast.drawing), in
// place of the style's speech bubble: one thing the roll is written on,
// worked out here as pieces (the hand-drawing kit's) to the toast's size,
// drawn by MeasuredDrawing.jsx behind what the toast says.
//
// The gothic's tombstone (stonework.js): a stone under a low arch, a winged
// skull over the roll's name, a crack at each side; the dice and the total
// straight on the stone. A natural 20 grows roses up its sides, each on a
// stem of its own; a natural 1 splits it from the top, and a hand claws up before it: black,
// every edge straight, every finger to a point.

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

const DRAWINGS = Object.freeze({
  tombstone: Object.freeze({
    // The room the toast keeps over the roll's name for the winged skull, px.
    head: 58,
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
});

export const TOAST_DRAWING_KINDS = Object.freeze(['none', ...Object.keys(DRAWINGS)]);

// Whether the drawing `kind` draws a roll's toast ('none' leaves it the
// style's bubble).
export function drawsToast(kind) {
  return Boolean(DRAWINGS[kind]);
}

// The room, px, a toast drawn as `kind` keeps over the roll's name.
export function toastHead(kind) {
  return DRAWINGS[kind].head;
}

// The toast `width` by `height` px as `kind` draws it, at `moment` ('nat20',
// 'nat1' or '' for neither).
const frames = drawingCache((kind, width, height, moment) => drawingBox(DRAWINGS[kind].frame(width, height, moment), width, height));
export function toastFrame(kind, width, height, moment = '') {
  return DRAWINGS[kind] ? frames(kind, width, height, moment || '') : null;
}

// What a natural 20 grows up a toast drawn as `kind`, `width` by `height` px
// (the stems of the tombstone's roses).
const climbers = drawingCache((kind, width, height) => drawingBox(DRAWINGS[kind].climbers(width, height), width, height, 16));
export function toastClimbers(kind, width, height) {
  return DRAWINGS[kind] ? climbers(kind, width, height) : null;
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
  return DRAWINGS[kind] ? blooms(kind, index) : null;
}

// What a natural 1 raises before a toast drawn as `kind`, and the size it is
// drawn at.
export const TOAST_HAND_BOX = HAND_BOX;
const hands = drawingCache((kind) => drawingBox(DRAWINGS[kind].hand(), HAND_BOX.width, HAND_BOX.height, 0));
export function toastHand(kind) {
  return DRAWINGS[kind] ? hands(kind) : null;
}
