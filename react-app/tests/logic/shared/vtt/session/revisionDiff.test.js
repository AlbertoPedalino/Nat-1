import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_TARGETED_IDS,
  assembleSnapshot,
  diffRevisions,
  idsOnly,
  tooManyToTarget,
} from '../../../../../src/shared/vtt/session/revisionDiff.js';

test('an unchanged table is clean and names nothing to fetch', () => {
  const diff = diffRevisions(
    [{ id: 'a', version: 1 }, { id: 'b', version: 2 }],
    new Map([['a', 1], ['b', 2]]),
  );
  assert.deepEqual(diff, { ids: ['a', 'b'], changed: [], removed: [], clean: true });
});

test('moved, new and vanished rows are told apart', () => {
  const diff = diffRevisions(
    [{ id: 'a', version: 1 }, { id: 'b', version: 3 }, { id: 'c', version: 1 }],
    new Map([['a', 1], ['b', 2], ['gone', 5]]),
  );
  assert.deepEqual(diff.changed, ['b', 'c']);
  assert.deepEqual(diff.removed, ['gone']);
  assert.equal(diff.clean, false);
});

test('strokes compare by id only', () => {
  const diff = diffRevisions([{ id: 'a' }, { id: 'new' }], new Map([['a', undefined], ['erased', undefined]]), idsOnly);
  assert.deepEqual(diff.changed, ['new']);
  assert.deepEqual(diff.removed, ['erased']);
});

test('the snapshot keeps database order and drops a changed row that did not come back', () => {
  const held = new Map([['a', { id: 'a', v: 1 }], ['b', { id: 'b', v: 1 }], ['c', { id: 'c', v: 1 }]]);
  const rows = assembleSnapshot(['c', 'b', 'a'], ['b', 'c'], [{ id: 'b', v: 2 }], held);
  assert.deepEqual(rows, [{ id: 'b', v: 2 }, { id: 'a', v: 1 }]);
});

test('a long change list falls back to one full read', () => {
  assert.equal(tooManyToTarget(Array.from({ length: MAX_TARGETED_IDS }, (_, i) => i)), false);
  assert.equal(tooManyToTarget(Array.from({ length: MAX_TARGETED_IDS + 1 }, (_, i) => i)), true);
});
