import { drawingBox, drawingCache } from './handDrawing.js';
import { CARTRIDGE_HEIGHT, cartridgePieces, chalkPieces, tallyAcross, tallyUpright } from './ironwork.js';

// A counter or a training mark drawn by the hand-drawing kit in place of a
// cut gem (shapes.js gemCuts.counter or .training `drawing`, GemPip.jsx):
// each one mark, worked out here as pieces to its own size; a row of
// counters (GemRow) counted in groups where the drawing counts in groups.
//
// The war's (ironwork.js). Its counters are rounds: a live round while it is
// there to spend, the spent case once spent, standing in a row as rounds
// stand in a belt; its case in the colour of what it counts. Its training
// marks are a tally in chalk: a stroke rubbed out untrained (the empty
// place), a stroke for half proficiency, two for proficiency, the two struck
// through for expertise. The tally's counters, where a style counts in chalk: an upright
// stroke while there to spend, every fifth of a row struck across the four
// before it, so a full group reads as five; one spent rubbed out with a
// thumb, its smear and the ghost of its line left.

// The marks a training mark is made of, as shares of its box: each its
// points ([x, y, pressure]) for a w by h box.
const one = (w, h) => tallyUpright(w / 2, h * 0.04, h * 0.92);
const two = (w, h) => [tallyUpright(w * 0.33, h * 0.04, h * 0.92, -0.5), tallyUpright(w * 0.67, h * 0.04, h * 0.92, 0.5)];
const TALLY_LEVELS = Object.freeze({
  // Untrained: the place a stroke would go, rubbed out (rubbed: drawn as a spent counter is).
  none: (w, h) => [{ points: one(w, h), rubbed: true }],
  half: (w, h) => [one(w, h)],
  prof: two,
  exp: (w, h) => [...two(w, h), tallyAcross(-w * 0.02, w * 1.04, h * 0.04, h * 0.92)],
});

// Each drawing: how many of a row make a group (`every`: the last of a full
// group is struck across the others; 0 for none), how tall a mark stands
// against a gem (`tall`) and how wide against its own height (`narrow`), a
// counter's pieces `width` by `height` px in `role` (there to spend, or
// spent), the strike's across a whole group, and a training mark's at a
// level ('none', 'half', 'prof', 'exp').
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
    // A training mark stands nearly twice a gem's height, as a counter's
    // stroke stands taller than a gem: the same chalk, to the same measure.
    trainingTall: 1.85,
    training: (width, height, role, level) => TALLY_LEVELS[level](width, height).flatMap((mark) => (mark.rubbed ? chalkPieces(mark.points, height * 0.17, role, true) : chalkPieces(mark, height * 0.17, role))),
  }),
  cartridge: Object.freeze({
    every: 0,
    tall: 1.55,
    narrow: 0.3,
    // The round drawn to the box: its base at the foot, its point at the top.
    mark(width, height, role, available) {
      const fitted = `scale(${height / CARTRIDGE_HEIGHT})`;
      return [{ tag: 'g', transform: fitted, children: cartridgePieces((width / 2) * (CARTRIDGE_HEIGHT / height), CARTRIDGE_HEIGHT, available, role) }];
    },
  }),
});

export const COUNTER_DRAWING_KINDS = Object.freeze(Object.keys(DRAWINGS));
export const TRAINING_LEVELS = Object.freeze(Object.keys(TALLY_LEVELS));

// How the drawing `kind` lays a row of counters: `every` so many a group (0
// for none), a mark `tall` times a gem's height and `narrow` times its own
// height wide.
export function counterGroup(kind) {
  const { every, tall, narrow } = DRAWINGS[kind];
  return { every, tall, narrow };
}

// Whether the drawing `kind` draws a training mark, and how much larger than
// a gem it stands (`trainingTall`: chalk is drawn bigger than a cut stone).
export function drawsTraining(kind) {
  return Boolean(DRAWINGS[kind]?.training);
}
export function trainingScale(kind) {
  return DRAWINGS[kind]?.trainingTall ?? 1;
}

// The mark of the counter at `place` of its row, `width` by `height` px in
// `role`, there to spend (`available`) or spent, as `kind` draws it.
const marks = drawingCache((kind, width, height, role, available, place) => drawingBox(DRAWINGS[kind].mark(width, height, role, available, place), width, height, 5));
export function counterMark(kind, width, height, role, available, place = 0) {
  return marks(kind, width, height, role, Boolean(available), place % 5);
}

// The strike across a full group `width` by `height` px (the group's own
// box), in `role`: the group's last counter, there to spend or spent. Null
// where the drawing counts in no groups.
const strikes = drawingCache((kind, width, height, role, available) => drawingBox(DRAWINGS[kind].strike(width, height, role, available), width, height, 5));
export function counterStrike(kind, width, height, role, available) {
  return DRAWINGS[kind].strike ? strikes(kind, width, height, role, Boolean(available)) : null;
}

// The training mark at `level`, `width` by `height` px in `role`, as `kind`
// draws it (any level but those it knows is untrained: a skill no one is
// trained in has none); null where it draws none.
const trainings = drawingCache((kind, width, height, role, level) => drawingBox(DRAWINGS[kind].training(width, height, role, level), width, height, 4));
export function trainingMark(kind, width, height, role, level) {
  return drawsTraining(kind) ? trainings(kind, width, height, role, TALLY_LEVELS[level] ? level : 'none') : null;
}
