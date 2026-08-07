import test from 'node:test';
import assert from 'node:assert/strict';
import { externalDelta } from './externalSync.js';

const persisted = (items, library = []) => ({ fightsData: { activeFightId: null, items }, library });

test('a fight this tab has never seen is new, whatever its timestamp', () => {
  const delta = externalDelta(
    persisted([{ id: 'f2', savedAt: 1 }], [{ id: 'e2' }]),
    { fights: [{ id: 'f1', savedAt: 99 }], library: [{ id: 'e1' }], activeFightId: 'f1' },
  );
  assert.deepEqual(delta.fights.map((fight) => fight.id), ['f2']);
  assert.deepEqual(delta.library.map((entry) => entry.id), ['e2']);
});

// The map writes hit points into whichever fight a piece came from, which is
// usually not the one on screen — a room is sent to the builder without being
// made active on purpose.
test('a held fight counts only when storage is newer than what we hold', () => {
  const held = { fights: [{ id: 'f1', savedAt: 10 }], library: [], activeFightId: null };
  assert.deepEqual(
    externalDelta(persisted([{ id: 'f1', savedAt: 20 }]), held).fights.map((f) => f.id),
    ['f1'],
  );
  assert.deepEqual(externalDelta(persisted([{ id: 'f1', savedAt: 10 }]), held).fights, []);
  assert.deepEqual(externalDelta(persisted([{ id: 'f1', savedAt: 5 }]), held).fights, []);
});

// `resumeFight` already applies that one. Sending it here too would have the
// two mechanisms take turns undoing each other.
test('the fight in play is left to its own path', () => {
  const delta = externalDelta(
    persisted([{ id: 'f1', savedAt: 999 }]),
    { fights: [{ id: 'f1', savedAt: 1 }], library: [], activeFightId: 'f1' },
  );
  assert.deepEqual(delta.fights, []);
});

test('ids are compared as text, so a numeric fight id still matches', () => {
  const delta = externalDelta(
    persisted([{ id: 1786095432787, savedAt: 5 }]),
    { fights: [{ id: '1786095432787', savedAt: 5 }], library: [], activeFightId: null },
  );
  assert.deepEqual(delta.fights, []);
});

test('empty storage asks for nothing', () => {
  assert.deepEqual(externalDelta(null, {}), { fights: [], library: [] });
  assert.deepEqual(externalDelta(persisted([]), undefined), { fights: [], library: [] });
});
