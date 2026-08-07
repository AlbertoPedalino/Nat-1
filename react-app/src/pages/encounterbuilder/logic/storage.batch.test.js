import test from 'node:test';
import assert from 'node:assert/strict';

class MemoryStorage {
  constructor() { this.store = new Map(); }

  getItem(key) { return this.store.has(key) ? this.store.get(key) : null; }

  setItem(key, value) { this.store.set(key, String(value)); }

  removeItem(key) { this.store.delete(key); }

  clear() { this.store.clear(); }

  key(index) { return Array.from(this.store.keys())[index] ?? null; }

  get length() { return this.store.size; }
}

const events = [];
if (!globalThis.localStorage) {
  Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true });
}
if (!globalThis.CustomEvent) {
  Object.defineProperty(globalThis, 'CustomEvent', {
    value: class { constructor(name, init) { this.type = name; this.detail = init?.detail; } },
    configurable: true,
  });
}
if (!globalThis.window) {
  Object.defineProperty(globalThis, 'window', {
    value: { dispatchEvent: (event) => { events.push(event); return true; }, CustomEvent: globalThis.CustomEvent },
    configurable: true,
  });
}

const {
  batchPersist,
  persistFights,
  persistLibrary,
  persistParty,
  readPersistedInstance,
  registerEncounterInstance,
} = await import('./storage.js');

// A save is only announced for an instance the registry knows about.
function seeded(id) {
  localStorage.clear();
  registerEncounterInstance(id, 'Test');
  events.length = 0;
  return id;
}

// The bug this exists for: a save writes six keys and used to announce each one.
// The first announcement went out while the other five were still the previous
// save, so a listener that reads storage back read a version that never
// existed — and put the encounter the GM had just deleted straight back.
test('a save is announced once, after every key is on disk', () => {
  const id = seeded('enc-batch-1');
  persistLibrary(id, [{ id: 1, name: 'Ambush' }]);
  events.length = 0;

  let seenDuringWrite = null;
  batchPersist(() => {
    persistParty(id, { count: 4, level: 3 }, []);
    // What a listener woken by the party write would have found: under the old
    // behaviour, the library as it was before this save.
    seenDuringWrite = readPersistedInstance(id).library;
    persistLibrary(id, []);
    persistFights(id, null, []);
    assert.equal(events.length, 0, 'nothing is announced until the save is complete');
  });

  assert.deepEqual(seenDuringWrite.map((entry) => entry.id), [1]);
  assert.equal(events.length, 1);
  assert.equal(events[0].detail.id, id);
  // And by the time anyone is told, storage says what the save meant.
  assert.deepEqual(readPersistedInstance(id).library, []);
});

test('a single write outside a batch is still announced on its own', () => {
  const id = seeded('enc-batch-2');
  persistLibrary(id, []);
  assert.equal(events.length, 1);

  persistFights(id, null, []);
  assert.equal(events.length, 2);
});

test('a batch that throws still announces what it wrote', () => {
  const id = seeded('enc-batch-3');

  assert.throws(() => batchPersist(() => {
    persistFights(id, null, []);
    throw new Error('half way');
  }), /half way/);
  assert.equal(events.length, 1, 'a listener must not be left believing nothing was saved');
});
