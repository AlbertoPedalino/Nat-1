import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { SUPABASE_STUBS } from './supabaseStubs.js';

const DIR = new URL('../../../../supabase/', import.meta.url);

const GM = '00000000-0000-4000-8000-000000000001';
const PLAYER = '00000000-0000-4000-8000-000000000002';
const STRANGER = '00000000-0000-4000-8000-000000000003';
const CAMPAIGN = '10000000-0000-4000-8000-000000000001';
const SCENE = '20000000-0000-4000-8000-00000000000a';
const GOBLIN = '30000000-0000-4000-8000-000000000001';
const AMBUSH = '30000000-0000-4000-8000-000000000002';

async function schema() {
  const db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  for (const file of (await readdir(DIR)).filter((name) => name.endsWith('.sql')).sort()) {
    await db.exec(await readFile(new URL(file, DIR), 'utf8'));
  }
  await db.exec(`
    grant usage on schema public to authenticated;
    grant usage on schema auth to authenticated;
    grant select, insert, update, delete on all tables in schema public to authenticated;
    insert into auth.users (id, email) values ('${GM}', 'gm@x'), ('${PLAYER}', 'player@x'), ('${STRANGER}', 's@x');
    insert into public.campaigns (id, name, gm, join_code) values ('${CAMPAIGN}', 'Table', '${GM}', 'CODE1');
    insert into public.campaign_members (campaign_id, user_id) values ('${CAMPAIGN}', '${PLAYER}');
    insert into public.characters (id, owner, name, data, campaign_id)
      values ('pc', '${PLAYER}', 'Hero', '{}'::jsonb, '${CAMPAIGN}');
    insert into public.map_scenes (id, campaign_id, name, is_live) values ('${SCENE}', '${CAMPAIGN}', 'Cave', true);
    insert into public.map_tokens (id, scene_id, layer, label) values
      ('${GOBLIN}', '${SCENE}', 'tokens', 'Goblin'),
      ('${AMBUSH}', '${SCENE}', 'gm', 'Boss');
    insert into public.encounters (id, owner, name, data) values ('enc', '${GM}', 'Fights', '{}'::jsonb);
  `);
  return db;
}

const as = async (db, uid) => db.exec(`reset role; set test.uid = '${uid}'; set role authenticated;`);
const asAdmin = async (db) => db.exec('reset role;');
const digest = async (db, keys) => (await db.query('select public.sync_digest($1) as d', [keys])).rows[0].d;

const KEYS = [
  `scene:${SCENE}`, `tokens:${SCENE}`, `drawings:${SCENE}`, `campaign:${CAMPAIGN}`,
  'sheet:pc', 'encounters:enc', 'my:encounters', 'nonsense:1', 'scene:not-a-uuid',
];

test('one call answers every open key, and an answer moves only when its rows do', async () => {
  const db = await schema();
  try {
    await as(db, GM);
    const before = await digest(db, KEYS);
    assert.deepEqual(Object.keys(before).sort(), [...KEYS].sort());
    assert.equal(before['nonsense:1'], null, 'an unknown kind answers null');
    assert.equal(before['scene:not-a-uuid'], null, 'a bad id answers null');
    assert.equal(before['sheet:pc'], '0');
    assert.ok(before[`tokens:${SCENE}`]);

    // Nothing moved: the same answers.
    assert.deepEqual(await digest(db, KEYS), before);

    // A piece moves: only the token list answers differently.
    await db.exec(`update public.map_tokens set x = 3 where id = '${GOBLIN}'`);
    const moved = await digest(db, KEYS);
    assert.notEqual(moved[`tokens:${SCENE}`], before[`tokens:${SCENE}`]);
    for (const key of KEYS.filter((key) => key !== `tokens:${SCENE}`)) {
      assert.equal(moved[key], before[key], `${key} must not move`);
    }

    // A deleted piece and a new mark move their lists too.
    await db.exec(`delete from public.map_tokens where id = '${AMBUSH}'`);
    await db.exec(`insert into public.map_drawings (scene_id, layer, points) values ('${SCENE}', 'tokens', '[]'::jsonb)`);
    const after = await digest(db, KEYS);
    assert.notEqual(after[`tokens:${SCENE}`], moved[`tokens:${SCENE}`]);
    assert.notEqual(after[`drawings:${SCENE}`], moved[`drawings:${SCENE}`]);

    // A renamed campaign and a renamed instance move theirs.
    await db.exec(`update public.campaigns set name = 'Table 2' where id = '${CAMPAIGN}'`);
    await db.exec("update public.encounters set name = 'Renamed' where id = 'enc'");
    const relinked = await digest(db, KEYS);
    assert.notEqual(relinked[`campaign:${CAMPAIGN}`], after[`campaign:${CAMPAIGN}`]);
    assert.notEqual(relinked['my:encounters'], after['my:encounters']);
  } finally {
    await asAdmin(db);
    await db.close();
  }
});

test('every answer goes through the caller\'s row security', async () => {
  const db = await schema();
  try {
    await as(db, GM);
    const gm = await digest(db, [`tokens:${SCENE}`, 'sheet:pc', 'my:encounters']);

    // The player sees the live scene's public pieces, never the GM layer.
    await as(db, PLAYER);
    const player = await digest(db, [`tokens:${SCENE}`, 'sheet:pc', 'my:encounters']);
    assert.notEqual(player[`tokens:${SCENE}`], gm[`tokens:${SCENE}`]);
    await db.exec(`reset role; update public.map_tokens set x = 9 where id = '${AMBUSH}'`);
    await as(db, PLAYER);
    assert.equal((await digest(db, [`tokens:${SCENE}`]))[`tokens:${SCENE}`], player[`tokens:${SCENE}`],
      'a hidden piece moving tells the player nothing');
    assert.notEqual(player['my:encounters'], gm['my:encounters'], 'my: lists only the caller\'s own instances');

    // Someone outside the campaign reads nothing.
    await as(db, STRANGER);
    const stranger = await digest(db, [`scene:${SCENE}`, 'sheet:pc']);
    assert.equal(stranger[`scene:${SCENE}`], null);
    assert.equal(stranger['sheet:pc'], null);
  } finally {
    await asAdmin(db);
    await db.close();
  }
});
