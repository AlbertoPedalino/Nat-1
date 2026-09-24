import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const GM = '00000000-0000-4000-8000-00000000000a';
const PLAYER = '00000000-0000-4000-8000-00000000000b';
const SCENE = '00000000-0000-4000-8000-0000000000c1';
const CAMPAIGN = '00000000-0000-4000-8000-0000000000d1';
const LINKED = '00000000-0000-4000-8000-0000000000e1'; // goblin, shown
const HIDDEN = '00000000-0000-4000-8000-0000000000e2'; // same goblin, bar off
const LEGACY_HIDDEN = '00000000-0000-4000-8000-0000000000e3'; // standalone, bar off
const LEGACY_SHOWN = '00000000-0000-4000-8000-0000000000e4'; // standalone, bar on
const ORPHAN = '00000000-0000-4000-8000-0000000000e5'; // source_ref without a cloud fight

const sql = (name) => readFile(new URL(`../../../../supabase/${name}`, import.meta.url), 'utf8');

function fightJson({ goblinHp = 30, turn = 0 } = {}) {
  return JSON.stringify({
    currentTurn: turn,
    round: 1,
    combatants: [
      { id: 'm1', name: 'Goblin', type: 'monster', hpCurrent: goblinHp, hpMax: 30, activeConditions: [], activeEffects: [], isDead: false },
      { id: 'p1', name: 'Hero', type: 'player', sourceId: 'char-1', hpCurrent: 12, hpMax: 20, activeConditions: [] },
    ],
  });
}

async function setup() {
  const db = new PGlite();
  await db.exec(`
    create role authenticated; create role anon;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    create publication supabase_realtime;
    insert into auth.users values ('${GM}'), ('${PLAYER}');

    create table campaigns (id uuid primary key, gm uuid not null);
    insert into campaigns values ('${CAMPAIGN}', '${GM}');
    create table map_scenes (id uuid primary key, campaign_id uuid, is_live boolean default true);
    create table map_tokens (
      id uuid primary key, scene_id uuid references map_scenes(id), layer text default 'tokens',
      hidden_from_players boolean default false, x numeric default 0, y numeric default 0,
      label text, source_ref text, hp_current integer, hp_max integer,
      show_hp boolean not null default false,
      conditions text[] not null default '{}', effects jsonb not null default '[]'
    );
    alter table map_tokens replica identity full;
    create table map_token_secrets (
      token_id uuid primary key references map_tokens(id) on delete cascade,
      label text, updated_at timestamptz not null default now()
    );
    create function is_campaign_gm(p uuid) returns boolean language sql stable as
      $$ select auth.uid() = '${GM}'::uuid $$;
    create function user_campaign_ids() returns setof uuid language sql stable as
      $$ select '${CAMPAIGN}'::uuid $$;
    create function map_token_in_play(s uuid, x numeric, y numeric) returns boolean language sql stable as
      $$ select true $$;
    create function map_token_campaign(p uuid) returns uuid language sql stable security definer as
      $$ select s.campaign_id from map_tokens t join map_scenes s on s.id = t.scene_id where t.id = p $$;
    -- The same GM-only policy as vtt.sql; players read every visible piece.
    alter table map_token_secrets enable row level security;
    create policy map_token_secrets_all on map_token_secrets
      for all using (is_campaign_gm(map_token_campaign(token_id)))
      with check (is_campaign_gm(map_token_campaign(token_id)));
    grant usage on schema auth to authenticated;
    grant select, insert, update on map_tokens, map_scenes to authenticated;
    grant select, insert, update, delete on map_token_secrets to authenticated;
  `);
  await db.exec(await sql('encounter_fights.sql'));
  await db.exec('grant select, insert, update, delete on encounter_fights to authenticated');
  await db.query(
    "insert into encounter_fights (id, instance_id, owner, name, fight) values ('f1', 'inst', $1, 'Fight', $2)",
    [GM, fightJson()],
  );
  await db.exec(`
    insert into map_scenes values ('${SCENE}', '${CAMPAIGN}', true);
    -- Legacy rows as the previous frontend left them: HP on the public row.
    insert into map_tokens (id, scene_id, source_ref, hp_current, hp_max, show_hp) values
      ('${LINKED}', '${SCENE}', 'inst:f1:m1', 99, 99, true),
      ('${HIDDEN}', '${SCENE}', 'inst:f1:m1', 99, 99, false),
      ('${LEGACY_HIDDEN}', '${SCENE}', null, 17, 40, false),
      ('${LEGACY_SHOWN}', '${SCENE}', null, 8, 12, true),
      ('${ORPHAN}', '${SCENE}', 'inst:gone:m9', 7, 10, true);
    insert into map_token_secrets (token_id, label) values ('${LEGACY_HIDDEN}', 'Mimic');
  `);
  // The player mark RPCs come from vtt.sql, defined here before the migration:
  // they must find its forwarding function at call time, whatever the order.
  const vtt = await sql('vtt.sql');
  for (const name of ['set_token_conditions', 'set_token_effects']) {
    const start = vtt.indexOf(`create or replace function public.${name}(`);
    const end = vtt.indexOf('$$;', vtt.indexOf('as $$', start)) + 3;
    await db.exec(vtt.slice(start, end));
  }
  const migration = await sql('encounter_fight_vitals.sql');
  await db.exec(migration);
  await db.exec(migration); // safe to rerun: nothing is lost the second time
  return db;
}

const as = (db, uid) => db.exec(`reset role; set test.uid = '${uid}'; set role authenticated;`);
const token = async (db, id) => (await db.query('select * from map_tokens where id = $1', [id])).rows[0];
const secret = async (db, id) => (await db.query('select * from map_token_secrets where token_id = $1', [id])).rows[0];
const fight = async (db) => (await db.query("select * from encounter_fights where id = 'f1'")).rows[0];
const goblin = async (db) => (await fight(db)).fight.combatants.find((c) => c.id === 'm1');
const commit = async (db, base, patch) => (await db.query(
  "select commit_fight_combatant_vitals('f1', 'm1', $1, $2) as r",
  [base == null ? null : JSON.stringify(base), JSON.stringify(patch)],
)).rows[0].r;
const publicHp = (row) => [row.hp_current, row.hp_max];

test('enemy vitals: encounter_fights is the only authority for linked monsters', async () => {
  const db = await setup();
  try {
    await as(db, GM);
    const hit = await commit(db, { hpCurrent: 30 }, { hpCurrent: 20 });
    assert.equal(hit.applied, true);
    assert.equal((await goblin(db)).hpCurrent, 20);
    assert.equal(Number((await fight(db)).vitals_revision), 1);
    assert.deepEqual(publicHp(await token(db, LINKED)), [20, 30], 'shown bar follows by projection');

    const stale = await commit(db, { hpCurrent: 30 }, { hpCurrent: 25 });
    assert.equal(stale.applied, false);
    assert.equal(stale.row.fight.combatants[0].hpCurrent, 20, 'the conflict returns the current row');

    const before = await fight(db);
    assert.equal((await commit(db, { hpCurrent: 20 }, { hpCurrent: 20 })).applied, true);
    assert.equal(String((await fight(db)).updated_at), String(before.updated_at), 'identical values: no UPDATE');

    await db.query("update encounter_fights set fight = $1 where id = 'f1'", [fightJson({ goblinHp: 30, turn: 1 })]);
    assert.equal((await fight(db)).fight.currentTurn, 1);
    assert.equal((await goblin(db)).hpCurrent, 20, 'a stale full fight save keeps HP');

    // A player cannot write the fight; a mark on a visible piece reaches it.
    await as(db, PLAYER);
    await assert.rejects(commit(db, null, { hpCurrent: 1 }), /unavailable|permission/i);
    await db.query("select set_token_conditions($1, '{prone,dead}')", [LINKED]);
    await as(db, GM);
    assert.equal((await goblin(db)).hpCurrent, 0);
    assert.deepEqual((await token(db, LINKED)).conditions, ['prone', 'dead']);
    assert.equal((await fight(db)).fight.combatants.find((c) => c.id === 'p1').hpCurrent, 12);
  } finally { await db.close(); }
});

test('hidden HP never reach a table, a row or an event a player can read', async () => {
  const db = await setup();
  try {
    // Monster in a fight, bar off: the public row has no HP; the GM reads the fight.
    await as(db, PLAYER);
    assert.deepEqual(publicHp(await token(db, HIDDEN)), [null, null]);
    assert.deepEqual(publicHp(await token(db, LINKED)), [30, 30], 'bar on: fight values, stale 99 ignored');
    assert.equal(await secret(db, LEGACY_HIDDEN), undefined, 'the private source is invisible to players');
    assert.equal((await db.query('select count(*)::int as n from map_token_secrets')).rows[0].n, 0);
    assert.equal((await db.query("select count(*)::int as n from encounter_fights")).rows[0].n, 0);
    await as(db, GM);
    assert.equal((await goblin(db)).hpCurrent, 30);

    // HP change while hidden: the public row (= the realtime payload, old and
    // new with replica identity full) stays empty.
    await commit(db, { hpCurrent: 30 }, { hpCurrent: 11 });
    assert.deepEqual(publicHp(await token(db, HIDDEN)), [null, null]);
    assert.deepEqual(publicHp(await token(db, LINKED)), [11, 30]);

    // Toggle on: projected from the fight. Toggle off: cleared, fight untouched.
    await db.exec(`update map_tokens set show_hp = true where id = '${HIDDEN}'`);
    assert.deepEqual(publicHp(await token(db, HIDDEN)), [11, 30]);
    await db.exec(`update map_tokens set show_hp = false where id = '${HIDDEN}'`);
    assert.deepEqual(publicHp(await token(db, HIDDEN)), [null, null]);
    assert.equal((await goblin(db)).hpCurrent, 11);

    // Standalone: the legacy values moved to the GM-only source, label kept.
    const legacy = await secret(db, LEGACY_HIDDEN);
    assert.deepEqual([legacy.hp_current, legacy.hp_max, legacy.label], [17, 40, 'Mimic']);
    assert.deepEqual(publicHp(await token(db, LEGACY_HIDDEN)), [null, null]);
    assert.deepEqual([(await secret(db, LEGACY_SHOWN)).hp_current, (await secret(db, LEGACY_SHOWN)).hp_max], [8, 12]);
    assert.deepEqual(publicHp(await token(db, LEGACY_SHOWN)), [8, 12]);
    assert.deepEqual([(await secret(db, ORPHAN)).hp_current], [7], 'no cloud fight: private source');

    // The GM edits standalone HP in the private source only; the bar follows.
    await db.exec(`update map_token_secrets set hp_current = 5 where token_id = '${LEGACY_SHOWN}'`);
    assert.deepEqual(publicHp(await token(db, LEGACY_SHOWN)), [5, 12]);
    await db.exec(`update map_token_secrets set hp_current = 3 where token_id = '${LEGACY_HIDDEN}'`);
    assert.deepEqual(publicHp(await token(db, LEGACY_HIDDEN)), [null, null]);
    await db.exec(`update map_tokens set show_hp = true where id = '${LEGACY_HIDDEN}'`);
    assert.deepEqual(publicHp(await token(db, LEGACY_HIDDEN)), [3, 40], 'toggle on rebuilds from the private source');

    // Nothing written on the public row reaches or changes a private source.
    await db.exec(`update map_tokens set hp_current = 1, hp_max = 1 where id in ('${LEGACY_SHOWN}', '${LINKED}')`);
    assert.deepEqual(publicHp(await token(db, LEGACY_SHOWN)), [5, 12]);
    assert.equal((await secret(db, LEGACY_SHOWN)).hp_current, 5);
    assert.deepEqual(publicHp(await token(db, LINKED)), [11, 30]);
    assert.equal((await goblin(db)).hpCurrent, 11);

    // A player cannot write HP anywhere.
    await as(db, PLAYER);
    await db.exec(`update map_tokens set hp_current = 99, show_hp = true where id = '${HIDDEN}'`);
    await db.exec(`update map_token_secrets set hp_current = 99 where token_id = '${LEGACY_HIDDEN}'`);
    await assert.rejects(db.exec(`insert into map_token_secrets (token_id, hp_current) values ('${LINKED}', 99)`), /row-level security/i);
    await db.exec(`insert into map_tokens (id, scene_id, hp_current, hp_max, show_hp) values
      ('00000000-0000-4000-8000-0000000000f1', '${SCENE}', 50, 50, true)`);
    assert.deepEqual(publicHp(await token(db, '00000000-0000-4000-8000-0000000000f1')), [null, null],
      'a new piece has no HP until the GM sets its private value');
    await as(db, GM);
    assert.equal((await secret(db, LEGACY_HIDDEN)).hp_current, 3);
    assert.equal((await goblin(db)).hpCurrent, 11);
    assert.deepEqual(publicHp(await token(db, HIDDEN)), [11, 30], 'show_hp is a public field; HP still come from the fight');

    // Removing the private row clears the bar; nothing else depends on it.
    await db.exec(`delete from map_token_secrets where token_id = '${LEGACY_SHOWN}'`);
    assert.deepEqual(publicHp(await token(db, LEGACY_SHOWN)), [null, null]);

    // A fight whose id matches a piece but is owned by someone other than the
    // campaign GM controls nothing on that piece.
    await as(db, PLAYER);
    await db.query(
      "insert into encounter_fights (id, instance_id, owner, name, fight) values ('gone', 'inst', $1, 'X', $2)",
      [PLAYER, JSON.stringify({ combatants: [{ id: 'm9', type: 'monster', hpCurrent: 1, hpMax: 1, activeConditions: ['prone'] }] })],
    );
    await as(db, GM);
    assert.deepEqual(publicHp(await token(db, ORPHAN)), [7, 10]);
    assert.deepEqual((await token(db, ORPHAN)).conditions, []);
  } finally { await db.close(); }
});
