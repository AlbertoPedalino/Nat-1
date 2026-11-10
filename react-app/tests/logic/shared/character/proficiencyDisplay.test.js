import test from 'node:test';
import assert from 'node:assert/strict';

test('a weapon covered by its category is not listed again, as the item data says', async () => {
  const { collapseWeaponProficiencies } = await import('../../../../src/shared/character/progression/proficiencyDisplay.js');
  const allItemsDb = [{ name: 'Dagger', weaponCategory: 'simple' }, { name: 'Longsword', weaponCategory: 'martial' }];
  assert.deepEqual(collapseWeaponProficiencies(['Simple', 'Dagger', 'Longsword'], { allItemsDb }), ['Longsword', 'Simple']);
});
