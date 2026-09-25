import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { SUPABASE_STUBS } from './supabaseStubs.js';
import { RUNTIME_ONLY_CHARACTER_FIELDS } from '../../../../src/shared/character/profile/runtimeFields.js';

// Runtime-only character fields (the optional-feature catalog) are never
// stored, never part of hpBasis, and the one-off cleanup of older rows is safe.

const DIR = new URL('../../../../supabase/', import.meta.url);
const CLEANUP = new URL('maintenance/remove_optional_feature_entries.sql', DIR);
const PLAYER = '00000000-0000-4000-8000-000000000002';
const CATALOG = [{ name: 'Agonizing Blast', source: 'XPHB', featureType: ['EI'], entries: ['Long rule text…'] }];
const SHEET = { name: 'Warlock', level: 5, currentHP: 18, tempHP: 2, notes: 'n', choices: { invocations: ['Agonizing Blast'] } };

async function schema() {
  const db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  for (const file of (await readdir(DIR)).filter((name) => name.endsWith('.sql')).sort()) {
    await db.exec(await readFile(new URL(file, DIR), 'utf8'));
  }
  await db.exec(`
    grant usage on schema public to authenticated;
    grant select, insert, update, delete on all tables in schema public to authenticated;
    insert into auth.users (id, email) values ('${PLAYER}', 'player@x');
  `);
  return db;
}
const one = async (db, sql, params) => (await db.query(sql, params)).rows[0];
const sheet = (db, id = 'pc') => one(db, 'select * from public.characters where id = $1', [id]);
const digest = (db, id = 'pc') => one(db, 'select row_revision, digest from public.character_digests where character_id = $1', [id]);
// A row written before the database stripped the catalog.
async function legacyRow(db, id, data) {
  await db.exec('alter table public.characters disable trigger strip_character_runtime_fields');
  await db.query('insert into public.characters (id, owner, name, data) values ($1, $2, $3, $4)', [id, PLAYER, 'Warlock', JSON.stringify(data)]);
  await db.exec('alter table public.characters enable trigger strip_character_runtime_fields');
}

test('the database and the client strip the same runtime-only keys, and hpBasis ignores them', async () => {
  const db = await schema();
  try {
    const keys = (await one(db, 'select public.character_runtime_only_keys() as keys')).keys;
    assert.deepEqual(keys, [...RUNTIME_ONLY_CHARACTER_FIELDS]);
    const ignored = (await one(db, 'select public.character_hp_basis_ignored_keys() as keys')).keys;
    for (const key of keys) assert.ok(ignored.includes(key), `${key} is left out of hpBasis`);

    const basis = async (data) => (await one(db, "select public.character_digest('W', null, $1)->>'hpBasis' as basis", [JSON.stringify(data)])).basis;
    assert.equal(await basis({ ...SHEET, optionalFeatureEntries: CATALOG }), await basis(SHEET), 'adding the catalog keeps the basis');
    assert.equal(await basis({ ...SHEET, optionalFeatureEntries: [] }), await basis(SHEET));
    assert.notEqual(await basis({ ...SHEET, level: 6 }), await basis(SHEET), 'real structure still moves it');
  } finally { await db.close(); }
});

test('no client can store the catalog: inserts and updates drop it without touching vitals or revisions', async () => {
  const db = await schema();
  try {
    await db.exec(`reset role; set test.uid = '${PLAYER}'; set role authenticated;`);
    // An older tab creating a sheet (upsert → insert).
    await db.query('insert into public.characters (id, owner, name, data) values ($1, $2, $3, $4)',
      ['pc', PLAYER, 'Warlock', JSON.stringify({ ...SHEET, optionalFeatureEntries: CATALOG })]);
    let row = await sheet(db);
    assert.equal(Object.hasOwn(row.data, 'optionalFeatureEntries'), false);
    assert.deepEqual(row.data, SHEET);
    const start = Number(row.row_revision);
    const digestStart = await digest(db);

    // An older tab saving the same sheet plus the catalog changes nothing.
    await db.query("update public.characters set data = $1 where id = 'pc'", [JSON.stringify({ ...SHEET, optionalFeatureEntries: CATALOG })]);
    row = await sheet(db);
    assert.equal(Object.hasOwn(row.data, 'optionalFeatureEntries'), false);
    assert.equal(Number(row.row_revision), start, 'a save that only re-adds the catalog is a no-op');

    // A real edit from an older tab keeps the edit, drops the catalog, keeps health.
    await db.query("update public.characters set data = $1 where id = 'pc'",
      [JSON.stringify({ ...SHEET, notes: 'edited', currentHP: 1, optionalFeatureEntries: CATALOG })]);
    row = await sheet(db);
    assert.equal(row.data.notes, 'edited');
    assert.equal(row.data.currentHP, 18, 'health still only moves through the health command');
    assert.equal(Object.hasOwn(row.data, 'optionalFeatureEntries'), false);
    assert.equal(Number(row.row_revision), start + 1);
    assert.equal(Number((await digest(db)).row_revision), Number(digestStart.row_revision), 'notes do not move the digest');

    // The health command is unaffected.
    const held = await digest(db);
    const answer = (await one(db, 'select public.commit_character_vitals($1, $2, $3, $4) as result',
      ['pc', held.row_revision, held.digest.hpBasis, JSON.stringify({ currentHP: 10 })])).result;
    assert.equal(answer.applied, true);
    assert.equal((await sheet(db)).data.currentHP, 10);
  } finally { await db.close(); }
});

test('the one-off cleanup removes the catalog from older rows, keeps vitals and digests, and can be re-run', async () => {
  const db = await schema();
  try {
    await legacyRow(db, 'old', { ...SHEET, optionalFeatureEntries: CATALOG });
    await legacyRow(db, 'clean', SHEET);
    const before = { old: await sheet(db, 'old'), clean: await sheet(db, 'clean') };
    const digestsBefore = { old: await digest(db, 'old'), clean: await digest(db, 'clean') };
    assert.equal(digestsBefore.old.digest.hpBasis, digestsBefore.clean.digest.hpBasis, 'the catalog never counted in the basis');

    const cleanup = await readFile(CLEANUP, 'utf8');
    await db.exec(cleanup);
    const backup = (await db.query('select id, entries from public.characters_optional_features_backup')).rows;
    assert.deepEqual(backup, [{ id: 'old', entries: CATALOG }]);

    const old = await sheet(db, 'old');
    assert.deepEqual(old.data, SHEET, 'only the catalog is gone; vitals and choices are intact');
    assert.equal(Number(old.row_revision), Number(before.old.row_revision) + 1);
    assert.equal(Number(old.vitals_revision), Number(before.old.vitals_revision));
    assert.equal(Number(old.sheet_revision), Number(before.old.sheet_revision), 'dropping the catalog is not a content change: no sheet reloads');
    assert.deepEqual(await digest(db, 'old'), digestsBefore.old, 'the digest does not move, so nobody re-reads the sheet');
    assert.deepEqual(await sheet(db, 'clean'), before.clean, 'rows without the catalog are not touched');

    await db.exec(cleanup); // re-run
    assert.equal(Number((await sheet(db, 'old')).row_revision), Number(old.row_revision), 'a second run changes nothing');
    assert.equal((await one(db, "select count(*)::int as n from public.characters where data ? 'optionalFeatureEntries'")).n, 0);
    assert.equal((await one(db, "select relrowsecurity as rls from pg_class where relname = 'characters_optional_features_backup'")).rls, true,
      'the backup is not readable through the API');
  } finally { await db.close(); }
});
