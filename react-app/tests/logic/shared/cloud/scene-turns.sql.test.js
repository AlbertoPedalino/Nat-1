import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { SUPABASE_STUBS } from './supabaseStubs.js';

const DIR = new URL('../../../../supabase/', import.meta.url);

const GM = '00000000-0000-4000-8000-000000000001';
const PLAYER = '00000000-0000-4000-8000-000000000002';
const CAMPAIGN = '10000000-0000-4000-8000-000000000001';
const SCENE = '20000000-0000-4000-8000-00000000000a';
const GOBLIN = '30000000-0000-4000-8000-000000000001'; // m1, on the board
const AMBUSH = '30000000-0000-4000-8000-000000000002'; // m2, on the GM layer
const HERO = '30000000-0000-4000-8000-000000000003'; // the player's character

function fightJson({ turn = 0, round = 1, turnRevision, order = ['m1', 'm2', 'p1'] } = {}) {
  const all = {
    m1: { id: 'm1', name: 'Goblin', type: 'monster', hpCurrent: 7, hpMax: 7, isDead: false },
    m2: { id: 'm2', name: 'Goblin Boss', type: 'monster', hpCurrent: 21, hpMax: 21, isDead: false },
    p1: { id: 'p1', name: 'Hero', type: 'player', sourceId: 'pc', hpCurrent: 12, hpMax: 12, isDead: false },
  };
  return JSON.stringify({
    currentTurn: turn,
    round,
    ...(turnRevision == null ? {} : { turnRevision }),
    combatants: order.map((id) => all[id]),
  });
}

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
    insert into public.campaigns (id, name, gm, join_code) values ('${CAMPAIGN}', 'Table', '${GM}', 'CODE1');
    insert into public.campaign_members (campaign_id, user_id) values ('${CAMPAIGN}', '${PLAYER}');
    insert into public.characters (id, owner, name, data, campaign_id)
      values ('pc', '${PLAYER}', 'Hero', '{}'::jsonb, '${CAMPAIGN}');
    insert into public.map_scenes (id, campaign_id, name) values ('${SCENE}', '${CAMPAIGN}', 'Cave');
  `);
  await db.query(
    "insert into public.encounter_fights (id, instance_id, owner, name, fight) values ('f1', 'inst', $1, 'Ambush', $2)",
    [GM, fightJson()],
  );
  return db;
}

const as = async (db, uid) => db.exec(`reset role; set test.uid = '${uid}'; set role authenticated;`);
const asAdmin = async (db) => db.exec('reset role;');
const slots = async (db) => Object.fromEntries((await db.query(
  'select id, turn_order, turn_active from public.map_tokens order by id',
)).rows.map((row) => [row.id, [row.turn_order, row.turn_active]]));
const shown = async (db) => (await db.query(`select * from public.map_scene_turns where scene_id = '${SCENE}'`)).rows[0];
const storedFight = async (db) => (await db.query("select fight from public.encounter_fights where id = 'f1'")).rows[0].fight;
const step = async (db, base, direction = 1) => (await db.query(
  "select public.commit_fight_turn('f1', $1, $2) as r",
  [base == null ? null : JSON.stringify(base), direction],
)).rows[0].r;

async function placeFight(db) {
  await as(db, GM);
  await db.query('select public.set_live_scene($1)', [SCENE]);
  await db.exec(`
    insert into public.map_tokens (id, scene_id, layer, label, source_ref) values
      ('${GOBLIN}', '${SCENE}', 'tokens', 'Goblin', 'inst:f1:m1'),
      ('${AMBUSH}', '${SCENE}', 'gm', 'Boss', 'inst:f1:m2');
    insert into public.map_tokens (id, scene_id, label, character_id) values ('${HERO}', '${SCENE}', 'Hero', 'pc');
  `);
}

test('placing a fight shows it; the turn moves only through the GM and reaches pieces players can see', async () => {
  const db = await schema();
  try {
    await placeFight(db);
    await asAdmin(db);
    assert.equal((await shown(db)).fight_id, 'f1', 'the GM placing an imported piece picks its fight');
    assert.equal((await shown(db)).round, 1);
    assert.deepEqual(await slots(db), {
      [GOBLIN]: [1, true], [AMBUSH]: [2, false], [HERO]: [3, false],
    });

    // Players read the order through the pieces they can see: never the boss.
    await as(db, PLAYER);
    const visible = (await db.query('select id, turn_order, turn_active from public.map_tokens order by turn_order')).rows;
    assert.deepEqual(visible.map((row) => row.id), [GOBLIN, HERO]);
    assert.equal((await db.query('select round from public.map_scene_turns')).rows[0].round, 1);
    // …and cannot write the turn, the choice, or their own slot.
    await assert.rejects(step(db, null), /unavailable|permission/i);
    await db.query(`update public.map_scene_turns set fight_id = null where scene_id = '${SCENE}'`);
    await db.query(`update public.map_tokens set turn_order = 99, turn_active = true where id = '${HERO}'`);
    await asAdmin(db);
    assert.equal((await shown(db)).fight_id, 'f1', 'players cannot change the shown fight');
    assert.deepEqual((await slots(db))[HERO], [3, false], 'a written slot is recomputed');

    // GM: next turn is the boss — players see no one acting.
    await as(db, GM);
    const toBoss = await step(db, { currentTurn: 0, round: 1, turnRevision: 0 });
    assert.equal(toBoss.applied, true);
    assert.equal(toBoss.row.fight.currentTurn, 1);
    assert.equal(toBoss.row.fight.turnRevision, 1);
    await as(db, PLAYER);
    assert.equal((await db.query('select count(*)::int as n from public.map_tokens where turn_active')).rows[0].n, 0);

    // A stale base changes nothing and hands back the current row.
    await as(db, GM);
    const stale = await step(db, { currentTurn: 0, round: 1, turnRevision: 0 });
    assert.equal(stale.applied, false);
    assert.equal(stale.row.fight.currentTurn, 1);

    await step(db, { currentTurn: 1, round: 1, turnRevision: 1 });
    await asAdmin(db);
    assert.deepEqual((await slots(db))[HERO], [3, true]);

    // Wrapping round: the scene row follows the fight.
    await as(db, GM);
    await step(db, { currentTurn: 2, round: 1, turnRevision: 2 });
    await asAdmin(db);
    assert.equal((await shown(db)).round, 2);
    assert.deepEqual((await slots(db))[GOBLIN], [1, true]);

    // Back one: previous round's last combatant.
    await as(db, GM);
    const back = await step(db, { turnRevision: 3 }, -1);
    assert.equal(back.row.fight.currentTurn, 2);
    assert.equal(back.row.fight.round, 1);
  } finally { await db.close(); }
});

test('an ordinary fight save cannot put an older turn back, but keeps its own turn changes', async () => {
  const db = await schema();
  try {
    await placeFight(db);
    await step(db, null); // boss, revision 1
    await step(db, null); // hero, revision 2

    // The builder saves what it held before those steps, with the order changed
    // by an initiative edit: the hero keeps the turn, wherever they now stand.
    await db.query("update public.encounter_fights set fight = $1 where id = 'f1'", [
      fightJson({ turn: 1, round: 1, turnRevision: 0, order: ['p1', 'm1', 'm2'] }),
    ]);
    let fight = await storedFight(db);
    assert.equal(fight.combatants[fight.currentTurn].id, 'p1');
    assert.equal(fight.turnRevision, 2);
    assert.deepEqual(fight.combatants.map((c) => c.id), ['p1', 'm1', 'm2'], 'the roster change itself is kept');
    await asAdmin(db);
    assert.deepEqual(await slots(db), {
      [GOBLIN]: [2, false], [AMBUSH]: [3, false], [HERO]: [1, true],
    });

    // A save that saw the latest revision is the builder's own move: kept.
    await as(db, GM);
    await db.query("update public.encounter_fights set fight = $1 where id = 'f1'", [
      fightJson({ turn: 1, round: 1, turnRevision: 2, order: ['p1', 'm1', 'm2'] }),
    ]);
    fight = await storedFight(db);
    assert.equal(fight.currentTurn, 1);
    assert.equal(fight.turnRevision, 2);
  } finally { await db.close(); }
});

test('dead combatants are skipped, and the shown fight can be changed, hidden or deleted', async () => {
  const db = await schema();
  try {
    await placeFight(db);
    await db.query("select public.commit_fight_combatant_vitals('f1', 'm2', null, $1)", [JSON.stringify({ isDead: true, hpCurrent: 0 })]);
    const skipped = await step(db, null);
    assert.equal(skipped.row.fight.currentTurn, 2, 'the dead boss is skipped');

    await db.query(`update public.map_scene_turns set fight_id = null, instance_id = null where scene_id = '${SCENE}'`);
    await asAdmin(db);
    assert.equal((await shown(db)).round, null);
    assert.deepEqual(Object.values(await slots(db)), [[null, false], [null, false], [null, false]]);

    // Someone else's fight id is not a choice.
    await db.query(
      "insert into public.encounter_fights (id, instance_id, owner, name, fight) values ('f2', 'other', $1, 'Theirs', $2)",
      [PLAYER, fightJson()],
    );
    await as(db, GM);
    await db.query(`update public.map_scene_turns set fight_id = 'f2', instance_id = 'other' where scene_id = '${SCENE}'`);
    await asAdmin(db);
    assert.equal((await shown(db)).fight_id, null);

    await as(db, GM);
    await db.query(`update public.map_scene_turns set fight_id = 'f1', instance_id = 'inst' where scene_id = '${SCENE}'`);
    await asAdmin(db);
    assert.deepEqual((await slots(db))[HERO], [3, true]);

    await as(db, GM);
    await db.query("delete from public.encounter_fights where id = 'f1'");
    await asAdmin(db);
    assert.equal((await shown(db)).fight_id, null, 'a deleted fight is shown nowhere');
    assert.deepEqual((await slots(db))[HERO], [null, false]);

    await as(db, GM);
    await db.query(`delete from public.map_scenes where id = '${SCENE}'`);
    await asAdmin(db);
    assert.equal((await db.query('select count(*)::int as n from public.map_scene_turns')).rows[0].n, 0);
  } finally { await db.close(); }
});
