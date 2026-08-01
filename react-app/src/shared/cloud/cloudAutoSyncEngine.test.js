import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createCloudAutoSyncEngine,
  registerSectionAutoSyncListeners,
} from './cloudAutoSyncEngine.js';
import { SECTION_REGISTRY } from '../sectionRegistry.js';

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

test('autosync debounces repeated saves into one push per section id', async () => {
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

test('entry autosync keeps section storage adapters behind a dynamic import', () => {
  const source = readFileSync(new URL('./CloudAutoSync.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /from ['"]\.\/(?:cloudSections|sectionDescriptors)\.js['"]/);
  assert.match(source, /import\(['"]\.\/cloudSections\.js['"]\)/);
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

test('local delete cancels pending push and never invokes cloud delete', async () => {
  const { engine, pending, fire } = harness();
  let pushes = 0;
  let cloudDeletes = 0;
  let cloudLoads = 0;
  const eventTarget = new EventTarget();
  const sections = { dmscreen: SECTION_REGISTRY.dmscreen };
  const removeListeners = registerSectionAutoSyncListeners({
    eventTarget,
    engine,
    sections,
    loadCloudSections: async () => {
      cloudLoads += 1;
      return {
        dmscreen: {
          pushInstance: async () => { pushes += 1; },
          deleteCloudInstance: async () => { cloudDeletes += 1; },
        },
      };
    },
  });

  const saveEvent = new Event(sections.dmscreen.saveEvent);
  Object.defineProperty(saveEvent, 'detail', { value: { id: 's1' } });
  eventTarget.dispatchEvent(saveEvent);
  assert.equal(pending(), 1);

  const deleteEvent = new Event(sections.dmscreen.deleteEvent);
  Object.defineProperty(deleteEvent, 'detail', { value: { id: 's1' } });
  eventTarget.dispatchEvent(deleteEvent);
  assert.equal(pending(), 0);
  await fire();
  assert.equal(cloudLoads, 0);
  assert.equal(pushes, 0);
  assert.equal(cloudDeletes, 0);
  removeListeners();
});
