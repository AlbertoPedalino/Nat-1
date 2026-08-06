import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Nothing in CI runs Postgres, so the claims the client is built on are asserted
// against the schema text itself. There are two: a player never sees a dungeon
// key, and the plan is required on every row — which is why writing the key is
// an update and not an upsert with fewer fields.
const sql = readFileSync(new URL('../../../supabase/dungeon.sql', import.meta.url), 'utf8').toLowerCase();
const client = readFileSync(new URL('./dungeon.js', import.meta.url), 'utf8');

test('the dungeon table exists, keyed by scene, with RLS and a touch trigger', () => {
  assert.match(sql, /create table if not exists public\.map_dungeons\s*\(/);
  assert.match(sql, /scene_id\s+uuid primary key references public\.map_scenes\(id\) on delete cascade/);
  assert.match(sql, /alter table public\.map_dungeons enable row level security/);
  assert.match(sql, /create trigger map_dungeons_touch before update on public\.map_dungeons/);
});

// The reason it is not a column on map_scenes: a player may select the live
// scene row, and this is every trap on the map.
test('a dungeon key is the GM\'s alone, in the policy rather than in the client', () => {
  const start = sql.indexOf('create policy map_dungeons_all on');
  assert.ok(start > -1, 'the dungeon policy is missing');
  const policy = sql.slice(start, sql.indexOf(';', start));
  assert.match(policy, /for all using \(public\.is_campaign_gm/);
  assert.match(policy, /with check \(public\.is_campaign_gm/);
  // No second policy hands a readable half to anyone else.
  assert.equal(sql.match(/create policy map_dungeons/g).length, 1);
});

// Postgres evaluates an upsert's insert before it finds the conflict, so a
// patch without the plan is refused by this constraint even when the row
// already exists. The client has to update instead, and did not at first.
test('the plan is required, and the client only ever upserts with one', () => {
  assert.match(sql, /plan\s+jsonb not null/);

  const upsert = client.slice(client.indexOf('export async function saveSceneDungeon'));
  assert.match(upsert.slice(0, upsert.indexOf('export async function updateSceneDungeon')), /if \(!plan\) throw/);

  const update = client.slice(client.indexOf('export async function updateSceneDungeon'));
  assert.ok(!update.includes('.upsert('), 'rolling the rooms must not upsert');
  assert.match(update, /\.update\(patch\)/);
});
