import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ITEM_GROUP_CHIPS,
  ITEM_GROUP_KEYS,
  ITEM_STATE_CHIPS,
  isItemEquipped,
  itemGroupKey,
  matchesItemGroupChip,
  matchesItemStates,
} from '../../../../../src/shared/character/inventory/itemGroups.js';

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

test('the shelf chips classify; the owned states filter beside them, all at once', () => {
  const looseSword = { type: 'M' };
  const wornArmor = { type: 'HA', equipped: true };
  const attunedRing = { type: 'RG', rarity: 'rare', attuned: true, carried: false };

  assert.equal(matchesItemGroupChip(looseSword, 'weapon'), true);
  assert.equal(matchesItemGroupChip(looseSword, 'armor'), false);
  // Equipped armor: its shelf and its state, each answered on its own.
  assert.equal(matchesItemGroupChip(wornArmor, 'armor'), true);
  assert.equal(matchesItemStates(wornArmor, ['equipped']), true);
  assert.equal(matchesItemStates(looseSword, ['equipped']), false);
  // Several states: every one must hold.
  assert.equal(matchesItemStates(attunedRing, ['attuned', 'stashed']), true);
  assert.equal(matchesItemStates(attunedRing, ['attuned', 'equipped']), false);
  assert.equal(matchesItemStates(looseSword, []), true);
});

test('every chip key is answerable by its matcher', () => {
  const item = { type: 'M', equipped: true, rarity: 'rare' };
  ITEM_GROUP_CHIPS.forEach((chip) => {
    assert.equal(typeof matchesItemGroupChip(item, chip.key), 'boolean', `${chip.key} unhandled`);
  });
  ITEM_STATE_CHIPS.forEach((chip) => {
    assert.equal(typeof matchesItemStates(item, [chip.key]), 'boolean', `${chip.key} unhandled`);
  });
});

test('the shelf has no owned state in it', () => {
  const stateKeys = new Set(ITEM_STATE_CHIPS.map((chip) => chip.key));
  assert.equal(ITEM_GROUP_CHIPS.some((chip) => stateKeys.has(chip.key)), false);
});
