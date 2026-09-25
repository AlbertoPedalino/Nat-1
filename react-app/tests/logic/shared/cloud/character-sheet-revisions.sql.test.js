import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { SUPABASE_STUBS } from './supabaseStubs.js';

// characters.sheet_revision (13_character_vitals.sql) and its projection
// character_sheet_revisions (17): content changes move it and announce it;
// health, no-ops and runtime-only keys never do.

const DIR = new URL('../../../../supabase/', import.meta.url);
const GM = '00000000-0000-4000-8000-000000000001';
const PLAYER = '00000000-0000-4000-8000-000000000002';
const OUTSIDER = '00000000-0000-4000-8000-000000000003';
const CAMPAIGN = '10000000-0000-4000-8000-000000000001';
const SHEET = {
  name: 'Fighter', level: 3, currentHP: 20, tempHP: 0, deathSaves: { success: 0, fail: 0 }, activeConditions: [],
  notes: 'start', inventory: [], resources: { secondWind: 1 }, currency: { gp: 5 },
};

async function schema({ seed = true } = {}) {
  const db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  if (!seed) return db;
  for (const file of (await readdir(DIR)).filter((name) => name.endsWith('.sql')).sort()) {
    await db.exec(await readFile(new URL(file, DIR), 'utf8'));
  }
  await db.exec(`
    grant usage on schema public to authenticated;
    grant select, insert, update, delete on all tables in schema public to authenticated;
    insert into auth.users (id, email) values ('${GM}', 'gm@x'), ('${PLAYER}', 'player@x'), ('${OUTSIDER}', 'o@x');
    insert into public.campaigns (id, name, gm, join_code) values ('${CAMPAIGN}', 'Table', '${GM}', 'CODE1');
    insert into public.campaign_members (campaign_id, user_id) values ('${CAMPAIGN}', '${PLAYER}');
    -- Every change the projection would send to its followers.
    create table sheet_events (character_id text, sheet_revision bigint, op text);
    create function note_sheet_event() returns trigger language plpgsql as $$
      begin
        if tg_op = 'DELETE' then insert into sheet_events values (old.character_id, old.sheet_revision, tg_op);
        else insert into sheet_events values (new.character_id, new.sheet_revision, tg_op); end if;
        return null;
      end $$;
    create trigger note_sheet_event after insert or update or delete on public.character_sheet_revisions
      for each row execute function note_sheet_event();
  `);
  await db.query('insert into public.characters (id, owner, name, data, campaign_id) values ($1, $2, $3, $4, $5)',
    ['pc', PLAYER, 'Fighter', JSON.stringify(SHEET), CAMPAIGN]);
  return db;
}
const as = async (db, uid) => db.exec(`reset role; set test.uid = '${uid}'; set role authenticated;`);
const one = async (db, sql, params) => (await db.query(sql, params)).rows[0];
const revision = async (db) => Number((await one(db, "select sheet_revision from public.characters where id = 'pc'")).sheet_revision);
const events = async (db) => (await db.query('select sheet_revision::int as revision, op from sheet_events')).rows;
const save = (db, patch) => db.query("update public.characters set data = data || $1::jsonb where id = 'pc'", [JSON.stringify(patch)]);
async function health(db, patch) {
  const d = await one(db, "select row_revision, digest->>'hpBasis' as basis from public.character_digests where character_id = 'pc'");
  return (await one(db, 'select public.commit_character_vitals($1, $2, $3, $4) as r', ['pc', d.row_revision, d.basis, JSON.stringify(patch)])).r;
}

test('content changes advance sheet_revision by one and announce it once', async () => {
  const db = await schema();
  try {
    await as(db, PLAYER);
    await db.exec('reset role; delete from sheet_events;');
    await as(db, PLAYER);
    let expected = await revision(db);
    for (const [label, patch] of [
      ['inventory', { inventory: [{ name: 'Rope' }] }],
      ['notes', { notes: 'after the fight' }],
      ['a resource', { resources: { secondWind: 0 } }],
      ['coins', { currency: { gp: 3 } }],
      ['level', { level: 4 }],
    ]) {
      await save(db, patch);
      expected += 1;
      assert.equal(await revision(db), expected, `${label} moves the sheet revision`);
    }
    await db.query("update public.characters set name = 'Renamed' where id = 'pc'");
    expected += 1;
    assert.equal(await revision(db), expected, 'a rename moves it');
    await db.exec('reset role;');
    assert.deepEqual((await events(db)).map((e) => e.revision), [1, 2, 3, 4, 5, 6], 'one small event per content change');
    const projection = await one(db, "select * from public.character_sheet_revisions where character_id = 'pc'");
    assert.deepEqual(Object.keys(projection).sort(), ['campaign_id', 'character_id', 'owner', 'sheet_revision', 'updated_at'],
      'the projection never carries the sheet');
    assert.equal(Number(projection.sheet_revision), expected);
  } finally { await db.close(); }
});

test('health, no-ops and runtime-only keys never move it nor produce an event', async () => {
  const db = await schema();
  try {
    await db.exec('delete from sheet_events;');
    await as(db, PLAYER);
    const start = await revision(db);
    assert.equal((await health(db, { ...SHEET, currentHP: 12 })).applied, true, 'HP');
    assert.equal((await health(db, { tempHP: 5 })).applied, true, 'temp HP');
    assert.equal((await health(db, { deathSaves: { success: 1, fail: 2 } })).applied, true, 'death saves');
    assert.equal((await health(db, { activeConditions: ['prone'] })).applied, true, 'conditions');
    assert.equal((await health(db, { maxHPBonus: 3 })).applied, true, 'max HP bonus');
    await save(db, {}); // no-op
    await save(db, { optionalFeatureEntries: [{ name: 'Agonizing Blast', entries: ['…'] }] }); // runtime-only
    await save(db, { currentHP: 1 }); // an ordinary save that tries to change health
    await db.query("update public.characters set sheet_revision = 99 where id = 'pc'"); // forged
    assert.equal(await revision(db), start);
    await db.exec('reset role;');
    assert.deepEqual(await events(db), []);
  } finally { await db.close(); }
});

test('a full save conditional on sheet_revision passes when current and never overwrites when stale', async () => {
  const db = await schema();
  try {
    await as(db, PLAYER);
    const base = await revision(db);
    const conditional = (expected, notes) => db.query(
      "update public.characters set data = data || $1::jsonb where id = 'pc' and sheet_revision = $2 returning sheet_revision",
      [JSON.stringify({ notes }), expected],
    );
    const ok = await conditional(base, 'mine');
    assert.equal(ok.rows.length, 1);
    assert.equal(Number(ok.rows[0].sheet_revision), base + 1);
    // Another client, still based on `base`, is refused.
    const stale = await conditional(base, 'stale overwrite');
    assert.equal(stale.rows.length, 0);
    assert.equal((await one(db, "select data->>'notes' as notes from public.characters where id = 'pc'")).notes, 'mine');
    // A health command between two saves does not invalidate a content save.
    await health(db, { currentHP: 7 });
    assert.equal((await conditional(base + 1, 'still mine')).rows.length, 1);
  } finally { await db.close(); }
});

test('backfill, re-run, RLS, campaign moves and DELETE', async () => {
  const db = await schema();
  try {
    // A sheet from before 17: the projection is filled by re-running it.
    await db.exec('alter table public.characters disable trigger sync_character_sheet_revision');
    await db.query('insert into public.characters (id, owner, name, data) values ($1, $2, $3, $4)', ['old', PLAYER, 'Old', JSON.stringify(SHEET)]);
    await db.exec('alter table public.characters enable trigger sync_character_sheet_revision');
    assert.equal((await one(db, "select count(*)::int as n from public.character_sheet_revisions where character_id = 'old'")).n, 0);
    const migration = await readFile(new URL('17_character_sheet_revisions.sql', DIR), 'utf8');
    await db.exec(migration);
    await db.exec(migration);
    assert.equal((await one(db, "select count(*)::int as n from public.character_sheet_revisions where character_id = 'old'")).n, 1);
    const published = (await db.query("select tablename from pg_publication_tables where pubname = 'supabase_realtime'")).rows.map((r) => r.tablename);
    assert.ok(published.includes('character_sheet_revisions'));
    assert.equal((await one(db, "select relreplident from pg_class where relname = 'character_sheet_revisions'")).relreplident, 'f');

    // Readable by the owner, the campaign GM and members; nobody else; nobody writes.
    const visible = async (uid) => {
      await as(db, uid);
      const n = (await one(db, "select count(*)::int as n from public.character_sheet_revisions where character_id = 'pc'")).n;
      await db.exec('reset role;');
      return n;
    };
    assert.equal(await visible(PLAYER), 1);
    assert.equal(await visible(GM), 1);
    assert.equal(await visible(OUTSIDER), 0);
    await as(db, PLAYER);
    await assert.rejects(db.query("update public.character_sheet_revisions set sheet_revision = 50 where character_id = 'pc'").then((r) => {
      if (!r.affectedRows) throw new Error('no row written');
    }));
    await db.exec('reset role;');

    // A campaign move updates the projection (the read policy follows it) without a content change.
    await db.exec('delete from sheet_events;');
    await db.query("update public.characters set campaign_id = null where id = 'pc'");
    assert.equal(await visible(GM), 0, 'the old campaign GM no longer reads it');
    const [move] = await events(db);
    assert.equal(move.op, 'UPDATE');

    // Deleting the character removes its row, and followers hear it.
    await db.exec('delete from sheet_events;');
    await db.query("delete from public.characters where id = 'pc'");
    assert.equal((await one(db, "select count(*)::int as n from public.character_sheet_revisions where character_id = 'pc'")).n, 0);
    assert.deepEqual((await events(db)).map((e) => e.op), ['DELETE']);
  } finally { await db.close(); }
});
