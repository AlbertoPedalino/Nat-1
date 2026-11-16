import test from 'node:test';
import assert from 'node:assert/strict';
import { buildActionTags } from '../../../../../src/pages/charsheet/actions/actionTags.js';
import { WEAPON_SLOTS } from '../../../../../src/shared/character/inventory/itemContainers.js';

const slotTag = (slot) => buildActionTags({ _weaponSlot: slot }).tags.find((tag) => tag.key === 'slot')?.label;

// An attack's slot tag names the slot as a card says it, never its stored id.
test("an attack's slot tag reads the slot's name", () => {
  assert.equal(slotTag('thrown'), 'Thrown');
  assert.equal(slotTag('mainHand'), 'Main Hand');
  assert.equal(slotTag('offHand'), 'Off Hand');
  assert.equal(slotTag('twoHands'), 'Two Hands');
  assert.equal(slotTag(null), undefined);
  Object.values(WEAPON_SLOTS).forEach(({ label }) => assert.match(label, /^[A-Z0-9]/));
});
