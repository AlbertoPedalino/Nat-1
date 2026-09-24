import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { SUPABASE_STUBS } from './supabaseStubs.js';

// Open sheets decide whether to download a character again by comparing
// `row_revision` (useCloudCharacterRow). That only works if every write path
// that changes the row moves it — and if writes that change nothing do not.

const DIR = new URL('../../../../supabase/', import.meta.url);
const GM = '00000000-0000-4000-8000-000000000001';
const PLAYER = '00000000-0000-4000-8000-000000000002';
const CAMPAIGN = '10000000-0000-4000-8000-000000000001';
const OTHER_CAMPAIGN = '10000000-0000-4000-8000-000000000002';
const SHEET = { name: 'Fighter', level: 3, currentHP: 20, tempHP: 0, notes: 'start' };

async function schema() {
  const db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  for (const file of (await readdir(DIR)).filter((name) => name.endsWith('.sql')).sort()) {
    await db.exec(await readFile(new URL(file, DIR), 'utf8'));
  }
  await db.exec(`
    grant usage on schema public to authenticated;
    grant select, insert, update, delete on all tables in schema public to authenticated;
    insert into auth.users (id, email) values ('${GM}', 'gm@x'), ('${PLAYER}', 'player@x');
    insert into public.profiles (id, username, role) values ('${GM}', 'gm', 'gm')
      on conflict (id) do update set role = 'gm';
    insert into public.campaigns (id, name, gm, join_code) values
      ('${CAMPAIGN}', 'Table', '${GM}', 'CODE1'), ('${OTHER_CAMPAIGN}', 'Other', '${GM}', 'CODE2');
    insert into public.campaign_members (campaign_id, user_id) values ('${CAMPAIGN}', '${PLAYER}');
  `);
  await db.query(
    'insert into public.characters (id, owner, name, data, campaign_id) values ($1, $2, $3, $4, $5)',
    ['pc', PLAYER, 'Fighter', JSON.stringify(SHEET), CAMPAIGN],
  );
  return db;
}

const as = async (db, uid) => db.exec(`reset role; set test.uid = '${uid}'; set role authenticated;`);
const one = async (db, sql, params) => (await db.query(sql, params)).rows[0];
const row = (db) => one(db, "select * from public.characters where id = 'pc'");
const revision = async (db) => Number((await row(db)).row_revision);
const digestRevision = async (db) => Number((await one(db, "select row_revision from public.character_digests where character_id = 'pc'")).row_revision);
const hpBasis = async (db) => (await one(db, "select digest->>'hpBasis' as basis from public.character_digests where character_id = 'pc'")).basis;
// A health command against the digest this client holds.
const commit = async (db, patch) => (await one(db, 'select public.commit_character_vitals($1, $2, $3, $4) as result',
  ['pc', await digestRevision(db), await hpBasis(db), JSON.stringify(patch)])).result;

test('every write path that changes a character advances row_revision exactly once', async () => {
  const db = await schema();
  try {
    await as(db, PLAYER);
    let expected = await revision(db);
    const advanced = async (label) => {
      expected += 1;
      assert.equal(await revision(db), expected, label);
    };

    // Autosave of the sheet (updateCloudCharacterData / updateForeignCharacter).
    const saved = { ...SHEET, notes: 'after the fight' };
    await db.query("update public.characters set data = $1, updated_at = now() where id = 'pc'", [JSON.stringify(saved)]);
    await advanced('a data save advances the revision');

    await db.query("update public.characters set name = 'Renamed' where id = 'pc'");
    await advanced('a rename advances the revision');

    // pushCharacter / pushCharacterData: PostgREST upsert = insert … on conflict do update.
    await db.query(`
      insert into public.characters (id, owner, name, data) values ('pc', $1, 'Renamed', $2)
      on conflict (id) do update set name = excluded.name, data = excluded.data, updated_at = now()
    `, [PLAYER, JSON.stringify({ ...saved, level: 4 })]);
    await advanced('an upsert that lands on an existing row advances the revision');

    // setCharacterCampaign.
    await db.query(`update public.characters set campaign_id = '${OTHER_CAMPAIGN}' where id = 'pc'`);
    await advanced('a campaign change advances the revision');
    await db.query(`update public.characters set campaign_id = '${CAMPAIGN}' where id = 'pc'`);
    await advanced('moving back advances it again');

    // The health RPC (commandCharacterVitals).
    const result = await commit(db, { currentHP: 12 });
    assert.equal(result.applied, true);
    await advanced('a health command advances the revision');
    assert.equal(await digestRevision(db), expected, 'the digest carries the revision of the change it shows');
    assert.equal(result.digestRevision, expected, 'the command answers with that digest revision');

    // A GM editing someone else's sheet (updateForeignCharacter).
    await as(db, GM);
    await db.query("update public.characters set data = data || '{\"notes\":\"gm note\"}' where id = 'pc'");
    await advanced('a GM edit advances the revision');

    // Deleting the campaign detaches the sheet through ON DELETE SET NULL.
    await db.exec(`reset role; delete from public.campaigns where id = '${CAMPAIGN}'`);
    assert.equal((await row(db)).campaign_id, null);
    await advanced('a campaign deletion that detaches the sheet advances the revision');
  } finally { await db.close(); }
});

test('writes that change nothing keep the revision, and a client cannot set it', async () => {
  const db = await schema();
  try {
    await as(db, PLAYER);
    const start = await row(db);

    // An unchanged autosave (same data, a fresh client timestamp).
    await db.query("update public.characters set data = $1, name = 'Fighter', updated_at = now() where id = 'pc'", [JSON.stringify(SHEET)]);
    let now = await row(db);
    assert.equal(Number(now.row_revision), Number(start.row_revision), 'an unchanged save is not a new revision');
    assert.equal(Number(now.vitals_revision), Number(start.vitals_revision));
    assert.deepEqual(now.data, SHEET);

    // An ordinary save may not change health; with nothing else changed, it is a no-op.
    await db.query("update public.characters set data = $1 where id = 'pc'", [JSON.stringify({ ...SHEET, currentHP: 1 })]);
    now = await row(db);
    assert.equal(now.data.currentHP, 20, 'health is protected');
    assert.equal(Number(now.row_revision), Number(start.row_revision), 'a save that could only touch health changes nothing');

    // A forged revision is ignored either way.
    await db.query("update public.characters set row_revision = 999 where id = 'pc'");
    assert.equal(await revision(db), Number(start.row_revision), 'a forged revision alone is discarded');
    await db.query("update public.characters set row_revision = 999, data = data || '{\"notes\":\"x\"}' where id = 'pc'");
    assert.equal(await revision(db), Number(start.row_revision) + 1, 'a real change still advances by exactly one');

    // A health command that sets what is already there is applied and changes no revision…
    await commit(db, { currentHP: 20, tempHP: 0, maxHPBonus: 0, deathSaves: { success: 0, fail: 0 }, activeConditions: [] });
    const current = await row(db);
    const digestBefore = await digestRevision(db);
    const result = await commit(db, { currentHP: 20 });
    assert.equal(result.applied, true);
    assert.equal(await revision(db), Number(current.row_revision));
    assert.equal(result.digestRevision, digestBefore);
    // …so a command computed from that digest still commits against it.
    const next = await commit(db, { currentHP: 18 });
    assert.equal(next.applied, true);
    assert.equal(next.digestRevision, await revision(db), 'a vitals change moves the digest to the sheet revision');
    assert.equal(next.vitals.currentHP, 18);
  } finally { await db.close(); }
});
