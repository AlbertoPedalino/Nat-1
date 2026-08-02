import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The VTT security model lives entirely in SQL, and nothing in CI runs Postgres.
// These assertions are the cheap guard against the file drifting away from the
// guarantees the client assumes — above all that the GM layer is filtered by the
// database, not by the UI.
const sql = readFileSync(new URL('../../../supabase/vtt.sql', import.meta.url), 'utf8').toLowerCase();

test('VTT SQL creates both tables, their indexes, RLS and updated_at triggers', () => {
  for (const table of ['map_scenes', 'map_tokens']) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}\\s*\\(`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`create trigger ${table}_touch before update on public\\.${table}`));
  }
  assert.match(sql, /create index if not exists map_scenes_campaign_idx on public\.map_scenes\(campaign_id\)/);
  assert.match(sql, /create index if not exists map_tokens_scene_idx on public\.map_tokens\(scene_id\)/);
  assert.match(sql, /create index if not exists map_tokens_scene_layer_idx on public\.map_tokens\(scene_id, layer\)/);
});

test('a token belongs to a scene, a scene to a campaign, and both cascade', () => {
  assert.match(sql, /campaign_id\s+uuid not null references public\.campaigns\(id\) on delete cascade/);
  assert.match(sql, /scene_id\s+uuid not null references public\.map_scenes\(id\) on delete cascade/);
  // A deleted sheet must not take the token with it, only unlink it.
  assert.match(sql, /character_id text references public\.characters\(id\) on delete set null/);
});

test('the layer column is constrained to the three known layers', () => {
  assert.match(sql, /check \(layer in \('map', 'tokens', 'gm'\)\)/);
});

// Fog lives on the scene, not in its own table: only the GM writes it, so there
// is no concurrent writer to lose. It is also added defensively for databases
// created before it existed.
test('fog is a scene column and re-runs add it in place', () => {
  assert.match(sql, /fog\s+jsonb/);
  assert.match(sql, /alter table public\.map_scenes add column if not exists fog jsonb/);
  assert.doesNotMatch(sql, /create table if not exists public\.map_fog/);
});

// Fog is drawn client-side over an image every member downloads. Saying so in
// the file is the point: a future reader must not mistake it for a boundary.
test('the file states that fog is presentation and not security', () => {
  assert.match(sql, /fog of war is not a security boundary/);
});

test('every policy is dropped before being created, so the file re-runs clean', () => {
  const created = [...sql.matchAll(/create policy (\w+) on/g)].map((match) => match[1]);
  assert.ok(created.length >= 12, `expected the full policy set, found ${created.length}`);
  for (const policy of created) {
    assert.match(sql, new RegExp(`drop policy if exists ${policy} on`), `${policy} is never dropped first`);
  }
});

test('the GM layer is filtered by RLS on select, not by the client', () => {
  const selectPolicy = sql.slice(
    sql.indexOf('create policy map_tokens_select on'),
    sql.indexOf('create policy map_tokens_insert on'),
  );
  assert.ok(selectPolicy.includes("layer <> 'gm'"), 'the select policy must exclude the GM layer');
  assert.ok(selectPolicy.includes('is_campaign_gm'), '…unless the caller is the campaign GM');
  assert.ok(selectPolicy.includes('user_campaign_ids'), '…and only within their campaigns');
});

test('a player can only update a non-GM token that stands for their own character', () => {
  const updatePolicy = sql.slice(
    sql.indexOf('create policy map_tokens_update on'),
    sql.indexOf('-- 4) realtime'),
  );
  // Both halves matter: USING gates the row read, WITH CHECK gates the row
  // written. Without the second, a player could promote a token to layer='gm'
  // or reassign it to another sheet.
  assert.ok(updatePolicy.includes('for update using ('), 'missing USING');
  assert.ok(updatePolicy.includes('with check ('), 'missing WITH CHECK');
  assert.equal((updatePolicy.match(/owns_character\(character_id\)/g) || []).length, 2);
  assert.equal((updatePolicy.match(/layer <> 'gm'/g) || []).length, 2);
});

test('only the campaign GM inserts or deletes tokens and scenes', () => {
  for (const policy of ['map_tokens_insert', 'map_tokens_delete', 'map_scenes_insert', 'map_scenes_delete', 'map_scenes_update']) {
    const start = sql.indexOf(`create policy ${policy} on`);
    assert.ok(start > -1, `${policy} is missing`);
    const body = sql.slice(start, start + 400);
    assert.ok(body.includes('is_campaign_gm'), `${policy} must be GM-gated`);
  }
});

test('map images are a private bucket keyed by the campaign folder', () => {
  assert.match(sql, /insert into storage\.buckets \(id, name, public\)\s*values \('map-images', 'map-images', false\)/);
  for (const policy of ['map_images_select', 'map_images_insert', 'map_images_update', 'map_images_delete']) {
    const start = sql.indexOf(`create policy ${policy} on`);
    assert.ok(start > -1, `${policy} is missing`);
    const body = sql.slice(start, start + 400);
    assert.ok(body.includes("bucket_id = 'map-images'"), `${policy} must be scoped to the bucket`);
    assert.ok(body.includes('(storage.foldername(name))[1]'), `${policy} must read the campaign folder`);
    // A raw ::uuid cast on a malformed path would error the request instead of
    // failing the policy.
    assert.ok(body.includes('uuid_or_null'), `${policy} must cast the folder safely`);
  }
  assert.ok(sql.indexOf('create policy map_images_insert on') > -1);
  const insertBody = sql.slice(sql.indexOf('create policy map_images_insert on'), sql.indexOf('create policy map_images_update on'));
  assert.ok(insertBody.includes('is_campaign_gm'), 'only the GM uploads maps');
});

test('token and scene changes are published to realtime idempotently', () => {
  for (const table of ['map_tokens', 'map_scenes']) {
    assert.match(sql, new RegExp(`tablename = '${table}'`));
    assert.match(sql, new RegExp(`alter publication supabase_realtime add table public\\.${table}`));
  }
  assert.match(sql, /if not exists \(\s*select 1 from pg_publication_tables/);
});

test('policy helpers are security definer and search_path pinned', () => {
  for (const fn of ['is_campaign_gm', 'map_scene_campaign', 'owns_character']) {
    const start = sql.indexOf(`create or replace function public.${fn}(`);
    assert.ok(start > -1, `${fn} is missing`);
    const body = sql.slice(start, start + 400);
    assert.ok(body.includes('security definer'), `${fn} must be security definer`);
    assert.ok(body.includes('set search_path = public'), `${fn} must pin search_path`);
  }
});
