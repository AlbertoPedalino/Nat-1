import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FEET_PER_CELL,
  MEASURE_SHAPES,
  measureFeet,
  measureLabel,
  normalizeShape,
  cellDistance,
  feetBetween,
  formatFeet,
  formatMiles,
  movementLabel,
  overlandLabel,
  stepsBetween,
} from './measure.js';

// A wilderness map is read in country, not in corridors: given a mile scale the
// ruler and the carry badge answer in miles, and say how many cells that was —
// travel time on a hexcrawl is per hex, not per mile.
test('a scene with a mile scale is measured in miles and cells', () => {
  assert.equal(stepsBetween({ x: 0, y: 0 }, { x: 3, y: 0 }, { shape: 'hex' }), 3);
  assert.equal(formatMiles(18.04), '18 mi');
  assert.equal(
    overlandLabel({ x: 0, y: 0 }, { x: 3, y: 0 }, { milesPerCell: 6, shape: 'hex' }),
    '18 mi · 3 hexes',
  );
  assert.equal(
    overlandLabel({ x: 0, y: 0 }, { x: 1, y: 0 }, { milesPerCell: 6, shape: 'hex' }),
    '6 mi · 1 hex',
  );
  assert.equal(
    measureLabel('radius', { x: 0, y: 0 }, { x: 2, y: 0 }, { milesPerCell: 2.5 }),
    '5 mi · 2 squares radius',
  );
  assert.equal(
    movementLabel({ x: 0, y: 0 }, { x: 2, y: 0 }, { milesPerCell: 6, shape: 'hex' }),
    '12 mi · 2 hexes',
  );
  // Without one it is a dungeon, and a dungeon is measured in feet.
  assert.equal(overlandLabel({ x: 0, y: 0 }, { x: 3, y: 0 }, { milesPerCell: 0 }), '');
  assert.equal(measureLabel('line', { x: 0, y: 0 }, { x: 3, y: 0 }, {}), '15 ft');
});

test('a straight move is one square per cell crossed', () => {
  assert.equal(cellDistance({ x: 0, y: 0 }, { x: 3, y: 0 }), 3);
  assert.equal(cellDistance({ x: 0, y: 0 }, { x: 0, y: 4 }), 4);
  assert.equal(feetBetween({ x: 0, y: 0 }, { x: 6, y: 0 }), 30);
  assert.equal(FEET_PER_CELL, 5);
});

// The rule that surprises people: in 5e a diagonal costs the same as a straight
// step, so this is 15 ft and not 25.
test('by default a diagonal costs one square, as in 5e', () => {
  assert.equal(cellDistance({ x: 0, y: 0 }, { x: 3, y: 2 }), 3);
  assert.equal(feetBetween({ x: 0, y: 0 }, { x: 3, y: 2 }), 15);
  assert.equal(cellDistance({ x: 0, y: 0 }, { x: 4, y: 4 }), 4);
});

test('the 5-10-5 variant charges every second diagonal double', () => {
  const rule = 'alternating';
  assert.equal(cellDistance({ x: 0, y: 0 }, { x: 1, y: 1 }, rule), 1);
  assert.equal(cellDistance({ x: 0, y: 0 }, { x: 2, y: 2 }, rule), 3);
  assert.equal(cellDistance({ x: 0, y: 0 }, { x: 3, y: 3 }, rule), 4);
  assert.equal(cellDistance({ x: 0, y: 0 }, { x: 4, y: 4 }, rule), 6);
  assert.equal(feetBetween({ x: 0, y: 0 }, { x: 2, y: 2 }, { rule }), 15);
});

test('distance is symmetric and never negative', () => {
  assert.equal(cellDistance({ x: 5, y: 5 }, { x: 1, y: 2 }), cellDistance({ x: 1, y: 2 }, { x: 5, y: 5 }));
  assert.equal(cellDistance({ x: -3, y: -3 }, { x: 0, y: 0 }), 3);
});

test('a fractional drag position is measured by the square it lands on', () => {
  assert.equal(cellDistance({ x: 0, y: 0 }, { x: 2.4, y: 0 }), 2);
  assert.equal(cellDistance({ x: 0, y: 0 }, { x: 2.6, y: 0 }), 3);
});

test('a piece that has not left its square shows no badge', () => {
  assert.equal(movementLabel({ x: 2, y: 2 }, { x: 2, y: 2 }), '');
  assert.equal(movementLabel({ x: 2, y: 2 }, { x: 2.2, y: 2 }), '');
  assert.equal(movementLabel({ x: 2, y: 2 }, { x: 4, y: 2 }), '10 ft');
});

// The shapes differ in what is drawn, not in how far it reaches: all of them
// answer "how far from the origin".
test('every ruler shape reports the same distance, labelled for its template', () => {
  const from = { x: 0, y: 0 };
  const to = { x: 4, y: 0 };
  assert.equal(measureLabel('line', from, to), '20 ft');
  assert.equal(measureLabel('radius', from, to), '20 ft radius');
  assert.equal(measureLabel('cone', from, to), '20 ft cone');
  assert.equal(measureLabel('square', from, to), '20 ft square');
  assert.equal(measureFeet('cone', from, to), 20);

  // An unknown shape is a line rather than an error.
  assert.equal(normalizeShape('nonsense'), 'line');
  assert.deepEqual([...MEASURE_SHAPES], ['line', 'radius', 'cone', 'square']);

  // Nothing to say before the drag leaves the square it started in.
  assert.equal(measureLabel('radius', from, from), '');
});

test('a custom cell scale is honoured, and nonsense falls back to five feet', () => {
  assert.equal(feetBetween({ x: 0, y: 0 }, { x: 2, y: 0 }, { feetPerCell: 10 }), 20);
  assert.equal(feetBetween({ x: 0, y: 0 }, { x: 2, y: 0 }, { feetPerCell: 0 }), 10);
  assert.equal(feetBetween({ x: 0, y: 0 }, { x: 2, y: 0 }, { feetPerCell: 'x' }), 10);
  assert.equal(formatFeet(12.4), '12 ft');
});
