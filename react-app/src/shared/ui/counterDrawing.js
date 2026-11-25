import { drawingBox, drawingCache } from './handDrawing.js';
import { chalkPieces, tallyAcross, tallyUpright } from './ironwork.js';

// A counter drawn by the hand-drawing kit in place of a cut gem (shapes.js
// gemCuts.counter `drawing`, GemPip.jsx): each counter one mark, worked out
// here as pieces to its own size; a row of them (GemRow) counted in groups.
//
// The war's tally (ironwork.js): the count kept in chalk. A counter there to
// spend is an upright stroke; every fifth of a row is struck across the four
// before it, so a full group reads as five; one spent is rubbed out with a
// thumb, its smear and the ghost of its line left.

// Each drawing: how many of a row make a group (`every`: the last of a full
// group is struck across the others), how tall a mark stands against a gem
// (`tall`) and how wide against its own height (`narrow`), a mark's pieces
// `width` by `height` px in `role` (there to spend, or spent), and the
// strike's across a whole group.
const DRAWINGS = Object.freeze({
  tally: Object.freeze({
    every: 5,
    tall: 1.3,
    narrow: 0.42,
    mark(width, height, role, available, place) {
      // Each stroke leans its own way, as a hand makes them.
      const lean = (((place * 7) % 5) - 2) * 0.5;
      return chalkPieces(tallyUpright(width / 2, height * 0.06, height * 0.88, lean), height * 0.17, role, !available);
    },
    strike(width, height, role, available) {
      return chalkPieces(tallyAcross(-width * 0.06, width * 1.08, height * 0.06, height * 0.88), height * 0.17, role, !available);
    },
  }),
});

export const COUNTER_DRAWING_KINDS = Object.freeze(Object.keys(DRAWINGS));

// How the drawing `kind` lays a row of counters: `every` so many a group, a
// mark `tall` times a gem's height and `narrow` times its own height wide.
export function counterGroup(kind) {
  const { every, tall, narrow } = DRAWINGS[kind];
  return { every, tall, narrow };
}

// The mark of the counter at `place` of its row, `width` by `height` px in
// `role`, there to spend (`available`) or spent, as `kind` draws it.
const marks = drawingCache((kind, width, height, role, available, place) => drawingBox(DRAWINGS[kind].mark(width, height, role, available, place), width, height, 5));
export function counterMark(kind, width, height, role, available, place = 0) {
  return marks(kind, width, height, role, Boolean(available), place % 5);
}

// The strike across a full group `width` by `height` px (the group's own
// box), in `role`: the group's last counter, there to spend or spent.
const strikes = drawingCache((kind, width, height, role, available) => drawingBox(DRAWINGS[kind].strike(width, height, role, available), width, height, 5));
export function counterStrike(kind, width, height, role, available) {
  return strikes(kind, width, height, role, Boolean(available));
}
