import test from 'node:test';
import assert from 'node:assert/strict';
import { characterItemEffects, getItemSenses, collectItemResistanceItems } from '../../../../../src/shared/character/inventory/itemEffects.js';
import { characterItemBonuses } from '../../../../../src/shared/character/inventory/itemBonus.js';

// Wild Shape: the equipment merges into the form, so no item effect or bonus
// counts while transformed, whichever reader asks.
const inventory = [
  { name: 'Goggles of Night', type: 'WI', senses: [{ darkvision: 60 }] },
  { name: 'Ring of Resistance', type: 'RG', resist: ['fire'], equipped: true },
  { name: 'Cloak of Protection', type: 'WI', bonusSavingThrow: '+1', bonusAbilityCheck: '+1', equipped: true },
];
const druid = { name: 'Druid', inventory };
const wolf = { ...druid, wildShape: { beast: { name: 'Wolf', abilities: { str: 12, dex: 15, con: 12 } } } };

test('items count in your own form', () => {
  assert.equal(getItemSenses(druid).darkvision, 60);
  assert.equal(collectItemResistanceItems(druid).length, 1);
  assert.deepEqual(characterItemBonuses(druid), { savingThrow: 1, abilityCheck: 1, spellAttack: 0, spellSaveDc: 0 });
});

test('no item counts in Wild Shape, for every reader', () => {
  assert.deepEqual(getItemSenses(wolf), {});
  assert.deepEqual(collectItemResistanceItems(wolf), []);
  assert.deepEqual(characterItemEffects(wolf).resistances, []);
  assert.deepEqual(characterItemBonuses(wolf), { savingThrow: 0, abilityCheck: 0, spellAttack: 0, spellSaveDc: 0 });
});
