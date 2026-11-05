import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalProperty, itemHasProperty, itemProperties } from '../../../../../src/shared/character/inventory/weaponProperties.js';
import { isFinesseWeapon, isReachWeapon, isTwoHandedWeapon } from '../../../../../src/pages/charsheet/inventory/equipmentSlots.js';
import { itemHasProperty as proficiencyHasProperty } from '../../../../../src/pages/charsheet/proficiency/weaponRules.js';

const glaive = { name: 'Glaive', type: 'M', property: ['H', 'R|XPHB', '2H'] };

test('codes, sources, names and objects read as one canonical property', () => {
  assert.equal(canonicalProperty('F'), 'finesse');
  assert.equal(canonicalProperty('F|XPHB'), 'finesse');
  assert.equal(canonicalProperty('Finesse'), 'finesse');
  assert.equal(canonicalProperty({ abbreviation: 'L' }), 'light');
  assert.equal(canonicalProperty('rch'), 'reach');
  assert.equal(canonicalProperty('AF'), 'af');
  assert.deepEqual(itemProperties(glaive), ['heavy', 'reach', 'two-handed']);
});

test('Reach is the R code on a property, for slots and proficiency rules alike', () => {
  assert.equal(isReachWeapon(glaive), true);
  assert.equal(isTwoHandedWeapon(glaive), true);
  assert.equal(proficiencyHasProperty(glaive, 'reach'), true);
  assert.equal(itemHasProperty(glaive, ['F', 'L']), false);
  assert.equal(isFinesseWeapon({ property: ['F|XPHB', 'L'] }), true);
});
