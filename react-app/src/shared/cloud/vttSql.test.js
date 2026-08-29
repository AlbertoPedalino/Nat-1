import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The VTT security model lives entirely in SQL, and nothing in CI runs Postgres.
// These assertions are the cheap guard against the file drifting away from the
// guarantees the client assumes — above all that the GM layer is filtered by the
// database, not by the UI.
const sql = readFileSync(new URL('../../../supabase/vtt.sql', import.meta.url), 'utf8').toLowerCase();
const atmosphereSql = readFileSync(new URL('../../../supabase/atmosphere.sql', import.meta.url), 'utf8').toLowerCase();

test('VTT SQL creates both tables, their indexes, RLS and updated_at triggers', () => {
  for (const table of ['map_scenes', 'map_tokens']) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}\\s*\\(`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`create trigger ${table}_touch before update on public\\.${table}`));
  }
  assert.match(sql, /create index if not exists map_scenes_campaign_idx on public\.map_scenes\(campaign_id\)/);
  assert.match(sql, /create index if not exists map_tokens_scene_idx on public\.map_tokens\(scene_id\)/);
  assert.match(sql, /create index if not exists map_tokens_scene_layer_idx on public\.map_tokens\(scene_id, layer\)/);
  assert.match(sql, /create index if not exists map_tokens_scene_visibility_idx\s+on public\.map_tokens\(scene_id, hidden_from_players, layer\)/);
});

test('a token belongs to a scene, a scene to a campaign, and both cascade', () => {
  assert.match(sql, /campaign_id\s+uuid not null references public\.campaigns\(id\) on delete cascade/);
  assert.match(sql, /scene_id\s+uuid not null references public\.map_scenes\(id\) on delete cascade/);
  // A deleted sheet must not take the token with it, only unlink it.
  assert.match(sql, /character_id text references public\.characters\(id\) on delete set null/);
});

test('the layer column is constrained to the three known layers', () => {
  assert.match(sql, /check \(layer in \('map', 'tokens', 'gm'\)\)/);
  assert.match(sql, /hidden_from_players\s+boolean not null default false/);
  assert.match(sql, /alter table public\.map_tokens add column if not exists hidden_from_players boolean not null default false/);
});

test('vector map objects store a Lucide key and no image payload', () => {
  assert.match(sql, /icon_key\s+text/);
  assert.match(sql, /alter table public\.map_tokens add column if not exists icon_key text/);
  assert.match(sql, /icon_stroke_width\s+double precision not null default 1\.8/);
  assert.match(sql, /alter table public\.map_tokens add column if not exists icon_stroke_width double precision not null default 1\.8/);
  assert.match(sql, /rotation\s+double precision not null default 0/);
});

// A GM-only label is a secret, and RLS filters rows rather than columns: kept on
// the token row it would be delivered to the player and merely hidden by the
// client, exactly the mistake the hidden layer avoids.
test('secret labels live in their own GM-only table', () => {
  assert.match(sql, /create table if not exists public\.map_token_secrets\s*\(/);
  assert.match(sql, /token_id\s+uuid primary key references public\.map_tokens\(id\) on delete cascade/);
  assert.match(sql, /alter table public\.map_token_secrets enable row level security/);

  const start = sql.indexOf('create policy map_token_secrets_all on');
  assert.ok(start > -1, 'the secrets policy is missing');
  const body = sql.slice(start, start + 400);
  assert.ok(body.includes('for all using'), 'reads and writes are gated together');
  assert.equal((body.match(/is_campaign_gm/g) || []).length, 2, 'USING and WITH CHECK both gate on the GM');

  // Conditions are the opposite call: the party can see who is prone.
  assert.match(sql, /conditions\s+text\[\] not null default '\{\}'/);
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

// Scenes the GM is still preparing must not reach the players at all, which is
// the same rule as the hidden layer applied one level up.
test('a player only ever sees the live scene', () => {
  assert.match(sql, /is_live\s+boolean not null default false/);
  assert.match(sql, /alter table public\.map_scenes add column if not exists is_live boolean not null default false/);

  const start = sql.indexOf('create policy map_scenes_select on');
  const policy = sql.slice(start, sql.indexOf(';', start));
  assert.ok(policy.includes('is_campaign_gm'), 'the GM sees the whole campaign');
  assert.ok(policy.includes('is_live'), 'everyone else is limited to the live scene');

  const tokenStart = sql.indexOf('create policy map_tokens_select on');
  const tokenPolicy = sql.slice(tokenStart, sql.indexOf(';', tokenStart));
  assert.ok(tokenPolicy.includes('map_scene_is_live'), 'tokens of a non-live scene stay hidden too');
});

// Two updates from the client would race: between clearing the old live scene
// and setting the new one, the unique index rejects the second write.
test('going live is one transactional RPC, guarded by a unique index', () => {
  assert.match(sql, /create unique index if not exists map_scenes_one_live_idx\s*\n?\s*on public\.map_scenes\(campaign_id\) where is_live/);
  assert.match(sql, /create or replace function public\.set_live_scene\(p_scene uuid\)/);
  assert.match(sql, /create or replace function public\.clear_live_scene\(p_campaign uuid\)/);

  // SECURITY DEFINER bypasses RLS, so the function has to check the caller
  // itself or any member could take over the projector.
  const start = sql.indexOf('create or replace function public.set_live_scene');
  const body = sql.slice(start, sql.indexOf('$$;', start));
  assert.ok(body.includes('security definer'));
  assert.ok(body.includes('is_campaign_gm'), 'set_live_scene must verify the caller is the GM');
  assert.ok(body.includes('raise exception'));

  const clearBody = sql.slice(
    sql.indexOf('create or replace function public.clear_live_scene'),
    sql.indexOf('-- 5) realtime'),
  );
  assert.ok(clearBody.includes('is_campaign_gm'), 'clear_live_scene must verify it too');
});

// Pieces staged off the edge of the map are as much a secret as the hidden
// layer, and are kept one the same way: by not sending them.
test('tokens outside the play area never reach a player', () => {
  assert.match(sql, /play_area\s+jsonb/);
  assert.match(sql, /alter table public\.map_scenes add column if not exists play_area jsonb/);
  assert.match(sql, /create or replace function public\.map_token_in_play\(/);

  const start = sql.indexOf('create policy map_tokens_select on');
  const policy = sql.slice(start, sql.indexOf(';', start));
  assert.ok(policy.includes('map_token_in_play'), 'the select policy must apply the play area');
  assert.ok(policy.includes('not hidden_from_players'), 'explicitly hidden pieces must be filtered too');

  // No area means the whole scene is in play; reading null as "outside" would
  // blank every scene that never set one.
  const helper = sql.slice(
    sql.indexOf('create or replace function public.map_token_in_play'),
    sql.indexOf('create or replace function public.map_token_campaign'),
  );
  assert.ok(helper.includes('when area is null then true'));
});

// Two pictures per scene, one shown at a time: a session flips between the
// battlemap and an establishing shot repeatedly, and re-uploading each time is
// not a workflow.
test('a scene holds a battlemap and a background, and remembers which is shown', () => {
  assert.match(sql, /background_path\s+text/);
  assert.match(sql, /shown_image\s+text not null default 'map' check \(shown_image in \('map', 'background'\)\)/);
  assert.match(sql, /alter table public\.map_scenes add column if not exists background_path text/);
  assert.match(sql, /alter table public\.map_scenes add column if not exists shown_image text not null default 'map'/);
});

// One row per stroke, and the reason is the opposite of fog's: undo is a delete,
// realtime carries only the new stroke, and nothing rewrites a payload that
// grows all session.
test('drawings are rows, and follow the same visibility rules as tokens', () => {
  assert.match(sql, /create table if not exists public\.map_drawings\s*\(/);
  assert.match(sql, /scene_id\s+uuid not null references public\.map_scenes\(id\) on delete cascade/);
  assert.doesNotMatch(sql, /drawings\s+jsonb/, 'strokes must not be a blob on the scene');
  assert.match(sql, /create index if not exists map_drawings_scene_idx/);

  const start = sql.indexOf('create policy map_drawings_select on');
  const policy = sql.slice(start, sql.indexOf(';', start));
  assert.ok(policy.includes("layer <> 'gm'"), 'a GM-layer stroke is not sent to players');
  assert.ok(policy.includes('map_scene_is_live'), 'nor is anything on a scene that is not live');

  // Everyone at the table draws, but only onto the live scene and stamped as
  // their own; the eraser is bounded the same way, or undo would become a way to
  // wipe the GM's annotations.
  const insert = sql.indexOf('create policy map_drawings_insert on');
  const insertBody = sql.slice(insert, sql.indexOf(';', insert));
  assert.ok(insertBody.includes('created_by = auth.uid()'));
  assert.ok(insertBody.includes("layer <> 'gm'"));
  assert.ok(insertBody.includes('map_scene_is_live'));

  const del = sql.indexOf('create policy map_drawings_delete on');
  const deleteBody = sql.slice(del, sql.indexOf(';', del));
  assert.ok(deleteBody.includes('created_by = auth.uid()'));
  assert.ok(deleteBody.includes('is_campaign_gm'), 'the GM can still clear anything');
  assert.ok(deleteBody.includes('map_scene_is_live'), 'players can only erase on the live scene');
  assert.ok(deleteBody.includes('user_campaign_ids'), 'players must still belong to that campaign');

  const update = sql.indexOf('create policy map_drawings_update on');
  const updateBody = sql.slice(update, sql.indexOf(';', update));
  assert.equal((updateBody.match(/map_scene_is_live/g) || []).length, 2, 'USING and WITH CHECK stay live-scene bounded');
  assert.equal((updateBody.match(/user_campaign_ids/g) || []).length, 2, 'USING and WITH CHECK verify membership');

  assert.match(sql, /tablename = 'map_drawings'/);

  // A note is a stroke with words on it, in the same table: it inherits the
  // visibility rules, the realtime feed, undo and the eraser rather than
  // growing a second copy of all four.
  assert.match(sql, /alter table public\.map_drawings add column if not exists text text/);
});

// Conditions are the one write a player may make on a piece that is not theirs.
// It is a function and not a policy on purpose: RLS grants whole rows, so a
// policy permissive enough to mark an enemy would also let them drag it away.
test('marking a token is an RPC that writes one column', () => {
  const start = sql.indexOf('create or replace function public.set_token_conditions');
  assert.ok(start > -1, 'set_token_conditions is missing');
  const body = sql.slice(start, sql.indexOf('$$;', start));
  assert.ok(body.includes('security definer'));
  assert.ok(body.includes('set conditions ='), 'it must write conditions');
  assert.doesNotMatch(body, /set (x|y|layer|character_id|hp_current) =/, 'and nothing else');
  assert.ok(body.includes('is_campaign_gm'), 'the GM may mark anywhere in their campaign');
  assert.ok(body.includes("token.layer <> 'gm'"), 'a player never marks a piece they cannot see');
  assert.ok(body.includes('not token.hidden_from_players'), 'the RPC must reject explicitly hidden pieces');
  assert.ok(body.includes('map_token_in_play'), 'the RPC must reject staged pieces');
  assert.ok(body.includes('scene.is_live'));
  assert.ok(body.includes('raise exception'));
});

test('a scene stores one seeded atmosphere description', () => {
  assert.match(sql, /atmosphere\s+jsonb not null default/);
  assert.match(sql, /alter table public\.map_scenes add column if not exists atmosphere jsonb not null default/);
});

test('the one-time atmosphere script discards rather than migrates legacy weather', () => {
  const addAtmosphere = atmosphereSql.indexOf('add column if not exists atmosphere');
  const dropWeather = atmosphereSql.indexOf('drop column if exists weather');
  assert.ok(addAtmosphere > -1, 'the replacement column must be created');
  assert.ok(dropWeather > addAtmosphere, 'legacy weather is dropped only after atmosphere exists');
  assert.doesNotMatch(atmosphereSql, /rename column weather/);
  assert.match(atmosphereSql, /notify pgrst, 'reload schema'/);
});

test('effect marking has the same visibility boundary as conditions', () => {
  const start = sql.indexOf('create or replace function public.set_token_effects');
  assert.ok(start > -1, 'set_token_effects is missing');
  const body = sql.slice(start, sql.indexOf('$$;', start));
  assert.ok(body.includes('security definer'));
  assert.ok(body.includes('set effects ='));
  assert.ok(body.includes("token.layer <> 'gm'"));
  assert.ok(body.includes('not token.hidden_from_players'));
  assert.ok(body.includes('map_token_in_play'));
  assert.ok(body.includes('scene.is_live'));
});

// A player places their own character and plain markers, and may move or remove
// what they placed. `created_by` is what makes that possible without handing
// them the board.
test('players may place and reclaim their own pieces, and nothing else', () => {
  assert.match(sql, /created_by\s+uuid default auth\.uid\(\)/);

  const insert = sql.slice(
    sql.indexOf('create policy map_tokens_insert on'),
    sql.indexOf('create policy map_tokens_delete on'),
  );
  assert.ok(insert.includes('created_by = auth.uid()'), 'a player can only stamp a piece as their own');
  assert.ok(insert.includes("layer <> 'gm'"), 'and never onto the GM layer');
  assert.ok(insert.includes('not hidden_from_players'), 'and never as an explicitly hidden piece');
  assert.ok(insert.includes('owns_character'), 'nor standing for somebody else’s sheet');
  assert.ok(insert.includes('map_scene_is_live'), 'and only on the scene actually in play');

  const del = sql.slice(
    sql.indexOf('create policy map_tokens_delete on'),
    sql.indexOf('create policy map_tokens_update on'),
  );
  assert.ok(del.includes('created_by = auth.uid()'));
  assert.ok(del.includes('not hidden_from_players'));
  assert.ok(del.includes('map_token_in_play'));
  assert.ok(del.includes('map_scene_is_live'));

  const update = sql.slice(
    sql.indexOf('create policy map_tokens_update on'),
    sql.indexOf('-- 4a) marking conditions'),
  );
  assert.equal((update.match(/created_by = auth\.uid\(\)/g) || []).length, 2, 'USING and WITH CHECK both');
  assert.equal((update.match(/not hidden_from_players/g) || []).length, 2);
  assert.equal((update.match(/map_token_in_play/g) || []).length, 2);
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
  const start = sql.indexOf('create policy map_tokens_update on');
  // Bounded by the end of the statement rather than by a section heading, so
  // renumbering the file cannot quietly widen this slice.
  const updatePolicy = sql.slice(start, sql.indexOf(';', start));
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

// Without FULL, Realtime has only the primary key of a deleted row, cannot
// evaluate RLS against it, and therefore delivers the delete to nobody: the
// piece disappeared for whoever removed it and stayed put for everyone else.
test('tables whose rows are deleted replicate the whole old row', () => {
  assert.match(sql, /alter table public\.map_tokens replica identity full/);
  assert.match(sql, /alter table public\.map_drawings replica identity full/);
});

test('token and scene changes are published to realtime idempotently', () => {
  for (const table of ['map_tokens', 'map_scenes']) {
    assert.match(sql, new RegExp(`tablename = '${table}'`));
    assert.match(sql, new RegExp(`alter publication supabase_realtime add table public\\.${table}`));
  }
  assert.match(sql, /if not exists \(\s*select 1 from pg_publication_tables/);
});

// This file is pasted into the SQL editor top to bottom, and a `language sql`
// body is parsed when the function is created. Defining map_scene_campaign
// before its table failed with 'relation "public.map_scenes" does not exist',
// which no amount of shape-checking would have caught.
test('functions that read the new tables are declared after them', () => {
  const table = sql.indexOf('create table if not exists public.map_scenes');
  const helper = sql.indexOf('create or replace function public.map_scene_campaign');
  assert.ok(table > -1 && helper > -1);
  assert.ok(helper > table, 'map_scene_campaign must come after the table it selects from');
  assert.ok(
    sql.indexOf('create or replace function public.map_token_campaign')
      > sql.indexOf('create table if not exists public.map_tokens'),
    'map_token_campaign must come after the tables it joins',
  );

  // Triggers need their function to exist first, for the same reason.
  assert.ok(
    sql.indexOf('create or replace function public.touch_updated_at')
      < sql.indexOf('create trigger map_scenes_touch'),
    'touch_updated_at must be defined before the triggers that call it',
  );
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
