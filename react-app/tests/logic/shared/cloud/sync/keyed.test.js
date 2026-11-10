import test from 'node:test';
import assert from 'node:assert/strict';
import { createKeyedDebounce, createKeyedQueue } from '../../../../../src/shared/cloud/sync/keyed.js';

const tick = () => new Promise((resolve) => setImmediate(resolve));

test('a keyed queue runs one task per key at a time, in order, past failures', async () => {
  const queue = createKeyedQueue();
  const log = [];
  let release;
  const first = queue.run('a', () => new Promise((resolve) => { release = resolve; }).then(() => log.push('a1')));
  const second = queue.run('a', () => { log.push('a2'); throw new Error('boom'); });
  const third = queue.run('a', () => log.push('a3'));
  const other = queue.run('b', () => log.push('b1'));
  await other;
  assert.deepEqual(log, ['b1'], 'another key does not wait');
  release();
  await first;
  await assert.rejects(second, /boom/);
  await third;
  assert.deepEqual(log, ['b1', 'a1', 'a2', 'a3']);
});

test('a keyed debounce runs once per key after the last schedule, and can be cancelled', async () => {
  const pending = [];
  const debounce = createKeyedDebounce({
    delay: 100,
    setTimer: (fn, wait) => { const timer = { fn, wait }; pending.push(timer); return timer; },
    clearTimer: (timer) => { pending.splice(pending.indexOf(timer), 1); },
  });
  const runs = [];
  debounce.schedule('x', () => runs.push('x1'));
  debounce.schedule('x', () => runs.push('x2'));
  debounce.schedule('y', () => runs.push('y'), 0);
  assert.equal(pending.length, 2);
  assert.deepEqual(pending.map((timer) => timer.wait), [100, 0]);
  assert.equal(debounce.has('x'), true);
  pending[0].fn();
  assert.deepEqual(runs, ['x2']);
  assert.equal(debounce.has('x'), false);
  assert.equal(debounce.cancel('y'), true);
  assert.equal(debounce.cancel('y'), false);
  debounce.schedule('z', () => runs.push('z'));
  debounce.cancelAll();
  assert.equal(pending.length, 1, 'only the already-fired x timer object remains in this fake list');
  await tick();
  assert.deepEqual(runs, ['x2']);
});

test('a keyed debounce can run everything pending at once', () => {
  const pending = [];
  const debounce = createKeyedDebounce({
    delay: 100,
    setTimer: (fn) => { const timer = { fn }; pending.push(timer); return timer; },
    clearTimer: (timer) => { pending.splice(pending.indexOf(timer), 1); },
  });
  const runs = [];
  debounce.schedule('a', () => runs.push('a1'));
  debounce.schedule('a', () => runs.push('a2'));
  debounce.schedule('b', () => runs.push('b'));
  debounce.flushAll();
  assert.deepEqual(runs, ['a2', 'b']);
  assert.equal(pending.length, 0);
  assert.equal(debounce.has('a'), false);
  debounce.flushAll();
  assert.deepEqual(runs, ['a2', 'b'], 'nothing runs twice');
});
