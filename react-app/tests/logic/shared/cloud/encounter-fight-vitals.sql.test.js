import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const GM = '00000000-0000-4000-8000-00000000000a';
const PLAYER = '00000000-0000-4000-8000-00000000000b';
const SCENE = '00000000-0000-4000-8000-0000000000c1';
const CAMPAIGN = '00000000-0000-4000-8000-0000000000d1';
const TOKEN = '00000000-0000-4000-8000-0000000000e1';
const LOOSE = '00000000-0000-4000-8000-0000000000e2';

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

    create table map_scenes (id uuid primary key, campaign_id uuid, is_live boolean default true);
    create table map_tokens (
      id uuid primary key, scene_id uuid references map_scenes(id), layer text default 'tokens',
      hidden_from_players boolean default false, x numeric default 0, y numeric default 0,
      label text, source_ref text, hp_current integer, hp_max integer,
      conditions text[] not null default '{}', effects jsonb not null default '[]'
    );
    create function is_campaign_gm(p uuid) returns boolean language sql stable as
      $$ select auth.uid() = '${GM}'::uuid $$;
    create function user_campaign_ids() returns setof uuid language sql stable as
      $$ select '${CAMPAIGN}'::uuid $$;
    create function map_token_in_play(s uuid, x numeric, y numeric) returns boolean language sql stable as
      $$ select true $$;
    grant usage on schema auth to authenticated;
    grant select, insert, update on map_tokens, map_scenes to authenticated;
  `);
  await db.exec(await sql('encounter_fights.sql'));
  await db.exec('grant select, insert, update, delete on encounter_fights to authenticated');
  await db.query(
    "insert into encounter_fights (id, instance_id, owner, name, fight) values ('f1', 'inst', $1, 'Fight', $2)",
    [GM, fightJson()],
  );
  await db.exec(`
    insert into map_scenes values ('${SCENE}', '${CAMPAIGN}', true);
    -- A piece imported from a stale local cache, and a piece with no fight.
    insert into map_tokens (id, scene_id, source_ref, hp_current, hp_max)
      values ('${TOKEN}', '${SCENE}', 'inst:f1:m1', 99, 99),
             ('${LOOSE}', '${SCENE}', 'inst:gone:m9', 7, 10);
  `);
  const migration = await sql('encounter_fight_vitals.sql');
  await db.exec(migration);
  await db.exec(migration); // safe to rerun
  return db;
}

const as = (db, uid) => db.exec(`reset role; set test.uid = '${uid}'; set role authenticated;`);
const token = async (db, id = TOKEN) => (await db.query('select * from map_tokens where id = $1', [id])).rows[0];
const fight = async (db) => (await db.query("select * from encounter_fights where id = 'f1'")).rows[0];
const goblin = async (db) => (await fight(db)).fight.combatants.find((c) => c.id === 'm1');
const commit = async (db, base, patch) => (await db.query(
  "select commit_fight_combatant_vitals('f1', 'm1', $1, $2) as r",
  [base == null ? null : JSON.stringify(base), JSON.stringify(patch)],
)).rows[0].r;

test('enemy vitals: encounter_fights is the only authority, map_tokens a derived copy', async () => {
  const db = await setup();
  try {
    // Existing linked pieces are realigned on the fight; unlinked ones keep theirs.
    assert.equal((await token(db)).hp_current, 30);
    assert.equal((await token(db, LOOSE)).hp_current, 7);

    await as(db, GM);
    const hit = await commit(db, { hpCurrent: 30 }, { hpCurrent: 20 });
    assert.equal(hit.applied, true);
    assert.equal((await goblin(db)).hpCurrent, 20);
    assert.equal(Number((await fight(db)).vitals_revision), 1);
    assert.equal((await token(db)).hp_current, 20, 'the display copy follows by projection');

    // A caller that computed from an older value is not applied.
    const stale = await commit(db, { hpCurrent: 30 }, { hpCurrent: 25 });
    assert.equal(stale.applied, false);
    assert.equal(stale.row.fight.combatants[0].hpCurrent, 20, 'the conflict returns the current row');
    assert.equal((await goblin(db)).hpCurrent, 20);

    // Identical values: no UPDATE at all.
    const before = await fight(db);
    assert.equal((await commit(db, { hpCurrent: 20 }, { hpCurrent: 20 })).applied, true);
    const after = await fight(db);
    assert.equal(Number(after.vitals_revision), Number(before.vitals_revision));
    assert.equal(String(after.updated_at), String(before.updated_at));

    // The builder's full save with an old snapshot changes the turn, not the HP.
    await db.query(
      "update encounter_fights set fight = $1 where id = 'f1'",
      [JSON.stringify({ ...JSON.parse(fightJson({ goblinHp: 30, turn: 1 })),
        combatants: [...JSON.parse(fightJson({ goblinHp: 30 })).combatants,
          { id: 'm2', type: 'monster', hpCurrent: 11, hpMax: 11, activeConditions: [], activeEffects: [] }] })],
    );
    const saved = await fight(db);
    assert.equal(saved.fight.currentTurn, 1);
    assert.equal(saved.fight.combatants.find((c) => c.id === 'm1').hpCurrent, 20, 'stale fight save keeps HP');
    assert.equal(saved.fight.combatants.find((c) => c.id === 'm2').hpCurrent, 11, 'new combatants keep their values');
    assert.equal((await token(db)).hp_current, 20);

    // No client write on map_tokens can change a linked piece's vitals.
    await db.exec(`update map_tokens set hp_current = 5, conditions = '{prone}', x = 3 where id = '${TOKEN}'`);
    const moved = await token(db);
    assert.equal(moved.hp_current, 20);
    assert.deepEqual(moved.conditions, []);
    assert.equal(Number(moved.x), 3, 'map data is still written by the piece');
    await db.exec(`insert into map_tokens (id, scene_id, source_ref, hp_current) values
      ('00000000-0000-4000-8000-0000000000e3', '${SCENE}', 'inst:f1:m1', 99)`);
    assert.equal((await token(db, '00000000-0000-4000-8000-0000000000e3')).hp_current, 20,
      'an import from a stale cache takes the fight value');
    await db.exec(`update map_tokens set hp_current = 3 where id = '${LOOSE}'`);
    assert.equal((await token(db, LOOSE)).hp_current, 3, 'pieces without a cloud fight are unchanged');

    // A player cannot write the fight directly (owner RLS)...
    await as(db, PLAYER);
    await assert.rejects(commit(db, null, { hpCurrent: 1 }), /unavailable|permission/i);
    // ...but a mark on a visible piece reaches the combatant, with mortality.
    await db.query("select set_token_conditions($1, '{prone}')", [TOKEN]);
    await as(db, GM);
    assert.deepEqual((await goblin(db)).activeConditions, ['prone']);
    assert.deepEqual((await token(db)).conditions, ['prone']);
    await as(db, PLAYER);
    await db.query("select set_token_conditions($1, '{prone,dead}')", [TOKEN]);
    await db.query(`select set_token_effects($1, '[{"key":"advantage"}]')`, [TOKEN]);
    await as(db, GM);
    const dead = await goblin(db);
    assert.equal(dead.hpCurrent, 0);
    assert.equal(dead.isDead, true);
    assert.deepEqual(dead.activeEffects, [{ key: 'advantage' }]);
    assert.equal((await token(db)).hp_current, 0);
    // Player vitals are not this table's business.
    assert.equal((await fight(db)).fight.combatants.find((c) => c.id === 'p1').hpCurrent, 12);
    await assert.rejects(db.query("select commit_fight_combatant_vitals('f1', 'p1', null, '{\"hpCurrent\":1}')"),
      /unavailable/i);
  } finally { await db.close(); }
});
