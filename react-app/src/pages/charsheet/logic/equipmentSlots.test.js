import test from 'node:test';
import assert from 'node:assert/strict';
import { equipToSlot } from './equipmentSlots.js';
import { isItemEquipped } from '../../../shared/character/itemGroups.js';

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
