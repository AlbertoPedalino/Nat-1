import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { SUPABASE_STUBS } from './supabaseStubs.js';
import { applyVitalCommand } from '../../../../src/shared/character/combat/vitalCommands.js';

// commit_character_vitals (13_character_vitals.sql): a health command commits an
// absolute vitals patch against the character digest the client computed it
// from — its revision and its max-HP basis — and answers with vitals only.

const DIR = new URL('../../../../supabase/', import.meta.url);
const GM = '00000000-0000-4000-8000-000000000001';
const PLAYER = '00000000-0000-4000-8000-000000000002';
const OUTSIDER = '00000000-0000-4000-8000-000000000003';
const CAMPAIGN = '10000000-0000-4000-8000-000000000001';
const SHEET = { name: 'Fighter', level: 3, currentHP: 30, tempHP: 5, notes: 'original', inventory: [] };
const BASE_MAX = 30;
const ANSWER_KEYS = ['applied', 'characterId', 'digestRevision', 'hpBasis', 'vitals'];

async function schema() {
  const db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  for (const file of (await readdir(DIR)).filter((name) => name.endsWith('.sql')).sort()) {
    await db.exec(await readFile(new URL(file, DIR), 'utf8'));
  }
  await db.exec(`
    grant usage on schema public to authenticated;
    grant select, insert, update, delete on all tables in schema public to authenticated;
    insert into auth.users (id, email) values ('${GM}', 'gm@x'), ('${PLAYER}', 'player@x'), ('${OUTSIDER}', 'outsider@x');
    insert into public.campaigns (id, name, gm, join_code) values ('${CAMPAIGN}', 'Table', '${GM}', 'CODE1');
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
const sheet = (db) => one(db, "select * from public.characters where id = 'pc'");
// What a client holds: the digest (revision, basis, vitals).
async function digest(db) {
  const row = await one(db, "select row_revision, digest from public.character_digests where character_id = 'pc'");
  return { revision: Number(row.row_revision), hpBasis: row.digest.hpBasis, vitals: row.digest };
}
// A client computing a command from the digest it holds, as commandCharacterVitals does.
async function command(db, held, cmd) {
  const patch = applyVitalCommand(held.vitals, cmd, BASE_MAX);
  return (await one(db, 'select public.commit_character_vitals($1, $2, $3, $4) as result',
    ['pc', held.revision, held.hpBasis, JSON.stringify(patch)])).result;
}

test('the migration keeps one command signature, re-runnable, callable by authenticated users only', async () => {
  const db = await schema();
  try {
    // A database that ran earlier versions still has the ledger and both old forms.
    await db.exec(`
      create table public.character_vital_operations (character_id text, operation_id uuid);
      create function public.commit_character_vitals(p_id text, p_revision bigint, p_operation uuid, p_patch jsonb)
        returns jsonb language sql as $$ select '{}'::jsonb $$;
      create function public.commit_character_vitals(p_id text, p_revision bigint, p_patch jsonb)
        returns jsonb language sql as $$ select '{}'::jsonb $$;
    `);
    const migration = await readFile(new URL('13_character_vitals.sql', DIR), 'utf8');
    await db.exec(migration);
    await db.exec(migration);
    assert.equal((await one(db, "select to_regclass('public.character_vital_operations') as t")).t, null);
    const signatures = (await db.query(`
      select pg_get_function_identity_arguments(p.oid) as args from pg_proc p where p.proname = 'commit_character_vitals'
    `)).rows.map((row) => row.args);
    assert.deepEqual(signatures, ['p_id text, p_digest_revision bigint, p_hp_basis text, p_patch jsonb']);
    const grants = await one(db, `
      select has_function_privilege('authenticated', 'public.commit_character_vitals(text,bigint,text,jsonb)', 'execute') as authed,
             has_function_privilege('anon', 'public.commit_character_vitals(text,bigint,text,jsonb)', 'execute') as anon
    `);
    assert.deepEqual(grants, { authed: true, anon: false });
  } finally { await db.close(); }
});

test('an applied command answers with vitals, the new digest revision and the basis — never the sheet', async () => {
  const db = await schema();
  try {
    await as(db, PLAYER);
    const held = await digest(db);
    const answer = await command(db, held, { type: 'modifyHp', delta: -8 });
    assert.deepEqual(Object.keys(answer).sort(), ANSWER_KEYS);
    assert.equal(answer.applied, true);
    assert.equal(answer.characterId, 'pc');
    assert.deepEqual(Object.keys(answer.vitals).sort(), ['activeConditions', 'currentHP', 'deathSaves', 'maxHPBonus', 'tempHP']);
    assert.equal(answer.vitals.currentHP, 27);
    assert.equal(answer.vitals.tempHP, 0);
    assert.equal(JSON.stringify(answer).includes('original'), false, 'no sheet content in the answer');
    const now = await digest(db);
    assert.equal(answer.digestRevision, now.revision, 'the answer carries the digest revision it produced');
    assert.ok(now.revision > held.revision);
    assert.equal(answer.hpBasis, held.hpBasis);
    assert.equal((await sheet(db)).data.notes, 'original', 'nothing but vitals changed');
  } finally { await db.close(); }
});

test('a stale digest or a stale max-HP basis is never applied, and the answer is still vitals only', async () => {
  const db = await schema();
  try {
    await as(db, PLAYER);
    const stale = await digest(db);
    await command(db, stale, { type: 'modifyHp', delta: -10 }); // another client wins
    const conflict = await command(db, stale, { type: 'modifyHp', delta: -3 });
    assert.deepEqual(Object.keys(conflict).sort(), ANSWER_KEYS);
    assert.equal(conflict.applied, false);
    assert.equal(conflict.vitals.currentHP, 25, 'the answer is the current state');
    assert.equal(conflict.digestRevision, (await digest(db)).revision);
    assert.equal((await sheet(db)).data.currentHP, 25, 'nothing was overwritten');

    // Level up elsewhere: the basis moves, so a base max derived before it is stale.
    const before = await digest(db);
    await db.query("update public.characters set data = data || '{\"level\":4}' where id = 'pc'");
    const after = await digest(db);
    assert.notEqual(after.hpBasis, before.hpBasis);
    const oldBasis = await command(db, { ...after, hpBasis: before.hpBasis }, { type: 'modifyHp', delta: -1 });
    assert.equal(oldBasis.applied, false, 'a command computed for another basis is refused');
    assert.equal(oldBasis.hpBasis, after.hpBasis);
    assert.equal((await sheet(db)).data.currentHP, 25);
  } finally { await db.close(); }
});

test('saving notes, resources, slots or coins does not conflict with a health command; structure does', async () => {
  const db = await schema();
  try {
    await as(db, PLAYER);
    const held = await digest(db);
    const rowBefore = Number((await sheet(db)).row_revision);
    await db.query(`update public.characters set data = data || '{"notes":"typing","currency":{"gp":3},"spellSlotsUsed":{"1":1},"resources":{"rage":1}}' where id = 'pc'`);
    assert.ok(Number((await sheet(db)).row_revision) > rowBefore, 'the sheet moved');
    assert.equal((await digest(db)).revision, held.revision, 'the digest did not');
    const answer = await command(db, held, { type: 'modifyHp', delta: -4 });
    assert.equal(answer.applied, true, 'the autosave did not cost the health command');
    assert.equal((await sheet(db)).data.notes, 'typing');

    // Inventory can feed max HP (items), so it is part of the basis on purpose.
    const next = await digest(db);
    await db.query(`update public.characters set data = data || '{"inventory":[{"name":"Amulet of Health"}]}' where id = 'pc'`);
    assert.equal((await command(db, next, { type: 'modifyHp', delta: -1 })).applied, false);
  } finally { await db.close(); }
});

test('concurrent damage and healing never overwrite each other', async () => {
  const db = await schema();
  try {
    await as(db, PLAYER);
    const a = await digest(db);
    const b = await digest(db); // two devices hold the same digest
    assert.equal((await command(db, a, { type: 'modifyHp', delta: -10 })).applied, true);
    const heal = await command(db, b, { type: 'modifyHp', delta: 6 });
    assert.equal(heal.applied, false);
    assert.equal((await sheet(db)).data.currentHP, 25, 'the damage stands: the heal computed from 30 was refused');
    // Recomputed from the answer, the heal applies on top.
    const retried = await command(db, { revision: heal.digestRevision, hpBasis: heal.hpBasis, vitals: heal.vitals }, { type: 'modifyHp', delta: 6 });
    assert.equal(retried.applied, true);
    assert.equal(retried.vitals.currentHP, 30);
  } finally { await db.close(); }
});

test('ordinary saves still cannot change health; a no-op command keeps the digest revision; RLS decides who commits', async () => {
  const db = await schema();
  try {
    await as(db, PLAYER);
    await db.query("update public.characters set data = data || '{\"currentHP\":1,\"notes\":\"x\"}' where id = 'pc'");
    assert.equal((await sheet(db)).data.currentHP, 30, 'a full-sheet save preserves canonical HP');

    // The first command writes every vital explicitly; repeating it changes nothing.
    await command(db, await digest(db), { type: 'setHp', value: 30 });
    const held = await digest(db);
    const same = await command(db, held, { type: 'setHp', value: 30 });
    assert.equal(same.applied, true);
    assert.equal(same.digestRevision, held.revision, 'nothing changed, so the digest did not move');

    await as(db, GM); // the campaign GM may change a player's health
    assert.equal((await command(db, await digest(db), { type: 'modifyHp', delta: -2 })).applied, true);

    await as(db, OUTSIDER);
    await assert.rejects(
      db.query('select public.commit_character_vitals($1, $2, $3, $4)', ['pc', held.revision, held.hpBasis, '{"currentHP":1}']),
      /permission|unavailable/i,
    );
    await as(db, PLAYER);
    assert.deepEqual([(await sheet(db)).data.currentHP, (await sheet(db)).data.tempHP], [30, 3], 'the GM damage (absorbed by temp HP) stands');
  } finally { await db.close(); }
});
