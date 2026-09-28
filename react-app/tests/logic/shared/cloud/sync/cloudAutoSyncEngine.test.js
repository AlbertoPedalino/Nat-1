import test from 'node:test';
import assert from 'node:assert/strict';
import { createCloudAutoSyncEngine } from '../../../../../src/shared/cloud/sync/cloudAutoSyncEngine.js';

function harness() {
  let nextTimer = 1;
  const callbacks = new Map();
  const events = [];
  const engine = createCloudAutoSyncEngine({
    delay: 1200,
    emit: (...args) => events.push(args),
    isActive: () => true,
    setTimer: (callback) => {
      const id = nextTimer;
      nextTimer += 1;
      callbacks.set(id, callback);
      return id;
    },
    clearTimer: (id) => callbacks.delete(id),
  });
  return {
    engine,
    events,
    pending: () => callbacks.size,
    fire: async () => {
      const callback = [...callbacks.values()][0];
      callbacks.clear();
      await callback?.();
    },
  };
}

test('autosync debounces repeated saves into one push per id', async () => {
  const { engine, pending, fire } = harness();
  let pushes = 0;
  const job = { key: 'gmboard:b1', id: 'b1', push: async () => { pushes += 1; } };
  engine.schedule(job);
  engine.schedule(job);
  engine.schedule(job);
  assert.equal(pending(), 1);
  await fire();
  assert.equal(pushes, 1);
});

test('permission failure blocks id for session instead of retrying', async () => {
  const { engine, pending, fire, events } = harness();
  let pushes = 0;
  const job = {
    key: 'encounters:e1',
    id: 'e1',
    push: async () => {
      pushes += 1;
      throw new Error('new row violates row-level security policy');
    },
  };
  engine.schedule(job);
  await fire();
  assert.equal(engine.isBlocked(job.key), true);
  assert.equal(engine.schedule(job), false);
  assert.equal(pending(), 0);
  assert.equal(pushes, 1);
  assert.equal(events.at(-1)[1], 'error');
});
