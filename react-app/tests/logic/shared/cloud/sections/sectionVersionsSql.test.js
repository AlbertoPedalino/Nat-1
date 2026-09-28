import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { SUPABASE_STUBS } from '../supabaseStubs.js';

// supabase/18_section_versions.sql on a real Postgres: the database alone owns
// `version` (and `updated_at`) of GM Board / Encounter Builder / DM Screen rows.

const DIR = new URL('../../../../../supabase/', import.meta.url);
const USER = '00000000-0000-0000-0000-0000000000a1';
const script = (name) => readFile(new URL(name, DIR), 'utf8');

async function database() {
  const db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  await db.exec(await script('01_schema.sql'));
  await db.exec(await script('02_sections.sql'));
  await db.exec(`insert into auth.users (id) values ('${USER}')`);
  return db;
}

const one = async (db, sql, params) => (await db.query(sql, params)).rows[0];

test('the migration backfills existing rows, and re-running it changes nothing', async () => {
  const db = await database();
  for (const table of ['boards', 'encounters', 'dm_screens']) {
    await db.query(`insert into public.${table} (id, owner, name, data) values ('before', $1, 'Old', '{"a":"1"}')`, [USER]);
  }
  await db.exec(await script('18_section_versions.sql'));
  await db.query(`update public.boards set data = '{"a":"2"}' where id = 'before'`);
  await db.exec(await script('18_section_versions.sql'));

  for (const table of ['boards', 'encounters', 'dm_screens']) {
    const column = await one(db, `select is_nullable, column_default, data_type from information_schema.columns
      where table_schema = 'public' and table_name = $1 and column_name = 'version'`, [table]);
    assert.deepEqual(column, { is_nullable: 'NO', column_default: '0', data_type: 'bigint' }, table);
    assert.equal(Number((await one(db, `select version from public.${table} where id = 'before'`)).version), table === 'boards' ? 1 : 0, table);
  }
  const tables = await db.query(`select table_name from information_schema.tables where table_schema = 'public'
    and table_name like '%version%'`);
  assert.deepEqual(tables.rows, [], 'no new tables');
});

test('only the database sets version and updated_at', async () => {
  const db = await database();
  await db.exec(await script('18_section_versions.sql'));
  const inserted = await one(db, `insert into public.encounters (id, owner, name, data, version, updated_at)
    values ('e1', $1, 'Boss', '{"k":"1"}', 99, '2000-01-01') returning version, updated_at`, [USER]);
  assert.equal(Number(inserted.version), 0, 'INSERT starts at 0 whatever the client sends');
  assert.ok(inserted.updated_at > new Date('2020-01-01'), 'updated_at is the server time');

  const data = await one(db, `update public.encounters set data = '{"k":"2"}', version = 50
    where id = 'e1' returning version, updated_at`);
  assert.equal(Number(data.version), 1, 'a data change increments by exactly one');

  const renamed = await one(db, `update public.encounters set name = 'Dragon', updated_at = '2000-01-01'
    where id = 'e1' returning version, updated_at`);
  assert.equal(Number(renamed.version), 1, 'a rename is not a data revision');
  assert.deepEqual(renamed.updated_at, data.updated_at, 'nor a new timestamp');

  const sameData = await one(db, `update public.encounters set data = '{"k":"2"}' where id = 'e1' returning version`);
  assert.equal(Number(sameData.version), 1, 'rewriting identical data is not a revision');
});

test('a conditional update is atomic: the stale writer matches zero rows', async () => {
  const db = await database();
  await db.exec(await script('18_section_versions.sql'));
  await db.query(`insert into public.dm_screens (id, owner, data) values ('s1', $1, '{"n":"0"}')`, [USER]);

  const a = await db.query(`update public.dm_screens set data = '{"n":"A"}' where id = 's1' and version = 0 returning version`);
  const b = await db.query(`update public.dm_screens set data = '{"n":"B"}' where id = 's1' and version = 0 returning version`);
  assert.equal(Number(a.rows[0].version), 1);
  assert.equal(b.rows.length, 0);
  assert.deepEqual((await one(db, `select data from public.dm_screens where id = 's1'`)).data, { n: 'A' });
});
