import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FEET_PER_CELL,
  cellDistance,
  feetBetween,
  formatFeet,
  movementLabel,
} from './measure.js';

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

test('a custom cell scale is honoured, and nonsense falls back to five feet', () => {
  assert.equal(feetBetween({ x: 0, y: 0 }, { x: 2, y: 0 }, { feetPerCell: 10 }), 20);
  assert.equal(feetBetween({ x: 0, y: 0 }, { x: 2, y: 0 }, { feetPerCell: 0 }), 10);
  assert.equal(feetBetween({ x: 0, y: 0 }, { x: 2, y: 0 }, { feetPerCell: 'x' }), 10);
  assert.equal(formatFeet(12.4), '12 ft');
});
