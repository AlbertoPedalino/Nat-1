import test from 'node:test';
import assert from 'node:assert/strict';
import { abilityModifier } from '../../../../../src/shared/character/progression/abilityModifier.js';

test('the modifier rounds down, odd scores included', () => {
  assert.deepEqual([1, 8, 9, 10, 11, 15, 20, 30].map(abilityModifier), [-5, -1, -1, 0, 0, 2, 5, 10]);
  assert.equal(abilityModifier('14'), 2);
});

test('a missing or unreadable score counts as 10', () => {
  assert.deepEqual([undefined, null, '', 'abc', NaN].map(abilityModifier), [0, 0, 0, 0, 0]);
});
