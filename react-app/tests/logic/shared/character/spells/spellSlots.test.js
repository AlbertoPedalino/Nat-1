import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addCreatedSlot,
  availableRegularSlotLevels,
  consumeSlot,
  consumePactSlot,
  getAvailablePactSlots,
  getPactSlotUsedKey,
  recoverPactSlots,
} from '../../../../../src/shared/character/spells/spellSlots.js';

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

test('Pact Magic recovery returns no update when no slot was expended', () => {
  const used = { 1: 2, 'pact:3': 0 };

  assert.equal(recoverPactSlots(used, 3, 1), null);
  assert.deepEqual(used, { 1: 2, 'pact:3': 0 });
});

test('Pact Magic recovery preserves unrelated slot state', () => {
  const result = recoverPactSlots({ 1: 2, 'pact:3': 2 }, 3, 1);

  assert.deepEqual(result, {
    used: { 1: 2, 'pact:3': 1 },
    recovered: 1,
  });
});

test('the slot levels offered to pick from are those with a slot left, temporary ones included', () => {
  const regular = [2, 1, 0, 1];
  const sheet = { spellSlotUsed: { 1: 2, 2: 1 }, createdSpellSlots: { 2: 1 } };
  assert.deepEqual(availableRegularSlotLevels(regular, sheet), [
    { level: 2, available: 1, hasCreated: true },
    { level: 4, available: 1, hasCreated: false },
  ]);
});

test('a created slot is added, then spent before the regular slots of its level', () => {
  let sheet = { spellSlotUsed: {}, createdSpellSlots: {} };
  const onUpdateSheet = (patch) => { sheet = { ...sheet, ...patch }; };
  addCreatedSlot(sheet, 1, onUpdateSheet);
  assert.deepEqual(sheet.createdSpellSlots, { 1: 1 });
  assert.equal(consumeSlot([2], sheet, 1, onUpdateSheet), true);
  assert.deepEqual(sheet.createdSpellSlots, {});
  assert.deepEqual(sheet.spellSlotUsed, {});
  assert.equal(consumeSlot([2], sheet, 1, onUpdateSheet), true);
  assert.deepEqual(sheet.spellSlotUsed, { 1: 1 });
});
