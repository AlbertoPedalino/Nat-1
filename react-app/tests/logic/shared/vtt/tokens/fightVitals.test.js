import test from 'node:test';
import assert from 'node:assert/strict';
import { newerFightRow } from '../../../../../src/shared/vtt/tokens/fightVitals.js';

// The battle map's copy of a fight row: a recovery read that left before a
// realtime event arrived must not put the older enemy vitals back.
test('the copy with the newer vitals revision is kept', () => {
  const held = { id: 'f1', vitals_revision: 5, fight: { round: 2 } };
  const late = { id: 'f1', vitals_revision: 4, fight: { round: 1 } };
  const next = { id: 'f1', vitals_revision: 6, fight: { round: 3 } };

  assert.equal(newerFightRow(held, late), held);
  assert.equal(newerFightRow(held, next), next);
  // A full save leaves the revision alone: same revision, newer row, taken.
  const resaved = { ...held, fight: { round: 9 } };
  assert.equal(newerFightRow(held, resaved), resaved);
});

test('a copy without a revision is not compared', () => {
  const held = { id: 'f1', vitals_revision: 5 };
  const bare = { id: 'f1' };
  assert.equal(newerFightRow(held, bare), bare);
  assert.equal(newerFightRow(bare, held), held);
  assert.equal(newerFightRow(undefined, held), held);
});
