import { expect, test } from 'vitest';
import { makeWeaponActions } from '../../../../../src/pages/charsheet/actions/weaponActions.js';
import { collectEquipmentProficiencySets } from '../../../../../src/shared/character/proficiency/equipmentSets.js';

// A magic weapon's "extra … damage on a hit" is a button of its own on the
// attack card, beside the weapon's damage, once the weapon is active.
const knight = {
  className: 'Paladin',
  level: 5,
  scoreMethod: 'manual',
  manualScores: { str: 16, dex: 10, con: 12, int: 10, wis: 10, cha: 14 },
  clsSnapshot: { startingProficiencies: { weapons: ['simple', 'martial'] } },
  choices: {},
};
const frostmourne = {
  name: 'Frostmourne', source: 'WoW', type: 'M', weaponCategory: 'martial', reqAttune: true,
  property: ['H', '2H'], dmg1: '2d6', dmgType: 'S', bonusWeapon: '+3',
  equipped: true, equippedSlot: 'twoHands', attuned: true,
  entries: [{ type: 'entries', name: 'Magic Weapon', entries: ['It deals an extra {@damage 2d12} Cold damage on a hit.'] }],
};

function rollerLabels(item) {
  const card = makeWeaponActions(knight, [item], [item], [], collectEquipmentProficiencySets(knight))
    .find((action) => action.name === 'Frostmourne');
  return card.rollers.map((roller) => roller.label);
}

test('Frostmourne rolls its extra Cold damage apart from the weapon damage', () => {
  expect(rollerLabels(frostmourne)).toEqual(['Damage 2d6+6 S', '+2d12 cold']);
});

test('the extra damage waits for the weapon to be attuned', () => {
  expect(rollerLabels({ ...frostmourne, attuned: false })).toEqual(['Damage 2d6+3 S']);
});
