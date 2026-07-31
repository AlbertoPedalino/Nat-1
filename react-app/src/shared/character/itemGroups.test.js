import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ITEM_GROUP_CHIPS,
  ITEM_GROUP_KEYS,
  OWNED_ITEM_CHIPS,
  isItemEquipped,
  itemGroupKey,
  matchesItemGroupChip,
} from './itemGroups.js';

test('weapons and armor are classified by type code', () => {
  assert.equal(itemGroupKey({ type: 'M' }), 'weapon');
  assert.equal(itemGroupKey({ type: 'R' }), 'weapon');
  assert.equal(itemGroupKey({ type: 'weapon' }), 'weapon');
  assert.equal(itemGroupKey({ type: 'LA' }), 'armor');
  assert.equal(itemGroupKey({ type: 'S' }), 'armor');
  assert.equal(itemGroupKey({ type: 'armor' }), 'armor');
});

test('what an item is outranks what it costs', () => {
  // A Flame Tongue belongs on the weapon shelf, not the magic one.
  assert.equal(itemGroupKey({ type: 'M', rarity: 'rare' }), 'weapon');
  assert.equal(itemGroupKey({ type: 'HA', rarity: 'very rare' }), 'armor');
});

test('rings and anything with a rarity fall through to magic', () => {
  assert.equal(itemGroupKey({ type: 'RG' }), 'magic');
  assert.equal(itemGroupKey({ type: 'RG', rarity: 'none' }), 'magic');
  assert.equal(itemGroupKey({ type: 'WD', rarity: 'uncommon' }), 'magic');
});

test('everything else is gear', () => {
  assert.equal(itemGroupKey({ type: 'G' }), 'gear');
  assert.equal(itemGroupKey({ type: 'G', rarity: 'none' }), 'gear');
  assert.equal(itemGroupKey({}), 'gear');
  assert.equal(itemGroupKey(null), 'gear');
});

test('a source suffix on the type code does not break classification', () => {
  assert.equal(itemGroupKey({ type: 'M|XPHB' }), 'weapon');
  assert.equal(itemGroupKey({ type: 'ha|xphb' }), 'armor');
});

test('every result is a declared group key', () => {
  const samples = [{ type: 'M' }, { type: 'S' }, { type: 'RG' }, { type: 'G' }, {}];
  samples.forEach((item) => assert.ok(ITEM_GROUP_KEYS.includes(itemGroupKey(item))));
});

test('isItemEquipped covers both the worn flag and hand slots', () => {
  assert.equal(isItemEquipped({ name: 'Rope' }), false);
  assert.equal(isItemEquipped({ name: 'Chain Shirt', equipped: true }), true);
  assert.equal(isItemEquipped({ name: 'Dagger', equippedSlot: 'offHand' }), true);
  assert.equal(isItemEquipped({ name: 'Dagger', equipped: false, equippedSlot: 'mainHand' }), true);
  assert.equal(isItemEquipped(null), false);
});

test('the "all" chip matches everything, including junk keys', () => {
  const sword = { type: 'M' };
  assert.equal(matchesItemGroupChip(sword, 'all'), true);
  assert.equal(matchesItemGroupChip(sword, ''), true);
  assert.equal(matchesItemGroupChip(sword, undefined), true);
});

test('group chips delegate to the classifier, the equipped chip does not', () => {
  const looseSword = { type: 'M' };
  const wornArmor = { type: 'HA', equipped: true };

  assert.equal(matchesItemGroupChip(looseSword, 'weapon'), true);
  assert.equal(matchesItemGroupChip(looseSword, 'armor'), false);
  assert.equal(matchesItemGroupChip(looseSword, 'equipped'), false);
  // Equipped ignores the shelf: worn armor matches both its group and equipped.
  assert.equal(matchesItemGroupChip(wornArmor, 'armor'), true);
  assert.equal(matchesItemGroupChip(wornArmor, 'equipped'), true);
});

test('every chip key is answerable by the matcher', () => {
  const item = { type: 'M', equipped: true, rarity: 'rare' };
  OWNED_ITEM_CHIPS.forEach((chip) => {
    assert.equal(typeof matchesItemGroupChip(item, chip.key), 'boolean', `${chip.key} unhandled`);
  });
});

test('only the owned chip set offers Equipped', () => {
  assert.equal(ITEM_GROUP_CHIPS.some((chip) => chip.key === 'equipped'), false);
  assert.equal(OWNED_ITEM_CHIPS.some((chip) => chip.key === 'equipped'), true);
  assert.deepEqual(OWNED_ITEM_CHIPS.slice(0, ITEM_GROUP_CHIPS.length), [...ITEM_GROUP_CHIPS]);
});
