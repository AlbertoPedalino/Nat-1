import { expect, test } from 'vitest';
import { adapterRegistry } from '../../../../../src/adapters/registry.js';
import installArtillerist from '../../../../../src/adapters/classes/artificer/artillerist.js';
import { makeWeaponActions, spellWeaponAttack } from '../../../../../src/pages/charsheet/actions/weaponActions.js';
import { collectEquipmentProficiencySets } from '../../../../../src/shared/character/proficiency/equipmentSets.js';

installArtillerist(adapterRegistry);
const fitsArcaneFirearm = (item) => adapterRegistry.getItemFlagDef('arcaneFirearm').fits(item);

// Artillerist's Arcane Firearm: the weapon carrying the sigils rolls an extra
// 1d8 in its damage roll, and True Strike made with it adds its own dice to
// that same roll.
const artillerist = (level) => ({
  className: 'Artificer',
  subclassShortName: 'Artillerist',
  level,
  classLevel: level,
  scoreMethod: 'manual',
  manualScores: { str: 10, dex: 14, con: 12, int: 16, wis: 10, cha: 10 },
  clsSnapshot: { startingProficiencies: { weapons: ['simple', 'martial'] } },
});
const heavyCrossbow = {
  name: 'Heavy Crossbow', source: 'XPHB', type: 'R', weaponCategory: 'martial',
  property: ['A', 'H', 'LD', '2H'], dmg1: '1d10', dmgType: 'P', equipped: true, equippedSlot: 'twoHands',
};
const firearm = { ...heavyCrossbow, flags: ['arcaneFirearm'] };

function crossbowDamage(C, item) {
  const actions = makeWeaponActions(C, [item], [item], [], collectEquipmentProficiencySets(C));
  return actions.find((action) => action.name === 'Heavy Crossbow').rollers[0].formula;
}

test('the sigils go on a rod, staff, wand or martial ranged weapon only', () => {
  expect(fitsArcaneFirearm({ name: 'Wand', type: 'WD' })).toBe(true);
  expect(fitsArcaneFirearm({ name: 'Rod', type: 'RD' })).toBe(true);
  expect(fitsArcaneFirearm({ name: 'Staff', type: 'SCF|XPHB', scfType: 'arcane' })).toBe(true);
  expect(fitsArcaneFirearm({ name: 'Crystal', type: 'SCF|XPHB', scfType: 'arcane' })).toBe(false);
  expect(fitsArcaneFirearm({ name: 'Staff of Fire', type: 'M', weaponCategory: 'simple', staff: true })).toBe(true);
  expect(fitsArcaneFirearm(heavyCrossbow)).toBe(true);
  expect(fitsArcaneFirearm({ name: 'Light Crossbow', type: 'R', weaponCategory: 'simple' })).toBe(false);
  expect(fitsArcaneFirearm({ name: 'Quarterstaff', type: 'M', weaponCategory: 'simple' })).toBe(false);
});

test('the firearm rolls its 1d8 in the weapon damage roll', () => {
  expect(crossbowDamage(artillerist(5), firearm)).toBe('1d10+1d8+2');
  expect(crossbowDamage(artillerist(5), heavyCrossbow)).toBe('1d10+2');
});

test('before level 5 the sigils add nothing', () => {
  expect(crossbowDamage(artillerist(4), firearm)).toBe('1d10+2');
});

test('True Strike through the firearm adds its dice to the same roll', () => {
  const strike = spellWeaponAttack(artillerist(5), firearm, { ability: 'int', inventory: [firearm], extraDamage: '1d6' });
  expect(strike.damageFormula).toBe('1d10+1d8+1d6+3');
});

test('a firearm held in the off hand rolls its 1d8 there too', () => {
  const C = artillerist(5);
  const handCrossbow = {
    name: 'Hand Crossbow', source: 'XPHB', type: 'R', weaponCategory: 'martial',
    property: ['A', 'L', 'LD'], dmg1: '1d6', dmgType: 'P', equipped: true, equippedSlot: 'offHand', flags: ['arcaneFirearm'],
  };
  const dagger = {
    name: 'Dagger', source: 'XPHB', type: 'M', weaponCategory: 'simple',
    property: ['F', 'L', 'T'], dmg1: '1d4', dmgType: 'P', equipped: true, equippedSlot: 'mainHand',
  };
  const inventory = [dagger, handCrossbow];
  const off = makeWeaponActions(C, inventory, inventory, [], collectEquipmentProficiencySets(C))
    .find((action) => action.name === 'Hand Crossbow');
  expect(off.rollers[0].formula).toBe('1d6+1d8');
});
