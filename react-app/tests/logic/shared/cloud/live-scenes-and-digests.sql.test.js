import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { SUPABASE_STUBS } from './supabaseStubs.js';

const DIR = new URL('../../../../supabase/', import.meta.url);

const GM = '00000000-0000-4000-8000-000000000001';
const PLAYER = '00000000-0000-4000-8000-000000000002';
const OUTSIDER = '00000000-0000-4000-8000-000000000003';
const CAMPAIGN = '10000000-0000-4000-8000-000000000001';
const SCENE_A = '20000000-0000-4000-8000-00000000000a';
const SCENE_B = '20000000-0000-4000-8000-00000000000b';

async function schema() {
  const db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  for (const file of (await readdir(DIR)).filter((name) => name.endsWith('.sql')).sort()) {
    await db.exec(await readFile(new URL(file, DIR), 'utf8'));
  }
  await db.exec(`
    grant usage on schema public to authenticated;
    grant select, insert, update, delete on all tables in schema public to authenticated;
    insert into auth.users (id, email) values
      ('${GM}', 'gm@x'), ('${PLAYER}', 'player@x'), ('${OUTSIDER}', 'outsider@x');
    insert into public.campaigns (id, name, gm, join_code) values ('${CAMPAIGN}', 'Table', '${GM}', 'CODE1');
    insert into public.campaign_members (campaign_id, user_id) values ('${CAMPAIGN}', '${PLAYER}');
    insert into public.map_scenes (id, campaign_id, name) values
      ('${SCENE_A}', '${CAMPAIGN}', 'A'), ('${SCENE_B}', '${CAMPAIGN}', 'B');
  `);
  return db;
}

const as = async (db, uid) => db.exec(`reset role; set test.uid = '${uid}'; set role authenticated;`);
const asAdmin = async (db) => db.exec('reset role;');
const one = async (db, sql, params) => (await db.query(sql, params)).rows[0];

test('campaign_live_scenes follows is_live with one change per switch, and only members read it', async () => {
  const db = await schema();
  try {
    // Count every real change the followers would be sent.
    await db.exec(`
      create table live_changes (scene_id uuid);
      create function note_live_change() returns trigger language plpgsql as
        $$ begin insert into live_changes values (new.scene_id); return null; end $$;
      create trigger note_live_change after insert or update on public.campaign_live_scenes
        for each row execute function note_live_change();
    `);
    const live = async () => (await one(db, `select scene_id from public.campaign_live_scenes where campaign_id = '${CAMPAIGN}'`))?.scene_id ?? null;
    const changes = async () => (await db.query('select scene_id from live_changes')).rows.map((row) => row.scene_id);

    await as(db, GM);
    await db.query('select public.set_live_scene($1)', [SCENE_A]);
    await asAdmin(db);
    assert.equal(await live(), SCENE_A);
    await db.exec('delete from live_changes');

    // Switching clears A and marks B in two statements; followers see one step.
    await as(db, GM);
    await db.query('select public.set_live_scene($1)', [SCENE_B]);
    await asAdmin(db);
    assert.equal(await live(), SCENE_B);
    assert.deepEqual(await changes(), [SCENE_B]);

    // Scene edits that do not touch is_live change nothing here.
    await db.exec('delete from live_changes');
    await as(db, GM);
    await db.query(`update public.map_scenes set name = 'Renamed', fog = '{"cols":1}' where id = $1`, [SCENE_B]);
    await asAdmin(db);
    assert.deepEqual(await changes(), []);

    // Members read it; outsiders do not; nobody writes it by hand.
    await as(db, PLAYER);
    assert.equal((await db.query('select scene_id from public.campaign_live_scenes')).rows[0].scene_id, SCENE_B);
    await assert.rejects(db.query(`insert into public.campaign_live_scenes (campaign_id, scene_id) values ('${CAMPAIGN}', null)`));
    await db.query(`update public.campaign_live_scenes set scene_id = null where campaign_id = '${CAMPAIGN}'`);
    await as(db, OUTSIDER);
    assert.equal((await db.query('select * from public.campaign_live_scenes')).rows.length, 0);
    await asAdmin(db);
    assert.equal(await live(), SCENE_B, 'a player update is silently refused by RLS');

    // Ending the session and deleting the live scene both clear it.
    await as(db, GM);
    await db.query('select public.clear_live_scene($1)', [CAMPAIGN]);
    await asAdmin(db);
    assert.equal(await live(), null);
    await as(db, GM);
    await db.query('select public.set_live_scene($1)', [SCENE_A]);
    await db.query('delete from public.map_scenes where id = $1', [SCENE_A]);
    await asAdmin(db);
    assert.equal(await live(), null);
  } finally { await db.close(); }
});

test('character_digests changes only when the roster, vitals or max-HP inputs change', async () => {
  const db = await schema();
  try {
    await db.exec(`
      create table digest_changes (row_revision bigint);
      create function note_digest_change() returns trigger language plpgsql as
        $$ begin insert into digest_changes values (new.row_revision); return null; end $$;
      create trigger note_digest_change after insert or update on public.character_digests
        for each row execute function note_digest_change();
    `);
    const sheet = { name: 'Aria', className: 'Fighter', level: 3, currentHP: 20, notes: '', resources: {} };
    await db.query(
      `insert into public.characters (id, owner, owner_username, name, data, campaign_id)
       values ('pc', $1, 'aria_player', 'Aria', $2, $3)`,
      [PLAYER, JSON.stringify(sheet), CAMPAIGN],
    );
    const digest = async () => one(db, "select row_revision, digest from public.character_digests where character_id = 'pc'");
    const changes = async () => Number((await one(db, 'select count(*) from digest_changes')).count);
    const patch = async (fields) => db.query(
      "update public.characters set data = data || $1::jsonb where id = 'pc'",
      [JSON.stringify(fields)],
    );

    const first = await digest();
    assert.equal(first.digest.name, 'Aria');
    assert.equal(first.digest.currentHP, 20);
    assert.equal(first.digest.ownerUsername, 'aria_player');
    assert.equal(await changes(), 1);

    // Autosaves of trackers the table never shows: nothing sent.
    await patch({ notes: 'Owes the innkeeper', resources: { secondWind: 1 }, spellSlotsUsed: { 1: 1 }, currency: { gp: 3 } });
    assert.equal(await changes(), 1);
    assert.equal((await digest()).row_revision, first.row_revision);

    // Hit points and conditions: sent. They go through the health RPC in the
    // app; here the protect trigger lets a matching vitals_revision through.
    await db.query("update public.characters set vitals_revision = vitals_revision + 1, data = data || '{\"currentHP\":12}' where id = 'pc'");
    const hurt = await digest();
    assert.equal(hurt.digest.currentHP, 12);
    assert.ok(Number(hurt.row_revision) > Number(first.row_revision));
    assert.equal(hurt.digest.hpBasis, first.digest.hpBasis, 'damage does not move the max-HP basis');
    await db.query("update public.characters set vitals_revision = vitals_revision + 1, data = data || '{\"activeConditions\":[\"prone\"]}' where id = 'pc'");
    assert.deepEqual((await digest()).digest.activeConditions, ['prone']);
    await db.query("update public.characters set vitals_revision = vitals_revision + 1, data = data || '{\"maxHPBonus\":5}' where id = 'pc'");
    const aided = await digest();
    assert.equal(aided.digest.maxHPBonus, 5);
    assert.equal(aided.digest.hpBasis, first.digest.hpBasis, 'the bonus travels apart from the basis');
    const beforeLevel = await changes();

    // Anything that could feed max HP moves the basis — including keys the
    // hash was never told about.
    await patch({ level: 4 });
    const levelled = await digest();
    assert.notEqual(levelled.digest.hpBasis, first.digest.hpBasis);
    assert.equal(await changes(), beforeLevel + 1);
    await patch({ someFutureFeature: true });
    assert.notEqual((await digest()).digest.hpBasis, levelled.digest.hpBasis);

    // Portrait and name are roster facts: sent.
    await patch({ portraitPath: 'art/aria.webp' });
    assert.equal((await digest()).digest.portraitPath, 'art/aria.webp');

    // Readers: owner, campaign members and GM; not outsiders. Writers: nobody.
    await as(db, GM);
    assert.equal((await db.query('select * from public.character_digests')).rows.length, 1);
    await as(db, OUTSIDER);
    assert.equal((await db.query('select * from public.character_digests')).rows.length, 0);
    await as(db, PLAYER);
    assert.equal((await db.query('select * from public.character_digests')).rows.length, 1);
    await assert.rejects(db.query(
      "insert into public.character_digests (character_id, digest) values ('forged', '{}')",
    ));
    await db.query("update public.character_digests set digest = '{\"currentHP\":999}' where character_id = 'pc'");
    await asAdmin(db);
    assert.notEqual((await digest()).digest.currentHP, 999, 'a client cannot rewrite a digest');

    // Leaving the campaign moves the digest with it; deleting the sheet removes it.
    await db.query("update public.characters set campaign_id = null where id = 'pc'");
    assert.equal((await one(db, "select campaign_id from public.character_digests where character_id = 'pc'")).campaign_id, null);
    await db.query("delete from public.characters where id = 'pc'");
    assert.equal(await digest(), undefined);
  } finally { await db.close(); }
});
