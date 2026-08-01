import test from 'node:test';
import assert from 'node:assert/strict';
import { createSectionCloudApi } from './cloudSectionCore.js';
import { SECTION_DESCRIPTORS, SECTION_KEYS } from './sectionDescriptors.js';

class MemoryStorage {
  setItem(key, value) { this[key] = String(value); }
  getItem(key) { return Object.prototype.hasOwnProperty.call(this, key) ? this[key] : null; }
  removeItem(key) { delete this[key]; }
  clear() { for (const key of Object.keys(this)) delete this[key]; }
  key(index) { return Object.keys(this)[index] ?? null; }
  get length() { return Object.keys(this).length; }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new MemoryStorage(),
  configurable: true,
});

const CASES = {
  gmboard: {
    id: 'board-a',
    table: 'boards',
    registryKey: 'gb_board_registry',
    prefix: 'gb:board:board-a:',
    payload: {
      'gb:board:board-a:state:v1': '{ "time": 1 }',
      'gb:board:board-a:tables:v1': '[{"raw":true}]',
      'gb:board:board-a:results:v1': '{"result":"kept"}',
    },
  },
  encounters: {
    id: 'enc-a',
    table: 'encounters',
    registryKey: 'gb_encounter_registry',
    prefix: 'gb:enc:enc-a:',
    payload: Object.fromEntries(
      ['party', 'draft', 'library', 'fights', 'fumbles', 'negotiation']
        .map((key, index) => [`gb:enc:enc-a:${key}:v1`, `{ "slot": ${index} }`]),
    ),
  },
  dmscreen: {
    id: 'screen-a',
    table: 'dm_screens',
    registryKey: 'gb_dmscreen_registry',
    prefix: 'gb:dmscreen:screen-a:',
    payload: {
      'gb:dmscreen:screen-a:notes:v1': '{"version":1,"notes":[{"id":"old","title":"Old","body":"v1"}]}',
      'gb:dmscreen:screen-a:notes:v2': '{ "version": 2, "notes": [{"id":"new","title":"New","body":"v2","size":{"cols":6,"height":0}}] }',
    },
  },
};

test('every section descriptor is complete and maps table, registry, and prefix', () => {
  assert.deepEqual([...SECTION_KEYS].sort(), Object.keys(CASES).sort());
  for (const [key, expected] of Object.entries(CASES)) {
    const descriptor = SECTION_DESCRIPTORS[key];
    assert.equal(descriptor.key, key);
    assert.equal(descriptor.table, expected.table);
    assert.equal(descriptor.registryKey, expected.registryKey);
    assert.equal(descriptor.scopedPrefix(expected.id), expected.prefix);
    for (const field of [
      'activeKey', 'saveEvent', 'deleteEvent', 'sanitizeId', 'readRegistry',
      'readPayload', 'writePayload', 'defaultName',
    ]) assert.ok(descriptor[field], `${key}.${field} missing`);
  }
});

test('mocked cloud pull restores byte-identical scoped payload for every section', async () => {
  for (const [key, sample] of Object.entries(CASES)) {
    localStorage.clear();
    localStorage.setItem(sample.registryKey, JSON.stringify([{ id: sample.id, name: 'Local', updatedAt: 1 }]));
    for (const [storageKey, raw] of Object.entries(sample.payload)) localStorage.setItem(storageKey, raw);
    const serialized = SECTION_DESCRIPTORS[key].readPayload(sample.id);
    for (const storageKey of Object.keys(sample.payload)) localStorage.removeItem(storageKey);
    localStorage.setItem(`${sample.prefix}stale:v1`, 'remove-me');

    const query = {
      select() { return this; },
      eq() { return this; },
      async single() {
        return {
          data: {
            id: sample.id,
            name: 'Cloud Name',
            data: serialized,
            updated_at: '2026-08-01T10:00:00.000Z',
          },
          error: null,
        };
      },
    };
    const client = { from: (table) => {
      assert.equal(table, sample.table);
      return query;
    } };
    const api = createSectionCloudApi(SECTION_DESCRIPTORS[key], { getClient: () => client });
    await api.pullInstance(sample.id);

    assert.deepEqual(SECTION_DESCRIPTORS[key].readPayload(sample.id), sample.payload);
    for (const [storageKey, raw] of Object.entries(sample.payload)) {
      assert.equal(localStorage.getItem(storageKey), raw);
    }
    assert.equal(localStorage.getItem(`${sample.prefix}stale:v1`), null);
  }
});

test('unsaved new section produces no cloud call or write', async () => {
  localStorage.clear();
  let clientCalls = 0;
  let writes = 0;
  const api = createSectionCloudApi(SECTION_DESCRIPTORS.gmboard, {
    getClient: () => {
      clientCalls += 1;
      return { from: () => ({ upsert: async () => { writes += 1; return { error: null }; } }) };
    },
  });
  assert.equal(await api.pushInstance('new'), null);
  assert.equal(await api.pushInstance('generated-but-unsaved'), null);
  assert.equal(clientCalls, 0);
  assert.equal(writes, 0);
});

test('cloud rename updates only the signed-in owner row', async () => {
  const filters = [];
  let update = null;
  const query = {
    update(value) {
      update = value;
      return this;
    },
    eq(field, value) {
      filters.push([field, value]);
      return this;
    },
  };
  const client = {
    auth: {
      getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }),
    },
    from(table) {
      assert.equal(table, 'boards');
      return query;
    },
  };
  const api = createSectionCloudApi(SECTION_DESCRIPTORS.gmboard, { getClient: () => client });

  const name = await api.renameCloudInstance('board-a', '  New Board Name  ');

  assert.equal(name, 'New Board Name');
  assert.equal(update.name, 'New Board Name');
  assert.ok(!Number.isNaN(Date.parse(update.updated_at)));
  assert.deepEqual(filters, [['id', 'board-a'], ['owner', 'user-1']]);
});

test('cloud rename rejects empty names before making a cloud call', async () => {
  let clientCalls = 0;
  const api = createSectionCloudApi(SECTION_DESCRIPTORS.gmboard, {
    getClient: () => {
      clientCalls += 1;
      return {};
    },
  });

  await assert.rejects(() => api.renameCloudInstance('board-a', '   '), /cannot be empty/);
  assert.equal(clientCalls, 0);
});
