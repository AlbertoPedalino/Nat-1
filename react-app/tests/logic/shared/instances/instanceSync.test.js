import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

// Behaviour of the shared tool-instance layer (store + sync engine) over an
// in-memory Supabase, for GM Board, Encounter Builder and DM Screen alike.

class MemoryStorage {
  constructor() { this.store = new Map(); }
  getItem(key) { return this.store.has(key) ? this.store.get(key) : null; }
  setItem(key, value) { this.store.set(key, String(value)); }
  removeItem(key) { this.store.delete(key); }
  clear() { this.store.clear(); }
  key(index) { return Array.from(this.store.keys())[index] ?? null; }
  get length() { return this.store.size; }
  dump() { return new Map(this.store); }
  load(snapshot) { this.store = new Map(snapshot); }
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
if (!globalThis.window) {
  const target = new EventTarget();
  globalThis.window = {
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    dispatchEvent: target.dispatchEvent.bind(target),
  };
}

const store = await import('../../../../src/shared/instances/instanceStore.js');
const sync = await import('../../../../src/shared/instances/instanceSync.js');
const { SECTION_KEYS, SECTION_REGISTRY } = await import('../../../../src/shared/instances/sectionRegistry.js');
const gmBoard = await import('../../../../src/pages/gmboard/state/storage.js');
const encounters = await import('../../../../src/pages/encounterbuilder/state/storage.js');
const dmScreen = await import('../../../../src/pages/dmscreen/state/storage.js');

// Each tool's own adapter write, so the tests go through real payloads.
const WRITE = {
  gmboard: (id, n = 1) => gmBoard.persistBoardState(id, { day: n }),
  encounters: (id, n = 1) => encounters.persistParty(id, { count: n, level: 1 }, []),
  dmscreen: (id, n = 1) => dmScreen.persistNotes(id, [{ id: 'n', title: 'T', body: `B${n}` }]),
};

// In-memory PostgREST: owner-scoped, unique ids (23505), conditional updates
// through `eq` filters, and a log of every write it received.
function fakeCloud() {
  const tables = new Map();
  const writes = [];
  const reads = [];
  const table = (name) => {
    if (!tables.has(name)) tables.set(name, new Map());
    return tables.get(name);
  };
  function run(query) {
    const rows = table(query.table);
    const matches = () => [...rows.values()].filter((row) => query.filters.every(([field, value]) => row[field] === value));
    if (query.op === 'insert') {
      writes.push({ table: query.table, op: 'insert', row: query.row });
      if (rows.has(query.row.id)) return { data: null, error: { code: '23505', message: 'duplicate key value' } };
      rows.set(query.row.id, structuredClone(query.row));
      return { data: [structuredClone(query.row)], error: null };
    }
    if (query.op === 'update') {
      const found = matches();
      writes.push({ table: query.table, op: 'update', patch: query.patch, matched: found.length });
      for (const row of found) rows.set(row.id, { ...row, ...structuredClone(query.patch) });
      return { data: found.map((row) => structuredClone(rows.get(row.id))), error: null };
    }
    if (query.op === 'delete') {
      const found = matches();
      writes.push({ table: query.table, op: 'delete' });
      for (const row of found) rows.delete(row.id);
      return { data: null, error: null };
    }
    reads.push(query.table);
    return { data: matches().map((row) => structuredClone(row)), error: null };
  }
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'user-1', user_metadata: {} } }, error: null }) },
    from(tableName) {
      const query = { table: tableName, op: 'select', filters: [] };
      const builder = {
        select() { return builder; },
        insert(row) { query.op = 'insert'; query.row = row; return builder; },
        update(patch) { query.op = 'update'; query.patch = patch; return builder; },
        delete() { query.op = 'delete'; return builder; },
        eq(field, value) { query.filters.push([field, value]); return builder; },
        order() { return builder; },
        async maybeSingle() {
          const result = run(query);
          return { data: result.data?.[0] ?? null, error: result.error };
        },
        then(resolve, reject) { return Promise.resolve(run(query)).then(resolve, reject); },
      };
      return builder;
    },
  };
  return {
    client,
    writes,
    reads,
    row: (tableName, id) => structuredClone(table(tableName).get(id) || null),
    put: (tableName, row) => table(tableName).set(row.id, structuredClone(row)),
    edit: (tableName, id, patch) => table(tableName).set(id, { ...table(tableName).get(id), ...patch }),
  };
}

let cloud;

function online(active = true) {
  sync.setInstanceSyncActive(active);
}

// Background syncs run on timers; let them (and their chains) finish.
async function idle() {
  for (let round = 0; round < 20; round += 1) await new Promise((resolve) => { setTimeout(resolve, 1); });
}

function reset() {
  sync.disposeInstanceSync();
  online(false);
  storage.clear();
  cloud = fakeCloud();
  sync.configureInstanceSync({ getClient: () => cloud.client, delay: 0 });
}

const entry = (sectionKey, id) => store.getInstance(sectionKey, id);
const table = (sectionKey) => SECTION_REGISTRY[sectionKey].table;
const writeOps = () => cloud.writes.map((write) => write.op);

// A linked copy on this "device": created, saved and synced.
async function linkedCopy(sectionKey, id, n = 1) {
  store.createInstance(sectionKey, { id });
  WRITE[sectionKey](id, n);
  online();
  await idle();
  assert.equal(entry(sectionKey, id).cloud, 'linked');
}

test('a known local instance opens without asking the cloud, offline or online', async () => {
  for (const key of SECTION_KEYS) {
    reset();
    store.createInstance(key, { id: 'local_a' });
    WRITE[key]('local_a');
    assert.equal(await sync.openInstance(key, 'local_a'), 'local', `${key}: offline`);
    await linkedCopy(key, 'linked_a');
    cloud.reads.length = 0;
    assert.equal(await sync.openInstance(key, 'linked_a'), 'local', `${key}: online`);
    assert.deepEqual(cloud.reads, [], key);
  }
});

test('an unknown id is pulled when the cloud has it: its name and data, nothing written back', async () => {
  for (const key of SECTION_KEYS) {
    reset();
    await linkedCopy(key, 'shared_a', 7);
    const payload = store.readInstancePayload(key, 'shared_a');
    await sync.renameCloudInstance(key, 'shared_a', 'Boss Fight');
    storage.clear(); // a new browser
    cloud.writes.length = 0;

    assert.equal(await sync.openInstance(key, 'shared_a'), 'pulled', key);
    await idle();
    assert.deepEqual(store.readInstancePayload(key, 'shared_a'), payload, key);
    assert.equal(entry(key, 'shared_a').name, 'Boss Fight', key);
    assert.equal(entry(key, 'shared_a').cloud, 'linked', key);
    assert.deepEqual(cloud.writes, [], `${key}: opening never writes`);
  }
});

test('an unknown id the cloud lacks is created locally and its first sync is an INSERT', async () => {
  for (const key of SECTION_KEYS) {
    reset();
    online();
    assert.equal(await sync.openInstance(key, 'new_a'), 'created', key);
    assert.equal(entry(key, 'new_a').cloud, 'local-only', key);
    WRITE[key]('new_a');
    await idle();
    assert.deepEqual(writeOps(), ['insert'], key);
    assert.equal(cloud.row(table(key), 'new_a').name, SECTION_REGISTRY[key].defaultName('new_a'), key);
    assert.equal(entry(key, 'new_a').cloud, 'linked', key);
  }
});

test('offline, edits stay local and dirty; back online they sync', async () => {
  for (const key of SECTION_KEYS) {
    reset();
    await linkedCopy(key, 'trip_a', 1);
    online(false);
    WRITE[key]('trip_a', 2);
    store.createInstance(key, { id: 'trip_b' });
    WRITE[key]('trip_b', 3);
    await idle();
    const before = cloud.writes.length;
    assert.equal(entry(key, 'trip_a').dirty.data, true, key);
    assert.equal(entry(key, 'trip_b').cloud, 'local-only', key);

    online();
    await idle();
    assert.deepEqual(cloud.writes.slice(before).map((write) => write.op).sort(), ['insert', 'update'], key);
    assert.deepEqual(cloud.row(table(key), 'trip_a').data, store.readInstancePayload(key, 'trip_a'), key);
    assert.equal(entry(key, 'trip_a').dirty.data, false, key);
    assert.equal(entry(key, 'trip_b').cloud, 'linked', key);
  }
});

test('a rename reaches the cloud; a stale name on a second client never undoes it', async () => {
  for (const key of SECTION_KEYS) {
    reset();
    await linkedCopy(key, 'named_a');
    const clientB = storage.dump(); // B holds the default name

    // Client A renames.
    store.renameInstance(key, 'named_a', 'Dragon Fight');
    await idle();
    assert.equal(cloud.row(table(key), 'named_a').name, 'Dragon Fight', key);
    assert.equal(entry(key, 'named_a').dirty.name, false, key);

    // Client B edits only data.
    storage.load(clientB);
    WRITE[key]('named_a', 5);
    await idle();
    assert.equal(cloud.row(table(key), 'named_a').name, 'Dragon Fight', `${key}: name untouched`);
    assert.deepEqual(cloud.row(table(key), 'named_a').data, store.readInstancePayload(key, 'named_a'), `${key}: data synced`);
    assert.ok(!('name' in cloud.writes.at(-1).patch), `${key}: no name in a data update`);
    assert.equal(entry(key, 'named_a').name, 'Dragon Fight', `${key}: B adopts the cloud name`);

    // B renames explicitly: now its name is sent.
    store.renameInstance(key, 'named_a', 'My Version');
    await idle();
    assert.equal(cloud.row(table(key), 'named_a').name, 'My Version', key);
  }
});

test('data changed on another client turns a dirty copy into a conflict, never an overwrite', async () => {
  for (const key of SECTION_KEYS) {
    reset();
    await linkedCopy(key, 'both_a', 1);
    const clientB = storage.dump();

    WRITE[key]('both_a', 2); // A
    await idle();
    const cloudData = cloud.row(table(key), 'both_a').data;

    storage.load(clientB);
    WRITE[key]('both_a', 3); // B, from the old version
    await idle();
    assert.equal(entry(key, 'both_a').cloud, 'conflict', key);
    assert.equal(entry(key, 'both_a').conflict.reason, 'version', key);
    assert.deepEqual(cloud.row(table(key), 'both_a').data, cloudData, `${key}: A's data kept`);
    const mine = store.readInstancePayload(key, 'both_a');

    // Still usable locally, but nothing syncs until the user chooses.
    WRITE[key]('both_a', 4);
    await idle();
    assert.deepEqual(cloud.row(table(key), 'both_a').data, cloudData, key);
    assert.notDeepEqual(store.readInstancePayload(key, 'both_a'), mine, `${key}: local edits still saved`);
  }
});

test('resolving a conflict: the cloud copy replaces this one, or this one is written explicitly', async () => {
  for (const choice of ['cloud', 'local']) {
    reset();
    await linkedCopy('encounters', 'res_a', 1);
    const clientB = storage.dump();
    WRITE.encounters('res_a', 2);
    await idle();
    const cloudData = cloud.row('encounters', 'res_a').data;
    storage.load(clientB);
    WRITE.encounters('res_a', 3);
    await idle();
    const mine = store.readInstancePayload('encounters', 'res_a');

    await sync.resolveConflict('encounters', 'res_a', choice);
    await idle();
    assert.equal(entry('encounters', 'res_a').cloud, 'linked', choice);
    if (choice === 'cloud') {
      assert.deepEqual(store.readInstancePayload('encounters', 'res_a'), cloudData);
    } else {
      assert.deepEqual(cloud.row('encounters', 'res_a').data, mine);
    }
  }
});

test('a clean copy fast-forwards when the cloud moved on', async () => {
  reset();
  await linkedCopy('dmscreen', 'ff_a', 1);
  const clientB = storage.dump();
  WRITE.dmscreen('ff_a', 2);
  await idle();
  storage.load(clientB);

  assert.equal(await sync.refreshInstance('dmscreen', 'ff_a'), 'pulled');
  assert.deepEqual(store.readInstancePayload('dmscreen', 'ff_a'), cloud.row('dm_screens', 'ff_a').data);
  assert.equal(entry('dmscreen', 'ff_a').dirty.data, false);
});

test('insert race: a row created meanwhile makes the first sync a conflict', async () => {
  for (const key of SECTION_KEYS) {
    reset();
    online();
    assert.equal(await sync.openInstance(key, 'race_a'), 'created', key);
    cloud.put(table(key), { id: 'race_a', owner: 'user-1', name: 'Other device', data: { kept: '1' }, updated_at: 'v-other' });
    WRITE[key]('race_a');
    await idle();
    assert.equal(entry(key, 'race_a').cloud, 'conflict', key);
    assert.equal(entry(key, 'race_a').conflict.reason, 'exists', key);
    assert.deepEqual(cloud.row(table(key), 'race_a').data, { kept: '1' }, `${key}: never overwritten`);
    assert.ok(!writeOps().includes('update'), key);
  }
});

test('a copy made while signed out meets the cloud row on sign-in as a conflict', async () => {
  reset();
  await linkedCopy('gmboard', 'out_a', 9);
  const cloudRow = cloud.row('boards', 'out_a');
  storage.clear();
  online(false);

  assert.equal(await sync.openInstance('gmboard', 'out_a'), 'local');
  WRITE.gmboard('out_a', 1); // a stand-in, edited offline
  assert.equal(entry('gmboard', 'out_a').cloud, 'local-only');

  // Signing in flushes it: INSERT only, which finds the row.
  online();
  await idle();
  assert.equal(entry('gmboard', 'out_a').cloud, 'conflict');
  assert.equal(entry('gmboard', 'out_a').conflict.reason, 'exists');
  assert.deepEqual(cloud.row('boards', 'out_a'), cloudRow, 'no overwrite');
  assert.ok(!writeOps().slice(1).includes('update'));

  await sync.resolveConflict('gmboard', 'out_a', 'cloud');
  assert.deepEqual(store.readInstancePayload('gmboard', 'out_a'), cloudRow.data);
});

test('a pull keeps a rename or link change made here and not yet synced', async () => {
  reset();
  await linkedCopy('encounters', 'keep_a');
  online(false);
  store.renameInstance('encounters', 'keep_a', 'Local Rename');
  store.setInstanceLinkGroup('encounters', 'keep_a', 'link_local');
  cloud.edit('encounters', 'keep_a', { name: 'Cloud Name', link_group_id: 'link_cloud' });
  online();
  await sync.pullInstance('encounters', 'keep_a');
  assert.equal(entry('encounters', 'keep_a').name, 'Local Rename');
  assert.equal(entry('encounters', 'keep_a').linkGroupId, 'link_local');
  await idle();
  assert.equal(cloud.row('encounters', 'keep_a').name, 'Local Rename');
  assert.equal(cloud.row('encounters', 'keep_a').link_group_id, 'link_local');

  cloud.edit('encounters', 'keep_a', { name: 'Renamed Elsewhere' });
  await sync.pullInstance('encounters', 'keep_a');
  assert.equal(entry('encounters', 'keep_a').name, 'Renamed Elsewhere');
});

test('delete removes the local copy, and the cloud row only when asked', async () => {
  for (const key of SECTION_KEYS) {
    reset();
    await linkedCopy(key, 'del_a');
    await sync.deleteInstance(key, 'del_a');
    assert.equal(entry(key, 'del_a'), null, key);
    assert.deepEqual(store.readInstancePayload(key, 'del_a'), {}, key);
    assert.ok(cloud.row(table(key), 'del_a'), `${key}: local delete keeps the cloud row`);

    await linkedCopy(key, 'del_b');
    await sync.deleteInstance(key, 'del_b', { cloud: true });
    assert.equal(cloud.row(table(key), 'del_b'), null, key);

    // A pending sync of a deleted copy never runs.
    store.createInstance(key, { id: 'del_c' });
    WRITE[key]('del_c');
    await sync.deleteInstance(key, 'del_c');
    await idle();
    assert.equal(cloud.row(table(key), 'del_c'), null, key);
  }
});

test('more than 20 instances all stay listed and all sync', async () => {
  for (const key of SECTION_KEYS) {
    reset();
    online();
    for (let index = 0; index < 25; index += 1) {
      store.createInstance(key, { id: `many_${index}` });
      WRITE[key](`many_${index}`);
    }
    await idle();
    assert.equal(store.listInstances(key).length, 25, key);
    for (let index = 0; index < 25; index += 1) {
      assert.ok(cloud.row(table(key), `many_${index}`), `${key}: many_${index} synced`);
    }
  }
});

test('data without a registry entry is listed again and syncs without overwriting', async () => {
  for (const key of SECTION_KEYS) {
    reset();
    WRITE[key]('orphan_a');
    storage.setItem(SECTION_REGISTRY[key].registryKey, '[]');
    const orphan = entry(key, 'orphan_a');
    assert.ok(orphan, `${key}: rebuilt from its data`);
    assert.equal(orphan.cloud, 'local-only', key);
    online();
    await idle();
    assert.ok(cloud.row(table(key), 'orphan_a'), `${key}: inserted`);
  }
});

test('saving identical content is not a save', async () => {
  for (const key of SECTION_KEYS) {
    reset();
    await linkedCopy(key, 'same_a', 3);
    const changes = [];
    const unsubscribe = store.subscribeInstanceData(key, 'same_a', (event) => changes.push(event.kind));
    const before = cloud.writes.length;
    assert.equal(WRITE[key]('same_a', 3), key === 'dmscreen' ? true : false, key);
    await idle();
    unsubscribe();
    assert.deepEqual(changes, [], `${key}: nothing announced`);
    assert.equal(cloud.writes.length, before, `${key}: nothing synced`);
    assert.equal(entry(key, 'same_a').dirty.data, false, key);
  }
});

test('the encounter draft stamp is bookkeeping: an unchanged draft is not re-saved', () => {
  reset();
  encounters.persistDraft('enc_draft', [], null, 'Ambush', null);
  const first = store.readInstanceValue('encounters', 'enc_draft', encounters.STORAGE_KEYS.draft);
  assert.equal(encounters.persistDraft('enc_draft', [], null, 'Ambush', null), false);
  assert.equal(store.readInstanceValue('encounters', 'enc_draft', encounters.STORAGE_KEYS.draft), first);
  assert.equal(encounters.persistDraft('enc_draft', [], null, 'Ambush 2', null), true);
});

test('one save of several keys is one change, after every key is written', () => {
  reset();
  const seen = [];
  const unsubscribe = store.subscribeInstanceData('encounters', 'batch_a', () => {
    seen.push(Object.keys(store.readInstancePayload('encounters', 'batch_a')).length);
  });
  encounters.persistEncounter('batch_a', {
    party: { count: 4, level: 1 }, players: [], encounter: [], library: [], fights: [], activeFightId: null,
    fumbleTables: null, negotiation: null, currentEncounterId: null, encounterName: '', encounterQuest: null,
  });
  unsubscribe();
  assert.deepEqual(seen, [6]);
});

test('different tools sync side by side', async () => {
  reset();
  online();
  for (const key of SECTION_KEYS) {
    store.createInstance(key, { id: `side_${key}` });
    WRITE[key](`side_${key}`);
  }
  await idle();
  for (const key of SECTION_KEYS) {
    assert.equal(entry(key, `side_${key}`).cloud, 'linked', key);
    assert.ok(cloud.row(table(key), `side_${key}`), key);
  }
});

test('legacy registry entries are normalized, and an unversioned copy is verified before any write', async () => {
  reset();
  const legacy = [
    { id: 'old_new', name: 'Never synced', updatedAt: 1, pendingInsert: true, namePending: true },
    { id: 'old_same', name: 'Synced', updatedAt: 2, linkGroupPending: true, linkGroupId: 'link_x' },
    { id: 'old_diff', name: 'Stale', updatedAt: 3 },
  ];
  storage.setItem('gb_board_registry', JSON.stringify(legacy));
  for (const item of legacy) WRITE.gmboard(item.id, 1);
  cloud.put('boards', { id: 'old_same', owner: 'user-1', name: 'Synced', data: store.readInstancePayload('gmboard', 'old_same'), updated_at: 'v1' });
  cloud.put('boards', { id: 'old_diff', owner: 'user-1', name: 'Stale', data: { other: '1' }, updated_at: 'v1' });

  const byId = Object.fromEntries(store.listInstances('gmboard').map((item) => [item.id, item]));
  assert.equal(byId.old_new.cloud, 'local-only');
  assert.equal(byId.old_new.dirty.name, true);
  assert.equal(byId.old_same.cloud, 'linked');
  assert.equal(byId.old_same.version, null);
  assert.equal(byId.old_same.dirty.linkGroup, true);
  assert.ok(!('pendingInsert' in JSON.parse(storage.getItem('gb_board_registry'))[0]), 'written back in the new shape');

  online();
  await idle();
  assert.equal(entry('gmboard', 'old_new').cloud, 'linked');
  assert.equal(entry('gmboard', 'old_same').cloud, 'linked');
  assert.equal(entry('gmboard', 'old_same').version, 'v1');
  assert.equal(cloud.row('boards', 'old_same').link_group_id, 'link_x');
  assert.equal(entry('gmboard', 'old_diff').cloud, 'conflict');
  assert.deepEqual(cloud.row('boards', 'old_diff').data, { other: '1' }, 'unverified copy never written');
});

test('the three tools share one instance layer; adapters hold payload code only', () => {
  const here = new URL('../../../../src/', import.meta.url);
  const read = (path) => readFileSync(new URL(path, here), 'utf8');
  for (const file of readdirSync(new URL('shared/instances/', here))) {
    assert.doesNotMatch(read(`shared/instances/${file}`), /from ['"][./]*pages\//, `${file} must not depend on a tool`);
  }
  for (const adapter of ['pages/gmboard/state/storage.js', 'pages/encounterbuilder/state/storage.js', 'pages/dmscreen/state/storage.js']) {
    const source = read(adapter);
    assert.match(source, /shared\/instances\/instanceStore\.js/, adapter);
    assert.doesNotMatch(source, /supabase|instanceSync|instanceCloud|registryKey|readRegistry|localStorage\.setItem/, `${adapter} holds no sync or registry code`);
  }
  for (const page of ['pages/gmboard/GmBoardPage.jsx', 'pages/encounterbuilder/EncounterBuilderPage.jsx', 'pages/dmscreen/DmScreenPage.jsx']) {
    assert.match(read(page), /useToolInstance\('(gmboard|encounters|dmscreen)'\)/, page);
  }
});
