import test from 'node:test';
import assert from 'node:assert/strict';
import {
  availableItemFlagDefs,
  itemFlagFitsItem,
  toggleItemFlag,
} from '../../../../../src/shared/character/inventory/itemFlags.js';

const PACT = {
  key: 'pactWeapon', label: 'Pact Weapon', types: ['M', 'R', 'WEAPON'], maxCount: 1,
  requireClass: 'Warlock', requireInvocation: 'Pact of the Blade',
};
const ARCANE = {
  key: 'arcaneArmor', label: 'Arcane Armor', types: ['LA', 'MA', 'HA'], maxCount: 1,
  requireClass: 'Artificer', requireSubclass: 'Armorer', requireMinLevel: 3,
};

test('a flag is offered only to a character meeting its class, subclass, level and invocation', () => {
  const bladelock = { className: 'Warlock', classLevel: 3, choices: { warlock_invocation_1: 'Pact of the Blade|XPHB' } };
  const tomelock = { className: 'Warlock', classLevel: 3, choices: { warlock_invocation_1: 'Pact of the Tome|XPHB' } };
  const armorer = { className: 'Artificer', classLevel: 3, subclassShortName: 'Armorer' };
  const youngArmorer = { className: 'Artificer', classLevel: 2, subclassShortName: 'Armorer' };
  const multiclass = {
    className: 'Fighter', classLevel: 5,
    extraClasses: [{ name: 'Artificer', level: 3, subclassShortName: 'Armorer' }],
    choices: { mc1_warlock_invocation_2: 'Pact of the Blade' },
  };
  const keys = (C) => availableItemFlagDefs([PACT, ARCANE], C).map((def) => def.key);
  assert.deepEqual(keys(bladelock), ['pactWeapon']);
  assert.deepEqual(keys(tomelock), []);
  assert.deepEqual(keys(armorer), ['arcaneArmor']);
  assert.deepEqual(keys(youngArmorer), []);
  // Invocation without Warlock levels does not count.
  assert.deepEqual(keys(multiclass), ['arcaneArmor']);
});

test('a flag fits only its item types', () => {
  assert.equal(itemFlagFitsItem(ARCANE, { type: 'HA' }), true);
  assert.equal(itemFlagFitsItem(ARCANE, { type: 'S' }), false);
  assert.equal(itemFlagFitsItem(PACT, { type: 'm' }), true);
});

test('a one-item flag moves to the item it is set on and clears from it', () => {
  const inventory = [
    { name: 'Longsword', type: 'M', flags: ['pactWeapon'] },
    { name: 'Rapier', type: 'M' },
    { name: 'Chain Mail', type: 'HA' },
  ];
  const moved = toggleItemFlag(inventory, 1, PACT);
  assert.deepEqual(moved.map((item) => item.flags || []), [[], ['pactWeapon'], []]);
  assert.equal(moved[2], inventory[2]);
  const cleared = toggleItemFlag(moved, 1, PACT);
  assert.deepEqual(cleared.map((item) => item.flags || []), [[], [], []]);
  assert.equal(toggleItemFlag(inventory, 2, PACT), inventory);
});

test('a flag with a higher limit refuses once the limit is reached', () => {
  const twice = { key: 'mark', types: [], maxCount: 2 };
  const inventory = [{ flags: ['mark'] }, { flags: ['mark'] }, {}];
  assert.equal(toggleItemFlag(inventory, 2, twice), inventory);
  assert.deepEqual(toggleItemFlag(inventory, 0, twice)[0].flags, []);
});
