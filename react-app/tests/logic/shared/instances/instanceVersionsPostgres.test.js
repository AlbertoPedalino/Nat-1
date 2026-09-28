import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { SUPABASE_STUBS } from '../cloud/supabaseStubs.js';

// The sync engine against a real Postgres built from the real migrations
// (02_sections.sql + 18_section_versions.sql). A small PostgREST stand-in turns
// the client's query builder into SQL, so version checks, the increment
// trigger and unique ids are the database's own. Two devices are two
// localStorage contents sharing that database.

// The database is built before the browser shims below: PGlite picks its
// runtime from the globals it finds.
const USER = '00000000-0000-0000-0000-0000000000b2';
const DIR = new URL('../../../../supabase/', import.meta.url);

const db = new PGlite();
await db.exec(SUPABASE_STUBS);
for (const file of ['01_schema.sql', '02_sections.sql', '18_section_versions.sql']) {
  await db.exec(await readFile(new URL(file, DIR), 'utf8'));
}
await db.exec(`insert into auth.users (id) values ('${USER}')`);

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
const dmScreen = await import('../../../../src/pages/dmscreen/state/storage.js');


// JSON as PostgREST sends it: bigint as a number, timestamps as strings.
function asJson(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key, typeof value === 'bigint' ? Number(value) : value instanceof Date ? value.toISOString() : value,
  ]));
}

const writes = [];

function postgrest() {
  return {
    auth: { getUser: async () => ({ data: { user: { id: USER, user_metadata: {} } }, error: null }) },
    from(table) {
      const query = { op: 'select', columns: '*', filters: [] };
      async function run() {
        const params = [];
        const param = (value) => { params.push(value); return `$${params.length}`; };
        const value = (key, raw) => (key === 'data' ? JSON.stringify(raw) : raw);
        let sql;
        if (query.op === 'insert') {
          const keys = Object.keys(query.row);
          sql = `insert into public.${table} (${keys.join(', ')}) values (${keys.map((key) => param(value(key, query.row[key]))).join(', ')})`;
        } else if (query.op === 'update') {
          const keys = Object.keys(query.patch);
          sql = `update public.${table} set ${keys.map((key) => `${key} = ${param(value(key, query.patch[key]))}`).join(', ')}`;
        } else if (query.op === 'delete') {
          sql = `delete from public.${table}`;
        } else {
          sql = `select ${query.columns} from public.${table}`;
        }
        if (query.filters.length) sql += ` where ${query.filters.map(([field, raw]) => `${field} = ${param(raw)}`).join(' and ')}`;
        if (query.op !== 'select') sql += ` returning ${query.columns}`;
        if (query.op !== 'select') writes.push({ table, op: query.op, sql });
        try {
          return { data: (await db.query(sql, params)).rows.map(asJson), error: null };
        } catch (error) {
          return { data: null, error: { code: error.code, message: error.message } };
        }
      }
      const builder = {
        select(columns) { if (columns) query.columns = columns; return builder; },
        insert(row) { query.op = 'insert'; query.row = row; return builder; },
        update(patch) { query.op = 'update'; query.patch = patch; return builder; },
        delete() { query.op = 'delete'; return builder; },
        eq(field, raw) { query.filters.push([field, raw]); return builder; },
        order() { return builder; },
        async maybeSingle() {
          const result = await run();
          return { data: result.data?.[0] ?? null, error: result.error };
        },
        then(resolve, reject) { return run().then(resolve, reject); },
      };
      return builder;
    },
  };
}

const client = postgrest();
sync.configureInstanceSync({ getClient: () => client, delay: 0 });

async function idle() {
  for (let round = 0; round < 30; round += 1) await new Promise((resolve) => { setTimeout(resolve, 5); });
}
const online = (active) => sync.setInstanceSyncActive(active);
const row = async (id) => {
  const result = await db.query('select id, name, data, version, updated_at from public.dm_screens where id = $1', [id]);
  return result.rows[0] ? asJson(result.rows[0]) : null;
};
const entry = (id) => store.getInstance('dmscreen', id);
const write = (id, body) => dmScreen.persistNotes(id, [{ id: 'n', title: 'T', body }]);
const updates = () => writes.filter((item) => item.op === 'update' && /set data/.test(item.sql));
// Timestamps forced below the trigger, to show they no longer matter.
async function forceTimestamp(id, stamp) {
  await db.exec('alter table public.dm_screens disable trigger dm_screens_version');
  await db.query('update public.dm_screens set updated_at = $1 where id = $2', [stamp, id]);
  await db.exec('alter table public.dm_screens enable trigger dm_screens_version');
}

// Device A creates the instance; device B opens it: both at version N.
async function twoDevicesAt(id) {
  online(true);
  store.createInstance('dmscreen', { id });
  write(id, 'start');
  await idle();
  const deviceA = storage.dump();
  storage.clear();
  assert.equal(await sync.openInstance('dmscreen', id), 'pulled');
  const deviceB = storage.dump();
  return { deviceA, deviceB, n: (await row(id)).version };
}

beforeEach(async () => {
  online(false);
  storage.clear();
  writes.length = 0;
  await db.exec('delete from public.dm_screens');
});

test('1-5: A and B at N; A saves N+1; B with N conflicts without overwrite; pull adopts N+1; next save N+2', async () => {
  const { deviceA, deviceB, n } = await twoDevicesAt('v_main');
  assert.equal(n, 0);

  storage.load(deviceA);
  assert.equal(entry('v_main').version, n);
  write('v_main', 'from A');
  await idle();
  assert.equal((await row('v_main')).version, n + 1);
  assert.equal(entry('v_main').version, n + 1, 'A adopts the version the database returned');

  storage.load(deviceB);
  assert.equal(entry('v_main').version, n);
  write('v_main', 'from B');
  await idle();
  assert.equal(entry('v_main').cloud, 'conflict');
  const afterConflict = await row('v_main');
  assert.equal(afterConflict.version, n + 1, 'no increment: nothing written');
  assert.match(afterConflict.data['gb:dmscreen:v_main:notes:v2'], /from A/, 'zero overwrite');

  await sync.resolveConflict('dmscreen', 'v_main', 'cloud');
  assert.equal(entry('v_main').version, n + 1, 'the pull adopts N+1');
  assert.equal(entry('v_main').cloud, 'linked');
  write('v_main', 'B again');
  await idle();
  assert.equal((await row('v_main')).version, n + 2);
  assert.equal(entry('v_main').version, n + 2);
});

test('6: an offline edit syncs on reconnect when the cloud version is unchanged', async () => {
  const { deviceA } = await twoDevicesAt('v_off');
  storage.load(deviceA);
  online(false);
  write('v_off', 'offline');
  await idle();
  assert.equal(updates().length, 0);
  assert.equal(entry('v_off').dirty.data, true);

  online(true);
  await idle();
  assert.equal((await row('v_off')).version, 1);
  assert.match((await row('v_off')).data['gb:dmscreen:v_off:notes:v2'], /offline/);
  assert.equal(entry('v_off').dirty.data, false);
});

test('7: an offline edit meets a cloud that moved on: conflict, no overwrite', async () => {
  const { deviceA, deviceB } = await twoDevicesAt('v_moved');
  storage.load(deviceB);
  online(false);
  write('v_moved', 'offline B');
  const offlineB = storage.dump();

  storage.load(deviceA);
  online(true);
  write('v_moved', 'online A');
  await idle();

  online(false);
  storage.load(offlineB);
  online(true);
  await idle();
  assert.equal(entry('v_moved').cloud, 'conflict');
  assert.match((await row('v_moved')).data['gb:dmscreen:v_moved:notes:v2'], /online A/);
  assert.equal((await row('v_moved')).version, 1);
});

test('8: an INSERT race is a conflict and never becomes an UPDATE', async () => {
  online(true);
  assert.equal(await sync.openInstance('dmscreen', 'v_race'), 'created');
  await db.query(`insert into public.dm_screens (id, owner, name, data) values ('v_race', $1, 'Other', '{"x":"1"}')`, [USER]);
  write('v_race', 'mine');
  await idle();
  assert.equal(entry('v_race').cloud, 'conflict');
  assert.equal(entry('v_race').conflict.reason, 'exists');
  assert.deepEqual((await row('v_race')).data, { x: '1' });
  assert.equal(updates().length, 0);
});

test('9: Keep this copy writes it against the version just checked', async () => {
  const { deviceA, deviceB } = await twoDevicesAt('v_keep');
  storage.load(deviceA);
  write('v_keep', 'A');
  await idle();
  storage.load(deviceB);
  write('v_keep', 'B keeps');
  await idle();
  assert.equal(entry('v_keep').cloud, 'conflict');

  await sync.resolveConflict('dmscreen', 'v_keep', 'local');
  const kept = await row('v_keep');
  assert.match(kept.data['gb:dmscreen:v_keep:notes:v2'], /B keeps/);
  assert.equal(kept.version, 2);
  assert.equal(entry('v_keep').version, 2);
  // The overwrite was the conditional update at the checked version (1).
  assert.match(updates().at(-1).sql, /version = \$\d+/);
});

test('10: Use cloud copy pulls the row and adopts its version', async () => {
  const { deviceA, deviceB } = await twoDevicesAt('v_use');
  storage.load(deviceA);
  write('v_use', 'A wins');
  await idle();
  storage.load(deviceB);
  write('v_use', 'B loses');
  await idle();
  await sync.resolveConflict('dmscreen', 'v_use', 'cloud');
  assert.match(store.readInstanceValue('dmscreen', 'v_use', 'notes:v2'), /A wins/);
  assert.equal(entry('v_use').version, 1);
  assert.equal(entry('v_use').dirty.data, false);
});

test('11: a rename on A survives a data save from B holding the old name', async () => {
  const { deviceA, deviceB } = await twoDevicesAt('v_name');
  storage.load(deviceA);
  store.renameInstance('dmscreen', 'v_name', 'Dragon Fight');
  await idle();
  assert.equal((await row('v_name')).name, 'Dragon Fight');
  assert.equal((await row('v_name')).version, 0, 'a rename is not a data revision');

  storage.load(deviceB);
  write('v_name', 'B data');
  await idle();
  assert.equal(entry('v_name').cloud, 'linked', 'no false conflict');
  assert.equal((await row('v_name')).name, 'Dragon Fight');
  assert.equal((await row('v_name')).version, 1);
  assert.equal(entry('v_name').name, 'Dragon Fight');
});

test('12: identical or altered timestamps have no effect on concurrency', async () => {
  const { deviceA, deviceB } = await twoDevicesAt('v_time');
  const base = (await row('v_time')).updated_at;

  // A saves, then its timestamp is forced back to exactly what B saw.
  storage.load(deviceA);
  write('v_time', 'A');
  await idle();
  const deviceAAfterSave = storage.dump();
  await forceTimestamp('v_time', base);
  storage.load(deviceB);
  write('v_time', 'B stale');
  await idle();
  assert.equal(entry('v_time').cloud, 'conflict', 'same timestamp, different version: still a conflict');

  // A's copy is current: moving the timestamp (even into the past) changes nothing.
  await forceTimestamp('v_time', '2001-01-01T00:00:00Z');
  storage.load(deviceAAfterSave);
  write('v_time', 'A again');
  await idle();
  assert.equal(entry('v_time').cloud, 'linked');
  assert.equal((await row('v_time')).version, 2);

  // And a client cannot move it: the database ignores what is sent.
  await client.from('dm_screens').update({ name: 'x', updated_at: '1999-01-01T00:00:00Z', version: 77 }).eq('id', 'v_time');
  assert.equal((await row('v_time')).version, 2);
  assert.notEqual((await row('v_time')).updated_at, '1999-01-01T00:00:00.000Z');
});
