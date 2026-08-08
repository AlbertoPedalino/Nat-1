import test from 'node:test';
import assert from 'node:assert/strict';
import {
  faceLabel,
  faceNumbering,
  faceValues,
  seededRandom,
  tumbleTurns,
} from './dice3d.js';

test('the face that lands is the value that was rolled', () => {
  assert.equal(faceValues(20, 17, 20, 'seed', 3)[3], 17);
  assert.equal(faceValues(6, 1, 6, 'seed', 0)[0], 1);
});

test('the other faces are plausible numbers for that die', () => {
  const values = faceValues(6, 4, 6, 'seed');
  assert.equal(values.length, 6);
  for (const value of values) {
    assert.ok(value >= 1 && value <= 6, `${value} is not a face of a d6`);
    assert.equal(Number.isInteger(value), true);
  }
});

// A d4 is drawn on a tetrahedron, but the guard matters wherever a solid has
// more faces than the die has numbers.
test('a die with fewer numbers than faces repeats rather than hangs', () => {
  const values = faceValues(6, 2, 4, 'seed');
  assert.equal(values.length, 6);
  assert.ok(values.every((value) => value >= 1 && value <= 4));
});

test('a non-standard die rotates which values get duplicate physical faces', () => {
  const duplicateCounts = [0, 0, 0];
  for (let index = 0; index < 600; index += 1) {
    const numbering = faceNumbering(4, 3, `d3-${index}`);
    assert.equal(numbering.length, 4);
    for (let value = 1; value <= 3; value += 1) {
      if (numbering.filter((face) => face === value).length === 2) duplicateCounts[value - 1] += 1;
    }
  }

  for (const count of duplicateCounts) {
    assert.ok(count > 160 && count < 240, `duplicate distribution was ${duplicateCounts.join(', ')}`);
  }
});

test('a re-render throws the same die, not a new one', () => {
  assert.deepEqual(faceValues(20, 11, 20, 'roll-1:0'), faceValues(20, 11, 20, 'roll-1:0'));
  assert.deepEqual(tumbleTurns('roll-1:0'), tumbleTurns('roll-1:0'));
});

test('two dice in one throw do not tumble in lockstep', () => {
  assert.notDeepEqual(tumbleTurns('roll-1:0'), tumbleTurns('roll-1:1'));
});

// Whole turns only: the die has to come to rest with the rolled face towards
// the viewer, never edge-on.
test('a die lands square, however far it travelled', () => {
  for (let index = 0; index < 30; index += 1) {
    const { x, y, delayMs } = tumbleTurns(`roll:${index}`);
    assert.ok(Math.abs(x) >= 340, 'it turns at least once');
    assert.ok(Math.abs(y) >= 340);
    assert.ok(delayMs >= 0 && delayMs <= 160);
  }
});

test('the same seed gives the same stream', () => {
  const a = seededRandom('x');
  const b = seededRandom('x');
  assert.equal(a(), b());
  assert.equal(a(), b());
});

// A coin has faces, not numbers. The value behind them is still 1 and 2, because
// that is what a total is made of.
test('a coin says heads and tails; every other die says its number', () => {
  assert.equal(faceLabel(2, 1), 'Heads');
  assert.equal(faceLabel(2, 2), 'Tails');
  assert.equal(faceLabel(20, 17), '17');
  assert.equal(faceLabel(6, 3), '3');
});
