import { expect, test } from 'vitest';
import { spellWeaponAttack, spellWeaponKey, spellWeaponOptions } from '../../../../../src/pages/charsheet/actions/actionsTabLogic.js';
import { cantripScalingDamages, cantripScalingDice } from '../../../../../src/pages/charsheet/spells/spellsTabLogic.js';
import { collectEquipmentProficiencySets } from '../../../../../src/pages/charsheet/proficiency/index.js';

// True Strike: the attack is the weapon's, made with the spellcasting ability.
const character = {
  className: 'Wizard',
  level: 5,
  scoreMethod: 'manual',
  manualScores: { str: 10, dex: 12, con: 12, int: 16, wis: 10, cha: 10 },
  clsSnapshot: { startingProficiencies: { weapons: ['simple'] } },
};
const dagger = {
  name: 'Dagger', source: 'XPHB', type: 'M', weaponCategory: 'simple',
  property: ['F', 'L', 'T'], dmg1: '1d4', dmgType: 'P',
};
const quarterstaff = {
  name: 'Quarterstaff', source: 'XPHB', type: 'M', weaponCategory: 'simple',
  property: ['V'], dmg1: '1d6', dmg2: '1d8', dmgType: 'B',
};
const longsword = {
  name: 'Longsword', source: 'XPHB', type: 'M', weaponCategory: 'martial',
  property: ['V'], dmg1: '1d8', dmgType: 'S',
};

test('only weapons the character is proficient with are offered, the ones in hand first', () => {
  const inventory = [dagger, { ...dagger }, longsword, { ...quarterstaff, equipped: true, equippedSlot: 'twoHands' }];
  const options = spellWeaponOptions(character, inventory, collectEquipmentProficiencySets(character));

  expect(options.map((option) => option.name)).toEqual(['Quarterstaff', 'Dagger']);
  expect(options[0].held).toBe(true);
  expect(options[1].key).toBe(spellWeaponKey(dagger));
});

test('the attack and damage use the spellcasting ability, the weapon die as held, and the cantrip dice', () => {
  const staff = { ...quarterstaff, equipped: true, equippedSlot: 'twoHands' };
  const strike = spellWeaponAttack(character, staff, {
    ability: 'int',
    inventory: [staff],
    extraDamage: cantripScalingDice([{ scaling: { 5: '1d6', 11: '2d6', 17: '3d6' } }], 5),
  });

  // PB 3 + INT 3; Strength 10 would have given +3 only with proficiency.
  expect(strike).toMatchObject({
    name: 'Quarterstaff',
    attackBonus: 6,
    damageFormula: '1d8+1d6+3',
    damageType: 'B',
    disadvantage: false,
  });
});

test('the cantrip dice start at level 5 and step up at 11 and 17', () => {
  const scaling = [{ label: 'extra Radiant damage', scaling: { 5: '1d6', 11: '2d6', 17: '3d6' } }];
  expect(cantripScalingDice(scaling, 4)).toBe('');
  expect(cantripScalingDice(scaling, 5)).toBe('1d6');
  expect(cantripScalingDice(scaling, 12)).toBe('2d6');
  expect(cantripScalingDice(scaling, 20)).toBe('3d6');
  expect(cantripScalingDice(null, 20)).toBe('');
});

// Cantrip damage rolls follow the character level, one per scaling line.
test('cantrip damage is rolled at the character level, one roll per scaling line', () => {
  const fireBolt = { label: 'Fire damage', scaling: { 1: '1d10', 5: '2d10', 11: '3d10', 17: '4d10' } };
  expect(cantripScalingDamages(fireBolt, 11)).toEqual([{ formula: '3d10', label: '3d10', title: 'Fire damage' }]);

  const tollTheDead = [
    { label: 'Necrotic damage', scaling: { 1: '1d8', 5: '2d8', 11: '3d8', 17: '4d8' } },
    { label: 'Necrotic damage to wounded creature', scaling: { 1: '1d12', 5: '2d12', 11: '3d12', 17: '4d12' } },
  ];
  expect(cantripScalingDamages(tollTheDead, 5).map((roll) => [roll.formula, roll.title]))
    .toEqual([['2d8', 'Necrotic damage'], ['2d12', 'Necrotic damage to wounded creature']]);

  expect(cantripScalingDamages(null, 5)).toEqual([]);
});
