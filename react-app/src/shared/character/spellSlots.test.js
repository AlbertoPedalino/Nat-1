import test from 'node:test';
import assert from 'node:assert/strict';
import {
  consumePactSlot,
  getAvailablePactSlots,
  getPactSlotUsedKey,
} from './spellSlots.js';

test('Pact Magic slots are counted and consumed from their separate pool', () => {
  const pact = { level: 2, count: 2 };
  const sheet = { spellSlotUsed: { 2: 1, [getPactSlotUsedKey(2)]: 1 } };
  let sheetPatch = null;
  let characterPatch = null;

  assert.equal(getAvailablePactSlots(pact, sheet), 1);
  assert.equal(consumePactSlot(
    pact,
    sheet,
    (patch) => { sheetPatch = patch; },
    (update) => { characterPatch = update({}); },
  ), true);
  assert.deepEqual(sheetPatch.spellSlotUsed, { 2: 1, 'pact:2': 2 });
  assert.deepEqual(characterPatch.spellSlotsUsed, { 2: 1, 'pact:2': 2 });
  assert.equal(getAvailablePactSlots(pact, sheetPatch), 0);
});

test('Pact Magic consumption fails when its pool is empty', () => {
  const pact = { level: 3, count: 2 };
  const sheet = { spellSlotUsed: { 'pact:3': 2 } };

  assert.equal(getAvailablePactSlots(pact, sheet), 0);
  assert.equal(consumePactSlot(pact, sheet), false);
});
