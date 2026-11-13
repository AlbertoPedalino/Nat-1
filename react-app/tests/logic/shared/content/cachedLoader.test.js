import test from 'node:test';
import assert from 'node:assert/strict';
import { cachedLoaderByKey } from '../../../../src/shared/content/cachedLoader.js';

test('a keyed loader runs once per key and tries a failed key again', async () => {
  const calls = [];
  let failNext = true;
  const load = cachedLoaderByKey(async (key) => {
    calls.push(key);
    if (key === 'flaky' && failNext) {
      failNext = false;
      throw new Error('offline');
    }
    return `${key}!`;
  });

  assert.equal(await load('a'), 'a!');
  assert.equal(await load('a'), 'a!');
  assert.equal(await load('b'), 'b!');
  await assert.rejects(load('flaky'), /offline/);
  assert.equal(await load('flaky'), 'flaky!');
  assert.deepEqual(calls, ['a', 'b', 'flaky', 'flaky']);
});
