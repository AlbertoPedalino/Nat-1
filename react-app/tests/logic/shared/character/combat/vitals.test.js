import test from 'node:test';
import assert from 'node:assert/strict';
import { clampDeathSaveCount, normalizeDeathSaves } from '../../../../../src/shared/character/combat/vitals.js';

test('death saves read either shape and clamp each count to 0-3', () => {
  assert.deepEqual(normalizeDeathSaves({ success: 2, fail: 1 }), { success: 2, fail: 1 });
  assert.deepEqual(normalizeDeathSaves({ success: 1, fail: 3 }), { success: 1, fail: 3 });
  assert.deepEqual(normalizeDeathSaves({ success: 7, fail: -2 }), { success: 3, fail: 0 });
  assert.deepEqual(normalizeDeathSaves({ success: '2', fail: 1.6 }), { success: 2, fail: 2 });
  assert.deepEqual(normalizeDeathSaves(null), { success: 0, fail: 0 });
  assert.equal(clampDeathSaveCount(4), 3);
  assert.equal(clampDeathSaveCount('x'), 0);
});
