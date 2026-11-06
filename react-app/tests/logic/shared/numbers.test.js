import test from 'node:test';
import assert from 'node:assert/strict';
import { clamp, clampInt } from '../../../src/shared/numbers.js';

test('clamp holds a value in range; an inverted range gives its min', () => {
  assert.deepEqual([-5, 3, 12].map((v) => clamp(v, 0, 10)), [0, 3, 10]);
  assert.equal(clamp(0.5, 0, 1), 0.5);
  assert.equal(clamp(50, 100, 40), 100);
});

test('clampInt rounds, clamps, and falls back on what is not a number', () => {
  assert.deepEqual([2.4, 2.6, -3, 120, '7'].map((v) => clampInt(v, 0, 99)), [2, 3, 0, 99, 7]);
  assert.equal(clampInt('abc', 1, 20), 1);
  assert.equal(clampInt(undefined, 1, 20, 4), 4);
});
