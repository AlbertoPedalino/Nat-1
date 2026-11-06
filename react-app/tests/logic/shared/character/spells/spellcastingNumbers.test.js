import test from 'node:test';
import assert from 'node:assert/strict';
import { spellcastingNumbers } from '../../../../../src/shared/character/spells/spellcastingNumbers.js';

const caster = {
  level: 5,
  scoreMethod: 'manual',
  manualScores: { int: 16, wis: 12 },
  inventory: [],
};

test('attack and DC both read the given ability: a Wizard spell uses INT, a Cleric spell WIS', () => {
  assert.deepEqual(spellcastingNumbers(caster, 'int'), { abilityModifier: 3, attack: 6, dc: 14 });
  assert.deepEqual(spellcastingNumbers(caster, 'wis'), { abilityModifier: 1, attack: 4, dc: 12 });
});

test('a spell attack item raises the attack and leaves the DC alone', () => {
  const wand = { name: 'Wand of the War Mage, +1', bonusSpellAttack: '+1', reqAttune: 'by a spellcaster', attuned: true, equipped: true };
  const numbers = spellcastingNumbers({ ...caster, inventory: [wand] }, 'int');
  assert.equal(numbers.attack, 7);
  assert.equal(numbers.dc, 14);
});
