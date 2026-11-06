import test from 'node:test';
import assert from 'node:assert/strict';
import {
  abilityScore,
  abilityScoreBonuses,
  baseAbilityScore,
  builtAbilityScore,
  finalAbilityModifier,
} from '../../../../../src/shared/character/progression/abilityScores.js';

const manual = (scores, extra = {}) => ({ scoreMethod: 'manual', manualScores: scores, ...extra });

test('the base score comes from the chosen method, 8 until set', () => {
  assert.equal(baseAbilityScore({ scoreMethod: 'pointbuy', pbScores: { str: 15 } }, 'str'), 15);
  assert.equal(baseAbilityScore({ scoreMethod: 'standard', arrAssign: { str: 13 } }, 'str'), 13);
  assert.equal(baseAbilityScore({ scoreMethod: 'dice', diceAssign: { str: 17 } }, 'str'), 17);
  assert.equal(baseAbilityScore(manual({ str: 0 }), 'str'), 0);
  assert.equal(baseAbilityScore(manual({}), 'str'), 8);
});

test('the background bonus follows the chosen pattern', () => {
  const even = manual({ str: 10, dex: 10, con: 10 }, { backgroundAbilities: ['str', 'dex', 'con'], backgroundPattern: [1, 1, 1] });
  assert.deepEqual(['str', 'dex', 'con'].map((stat) => builtAbilityScore(even, stat)), [11, 11, 11]);
  const split = manual({ str: 10, dex: 10 }, { backgroundAbilities: ['dex', 'str'], backgroundPattern: [2, 1] });
  assert.equal(builtAbilityScore(split, 'dex'), 12);
  assert.equal(builtAbilityScore(split, 'str'), 11);
  assert.deepEqual(abilityScoreBonuses(split, 'dex'), [{ source: 'Background', value: 2 }]);
});

test('the score in play adds consumed Tomes; Wild Shape replaces physical scores only', () => {
  const druid = manual({ str: 10, con: 14, wis: 16 }, { consumedItemBonuses: [{ ability: 'con', value: 2 }] });
  assert.equal(abilityScore(druid, 'con'), 16);
  const shaped = { ...druid, wildShape: { beast: { abilities: { str: 19, con: 13, wis: 12 } } } };
  assert.equal(abilityScore(shaped, 'str'), 19);
  assert.equal(abilityScore(shaped, 'con'), 13);
  assert.equal(abilityScore(shaped, 'wis'), 16);
  assert.equal(abilityScore(shaped, 'con', { ignoreWildShape: true }), 16);
});

test('the modifier reads the score in play, ability in any case', () => {
  const character = manual({ con: 16, cha: 7 });
  assert.equal(finalAbilityModifier(character, 'con'), 3);
  assert.equal(finalAbilityModifier(character, 'CHA'), -2);
  assert.equal(finalAbilityModifier(character, 'dex'), -1);
  assert.equal(finalAbilityModifier(null, 'str'), 0);
});
