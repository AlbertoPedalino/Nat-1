import test from 'node:test';
import assert from 'node:assert/strict';
import { abilityModifier, finalAbilityModifier } from '../../../../../src/shared/character/progression/abilityModifier.js';

test('the modifier rounds down, odd scores included', () => {
  assert.deepEqual([1, 8, 9, 10, 11, 15, 20, 30].map(abilityModifier), [-5, -1, -1, 0, 0, 2, 5, 10]);
  assert.equal(abilityModifier('14'), 2);
});

test('a missing or unreadable score counts as 10', () => {
  assert.deepEqual([undefined, null, '', 'abc', NaN].map(abilityModifier), [0, 0, 0, 0, 0]);
});

test('a character\'s modifier reads its final scores, ability in any case', () => {
  const character = { finalScores: { con: 16, cha: 7 } };
  assert.equal(finalAbilityModifier(character, 'con'), 3);
  assert.equal(finalAbilityModifier(character, 'CHA'), -2);
  assert.equal(finalAbilityModifier(character, 'dex'), 0);
  assert.equal(finalAbilityModifier(null, 'str'), 0);
});
