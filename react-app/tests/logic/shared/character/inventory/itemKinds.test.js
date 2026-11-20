import test from 'node:test';
import assert from 'node:assert/strict';
import { isRodStaffOrWand, weaponCategory } from '../../../../../src/shared/character/inventory/itemKinds.js';

test('a rod, staff or wand by its type, a focus so named, or a magic staff', () => {
  assert.equal(isRodStaffOrWand({ name: 'Wand of Magic Missiles', type: 'WD|DMG' }), true);
  assert.equal(isRodStaffOrWand({ name: 'Immovable Rod', type: 'RD' }), true);
  assert.equal(isRodStaffOrWand({ name: 'Staff', type: 'SCF|XPHB', scfType: 'arcane' }), true);
  assert.equal(isRodStaffOrWand({ name: 'Orb', type: 'SCF|XPHB', scfType: 'arcane' }), false);
  assert.equal(isRodStaffOrWand({ name: 'Staff of Fire', type: 'M', staff: true }), true);
  assert.equal(isRodStaffOrWand({ name: 'Quarterstaff', type: 'M' }), false);
});

test('a weapon category is read from the item data', () => {
  assert.equal(weaponCategory({ weaponCategory: 'martial' }), 'martial');
  assert.equal(weaponCategory({ weaponCategory: 'Simple' }), 'simple');
  assert.equal(weaponCategory({}), '');
});
