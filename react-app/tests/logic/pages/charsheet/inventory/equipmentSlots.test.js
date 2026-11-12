import test from 'node:test';
import assert from 'node:assert/strict';
import { equipToSlot } from '../../../../../src/pages/charsheet/inventory/equipmentSlots.js';
import { THROWN_SLOT } from '../../../../../src/shared/character/inventory/itemContainers.js';
import { isItemEquipped } from '../../../../../src/shared/character/inventory/itemGroups.js';

test('equipping one of a stack splits it and leaves the rest loose', () => {
  const next = equipToSlot([{ name: 'Dagger', source: 'XPHB', qty: 4 }], 0, 'mainHand');
  const equipped = next.filter(isItemEquipped);
  const loose = next.filter((item) => !isItemEquipped(item));

  assert.equal(equipped.length, 1);
  assert.equal(equipped[0].qty, 1);
  assert.equal(equipped[0].equippedSlot, 'mainHand');
  assert.equal(loose.length, 1);
  assert.equal(loose[0].qty, 3);
});

test('re-equipping the same slot unequips and recompacts the stack', () => {
  const split = equipToSlot([{ name: 'Dagger', source: 'XPHB', qty: 4 }], 0, 'mainHand');
  const slotted = split.findIndex(isItemEquipped);
  const merged = equipToSlot(split, slotted, 'mainHand');

  assert.equal(merged.length, 1);
  assert.equal(merged[0].qty, 4);
  assert.equal(merged.some(isItemEquipped), false);
});

const javelins = { name: 'Javelin', source: 'XPHB', type: 'M', property: ['T'], qty: 5 };
const slotOf = (inventory, name) => inventory.find((item) => item.name === name)?.equippedSlot;

test('a thrown weapon readied to throw leaves whatever is in hand alone', () => {
  const greatsword = { name: 'Greatsword', source: 'XPHB', equipped: true, equippedSlot: 'twoHands' };
  const shortsword = { name: 'Shortsword', source: 'XPHB', equipped: true, equippedSlot: 'mainHand' };
  const scimitar = { name: 'Scimitar', source: 'XPHB', equipped: true, equippedSlot: 'offHand' };

  const twoHanded = equipToSlot([greatsword, javelins], 1, THROWN_SLOT);
  assert.equal(slotOf(twoHanded, 'Greatsword'), 'twoHands');
  assert.equal(slotOf(twoHanded, 'Javelin'), THROWN_SLOT);

  const dual = equipToSlot([shortsword, scimitar, javelins], 2, THROWN_SLOT);
  assert.equal(slotOf(dual, 'Shortsword'), 'mainHand');
  assert.equal(slotOf(dual, 'Scimitar'), 'offHand');
  assert.equal(slotOf(dual, 'Javelin'), THROWN_SLOT);
});

test('a hand slot does not displace a weapon readied to throw', () => {
  const ready = equipToSlot([javelins, { name: 'Greatsword', source: 'XPHB' }], 0, THROWN_SLOT);
  const next = equipToSlot(ready, 1, 'twoHands');

  assert.equal(slotOf(next, 'Javelin'), THROWN_SLOT);
  assert.equal(slotOf(next, 'Greatsword'), 'twoHands');
});

test('the whole stack is readied, and goes back to one loose stack', () => {
  const ready = equipToSlot([javelins], 0, THROWN_SLOT);
  assert.equal(ready.length, 1);
  assert.equal(ready[0].qty, 5);
  assert.equal(ready[0].equipped, true);

  const back = equipToSlot(ready, 0, THROWN_SLOT);
  assert.equal(back.length, 1);
  assert.equal(back[0].qty, 5);
  assert.equal(back.some(isItemEquipped), false);
});

test('more of the same weapon joins the stack already readied', () => {
  const ready = equipToSlot([javelins, { ...javelins, qty: 2 }], 0, THROWN_SLOT);
  const merged = equipToSlot(ready, ready.findIndex((item) => !isItemEquipped(item)), THROWN_SLOT);

  assert.equal(merged.length, 1);
  assert.equal(merged[0].qty, 7);
  assert.equal(merged[0].equippedSlot, THROWN_SLOT);
});

test('a weapon moved from a hand to thrown frees that hand', () => {
  const inHand = { ...javelins, qty: 1, equipped: true, equippedSlot: 'mainHand' };
  const next = equipToSlot([inHand], 0, THROWN_SLOT);

  assert.equal(next.length, 1);
  assert.equal(next[0].equippedSlot, THROWN_SLOT);
});
