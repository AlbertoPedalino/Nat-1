import { expect, test } from 'vitest';
import { makeWeaponActions } from '../../../../../src/pages/charsheet/actions/weaponActions.js';
import { collectEquipmentProficiencySets } from '../../../../../src/shared/character/proficiency/equipmentSets.js';

// The off-hand attack is the same card as the main one, with the off hand's
// rules: one-handed die, no positive modifier to damage, a Bonus Action.
const rogue = (extra = {}) => ({
  className: 'Rogue',
  level: 1,
  scoreMethod: 'manual',
  manualScores: { str: 10, dex: 16, con: 12, int: 10, wis: 10, cha: 10 },
  clsSnapshot: { startingProficiencies: { weapons: ['simple', 'martial'], armor: ['light'] } },
  ...extra,
});
const shortsword = (slot) => ({
  name: 'Shortsword', source: 'XPHB', type: 'M', weaponCategory: 'martial',
  property: ['F', 'L'], dmg1: '1d6', dmgType: 'P', equipped: true, equippedSlot: slot,
});
const dagger = {
  name: 'Dagger', source: 'XPHB', type: 'M', weaponCategory: 'simple',
  property: ['F', 'L', 'T'], dmg1: '1d4', dmgType: 'P', equipped: true, equippedSlot: 'offHand',
};

function cards(C, inventory) {
  return makeWeaponActions(C, inventory.filter((item) => item.dmg1), inventory, [], collectEquipmentProficiencySets(C))
    .filter((action) => action._source === 'Weapon');
}

test('the off-hand card rolls the weapon die alone, as a Bonus Action', () => {
  const [main, off] = cards(rogue(), [shortsword('mainHand'), dagger]);
  expect(main).toMatchObject({ cat: 'action', attackBonus: 5, rollLabelPrefix: 'Shortsword' });
  expect(main.rollers[0].formula).toBe('1d6+3');
  expect(off).toMatchObject({ name: 'Dagger', cat: 'bonus', attackBonus: 5, rollLabelPrefix: 'Off-hand Dagger' });
  expect(off.rollers[0].formula).toBe('1d4');
});

test('armor worn without training gives the off-hand attack Disadvantage too', () => {
  const plate = { name: 'Plate Armor', source: 'XPHB', type: 'HA', ac: 18, equipped: true };
  const [main, off] = cards(rogue(), [shortsword('mainHand'), dagger, plate]);
  expect(main._disadvantage).toBe(true);
  expect(off._disadvantage).toBe(true);
});
