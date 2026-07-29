import test from 'node:test';
import assert from 'node:assert/strict';
import {
  itemChargeCurrent,
  itemChargeMaximum,
  setInventoryItemCharges,
  shouldShowItemCharges,
  withItemCharges,
} from './itemCharges.js';
import { addInventoryEntries } from './itemContainers.js';

test('item charges default to full and clamp persisted values', () => {
  const cube = { name: 'Cube of Force', charges: 10 };
  assert.equal(itemChargeMaximum(cube), 10);
  assert.equal(itemChargeCurrent(cube), 10);
  assert.equal(itemChargeCurrent({ ...cube, chargesCurrent: 4 }), 4);
  assert.equal(itemChargeCurrent({ ...cube, chargesCurrent: 99 }), 10);
  assert.equal(itemChargeCurrent({ ...cube, chargesCurrent: -2 }), 0);
});

test('inventory charge updates preserve every other item', () => {
  const cube = { name: 'Cube of Force', charges: 10 };
  const rope = { name: 'Rope' };
  const inventory = [cube, rope];
  const next = setInventoryItemCharges(inventory, 0, 6);

  assert.equal(next[0].chargesCurrent, 6);
  assert.equal(next[1], rope);
  assert.equal(withItemCharges(next[0], -10).chargesCurrent, 0);
  assert.equal(withItemCharges(next[0], 30).chargesCurrent, 10);
});

test('charged items remain separate so each copy owns its charge pool', () => {
  const cube = { name: 'Cube of Force', source: 'XDMG', charges: 10, qty: 1 };
  const inventory = addInventoryEntries([cube], [{ ...cube, qty: 2 }]);

  assert.equal(inventory.length, 3);
  assert.equal(inventory[0].qty, 1);
  assert.equal(inventory[1].qty, 1);
  assert.equal(inventory[2].qty, 1);
});

test('attunement-required charge pools stay hidden until attuned', () => {
  const cube = { name: 'Cube of Force', charges: 10, reqAttune: true };
  assert.equal(shouldShowItemCharges(cube), false);
  assert.equal(shouldShowItemCharges({ ...cube, attuned: true }), true);
  assert.equal(shouldShowItemCharges({ name: 'Unattuned Wand', charges: 7 }), true);
});
