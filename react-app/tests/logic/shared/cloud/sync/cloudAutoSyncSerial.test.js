import test from 'node:test';
import assert from 'node:assert/strict';
import { createCloudAutoSyncEngine } from '../../../../../src/shared/cloud/sync/cloudAutoSyncEngine.js';

// One push in flight per character: a save requested meanwhile waits, then
// runs once, from the latest local copy and the revision the first push
// produced — never racing it with the same expected revision.

const CONFLICT = 'SHEET_CONFLICT';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

// A cloud row with conditional updates, and a local copy that knows the
// revision it is based on (what pushCharacter does with its metadata).
function world(revision = 5) {
  const cloud = { revision, notes: '' };
  const local = { known: revision, notes: '' };
  const requests = [];
  let inFlight = 0;
  let maxInFlight = 0;
  const gates = [];
  const push = async () => {
    const expected = local.known;
    const notes = local.notes; // the latest copy, read when the push starts
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    const gate = deferred();
    gates.push(gate);
    requests.push({ expected, notes });
    try {
      await gate.promise;
      if (expected !== cloud.revision) throw Object.assign(new Error('changed elsewhere'), { code: CONFLICT });
      cloud.revision += 1;
      cloud.notes = notes;
      local.known = cloud.revision;
    } finally {
      inFlight -= 1;
    }
  };
  return { cloud, local, requests, gates, push, maxInFlight: () => maxInFlight };
}

function harness() {
  let nextTimer = 1;
  const callbacks = new Map();
  const events = [];
  const engine = createCloudAutoSyncEngine({
    delay: 1200,
    emit: (...args) => events.push(args),
    isActive: () => true,
    isConflict: (error) => error?.code === CONFLICT,
    setTimer: (callback) => { const id = nextTimer; nextTimer += 1; callbacks.set(id, callback); return id; },
    clearTimer: (id) => callbacks.delete(id),
  });
  const fireAll = () => {
    const pending = [...callbacks.values()];
    callbacks.clear();
    return pending.map((callback) => callback());
  };
  const settle = () => new Promise((resolve) => { setImmediate(resolve); });
  return { engine, events, timers: () => callbacks.size, fireAll, settle };
}

test('an edit during a push waits; the next push starts after it, from the new revision and the latest copy', async () => {
  const { engine, timers, fireAll, settle, events } = harness();
  const w = world(5);
  const job = { key: 'character:pc', id: 'pc', push: w.push };
  w.local.notes = 'a';
  engine.schedule(job);
  const first = fireAll();
  await settle();
  assert.equal(engine.isInFlight('character:pc'), true);
  w.local.notes = 'abc'; // edited while A is on its way
  engine.schedule(job);
  assert.equal(timers(), 0, 'no second timer, no second push while A runs');
  assert.equal(w.requests.length, 1);
  w.gates[0].resolve();
  await Promise.all(first);
  assert.equal(w.cloud.revision, 6);
  assert.equal(timers(), 1, 'the waiting save is scheduled once A ended');
  const second = fireAll();
  await settle();
  w.gates[1].resolve();
  await Promise.all(second);
  assert.deepEqual(w.requests, [{ expected: 5, notes: 'a' }, { expected: 6, notes: 'abc' }]);
  assert.equal(w.cloud.notes, 'abc');
  assert.equal(w.maxInFlight(), 1);
  assert.equal(events.some(([, state]) => state === 'error'), false, 'no false conflict');
});

test('several edits during a push coalesce into one later push of the latest copy', async () => {
  const { engine, fireAll, settle } = harness();
  const w = world(5);
  const job = { key: 'character:pc', id: 'pc', push: w.push };
  engine.schedule(job);
  const first = fireAll();
  await settle();
  for (const notes of ['b', 'bc', 'bcd']) { w.local.notes = notes; engine.schedule(job); }
  w.gates[0].resolve();
  await Promise.all(first);
  const second = fireAll();
  await settle();
  w.gates[1].resolve();
  await Promise.all(second);
  assert.equal(w.requests.length, 2);
  assert.deepEqual(w.requests[1], { expected: 6, notes: 'bcd' });
});

test('different characters push in parallel', async () => {
  const { engine, fireAll, settle } = harness();
  const a = world(1);
  const b = world(9);
  engine.schedule({ key: 'character:a', id: 'a', push: a.push });
  engine.schedule({ key: 'character:b', id: 'b', push: b.push });
  const running = fireAll();
  await settle();
  assert.equal(engine.isInFlight('character:a') && engine.isInFlight('character:b'), true);
  a.gates[0].resolve();
  b.gates[0].resolve();
  await Promise.all(running);
  assert.deepEqual([a.cloud.revision, b.cloud.revision], [2, 10]);
});

test('a real conflict holds the waiting save: nothing runs over the newer cloud copy', async () => {
  const { engine, timers, fireAll, settle, events } = harness();
  const w = world(5);
  const job = { key: 'character:pc', id: 'pc', push: w.push };
  engine.schedule(job);
  const first = fireAll();
  await settle();
  w.local.notes = 'mine';
  engine.schedule(job);
  w.cloud.revision = 6; // the GM saved while A was on its way
  w.gates[0].resolve();
  await Promise.all(first);
  assert.equal(timers(), 0, 'the queued save stays on hold');
  assert.equal(w.requests.length, 1);
  assert.equal(events.at(-1)[1], 'error');
  assert.equal(events.at(-1)[3].code, CONFLICT);
  assert.equal(w.cloud.revision, 6);
  // The user's choice (keep mine, rebased) is an ordinary new save.
  w.local.known = 6;
  engine.schedule(job);
  const resolved = fireAll();
  await settle();
  w.gates[1].resolve();
  await Promise.all(resolved);
  assert.equal(w.cloud.notes, 'mine');
});

test('a network error lets the waiting save run as the next ordinary attempt, still conditional', async () => {
  const { engine, timers, fireAll, settle } = harness();
  const w = world(5);
  const job = { key: 'character:pc', id: 'pc', push: w.push };
  engine.schedule(job);
  const first = fireAll();
  await settle();
  w.local.notes = 'later';
  engine.schedule(job);
  w.gates[0].reject(new Error('Failed to fetch'));
  await Promise.all(first);
  assert.equal(timers(), 1);
  const second = fireAll();
  await settle();
  w.gates[1].resolve();
  await Promise.all(second);
  assert.deepEqual(w.requests[1], { expected: 5, notes: 'later' }, 'same base revision: nothing landed');
  assert.equal(w.cloud.revision, 6);
});

test('cancelling a character drops its waiting save', async () => {
  const { engine, timers, fireAll, settle } = harness();
  const w = world(5);
  const job = { key: 'character:pc', id: 'pc', push: w.push };
  engine.schedule(job);
  const first = fireAll();
  await settle();
  engine.schedule(job);
  engine.cancel('character:pc', 'pc');
  w.gates[0].resolve();
  await Promise.all(first);
  assert.equal(timers(), 0);
  assert.equal(w.requests.length, 1);
});
