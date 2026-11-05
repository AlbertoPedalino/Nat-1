import test from 'node:test';
import assert from 'node:assert/strict';
import { createPendingWrites } from '../../../../../src/shared/cloud/sync/pendingWrites.js';

test('a key stays pending until its last write finishes', () => {
  const pending = createPendingWrites();
  const first = pending.begin('grid');
  const second = pending.begin('grid');
  assert.equal(pending.has('grid'), true);
  assert.deepEqual(first(), []);
  assert.equal(pending.has('grid'), true);
  assert.deepEqual(second(), ['grid']);
  assert.equal(pending.size, 0);
});

test('several keys at once; finishing twice does nothing more', () => {
  const pending = createPendingWrites();
  const both = pending.begin(['a', 'b']);
  const onlyA = pending.begin('a');
  assert.deepEqual([...pending.keys()].sort(), ['a', 'b']);
  assert.deepEqual(both(), ['b']);
  assert.deepEqual(both(), []);
  assert.equal(pending.has('a'), true);
  assert.deepEqual(onlyA(), ['a']);
  assert.equal(pending.size, 0);
});
