import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Like the VTT, the hexcrawl's security model lives entirely in SQL and nothing
// in CI runs Postgres. These assertions guard the two claims the client is built
// on: an unrevealed hex never reaches a player, and the board's own blob is not
// where the shared clock lives.
const sql = readFileSync(new URL('../../../../../supabase/10_hexcrawl.sql', import.meta.url), 'utf8').toLowerCase();

test('the hexcrawl tables exist with RLS and updated_at triggers', () => {
  for (const table of ['campaign_hexcrawl', 'campaign_hexcrawl_log', 'map_hex_cells']) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}\\s*\\(`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(sql, /create trigger campaign_hexcrawl_touch before update on public\.campaign_hexcrawl/);
  assert.match(sql, /create trigger map_hex_cells_touch before update on public\.map_hex_cells/);
  assert.match(sql, /create index if not exists map_hex_cells_scene_idx on public\.map_hex_cells\(scene_id\)/);
});

test('a hex is keyed by its scene and axial coordinates', () => {
  assert.match(sql, /primary key \(scene_id, q, r\)/);
  assert.match(sql, /scene_id\s+uuid not null references public\.map_scenes\(id\) on delete cascade/);
});

test('a campaign has at most one hexcrawl board, and losing it does not delete the campaign', () => {
  assert.match(
    sql,
    /add column if not exists hexcrawl_board_id text\s+references public\.boards\(id\) on delete set null/,
  );
  // One clock per campaign is the primary key, not a convention.
  assert.match(sql, /campaign_id\s+uuid primary key references public\.campaigns\(id\) on delete cascade/);
});

test('an unrevealed hex is withheld by the database, not by the client', () => {
  const start = sql.indexOf('create policy map_hex_cells_select on');
  assert.ok(start > -1, 'the hex select policy is missing');
  const policy = sql.slice(start, sql.indexOf(';', start));
  assert.match(policy, /is_campaign_gm/);
  assert.match(policy, /revealed/);
  assert.match(policy, /map_scene_is_live/);
  assert.match(policy, /user_campaign_ids/);
});

test('only the GM writes hexes, the clock and the log', () => {
  for (const policy of ['map_hex_cells_write', 'campaign_hexcrawl_log_all', 'campaign_hexcrawl_update']) {
    const start = sql.indexOf(`create policy ${policy} on`);
    assert.ok(start > -1, `${policy} is missing`);
    assert.match(sql.slice(start, sql.indexOf(';', start)), /is_campaign_gm/);
  }
  // The log is the GM's notes: it names what the party walked past unaware.
  assert.ok(!/create policy campaign_hexcrawl_log_select/.test(sql));
});

test('the clock is readable by the whole table, so players see the day and the sky', () => {
  const start = sql.indexOf('create policy campaign_hexcrawl_select on');
  assert.ok(start > -1, 'the clock select policy is missing');
  assert.match(sql.slice(start, sql.indexOf(';', start)), /user_campaign_ids/);
});

test('hex rows replicate in full so deletes reach every viewer', () => {
  assert.match(sql, /alter table public\.map_hex_cells replica identity full/);
  assert.match(sql, /alter publication supabase_realtime add table public\.map_hex_cells/);
});

test('a clock created with the old `meteo` column keeps its weather as `weather`, and re-running changes nothing', async () => {
  const { PGlite } = await import('@electric-sql/pglite');
  const source = readFileSync(new URL('../../../../../supabase/10_hexcrawl.sql', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const start = source.indexOf('do $$\nbegin\n  if exists (');
  const rename = source.slice(start, source.indexOf('end $$;', start) + 'end $$;'.length);
  assert.ok(start > -1 && rename.includes('rename column meteo to weather'));
  const db = new PGlite();
  try {
    await db.exec(`create table public.campaign_hexcrawl (campaign_id int primary key, meteo text, intensity text);
      insert into public.campaign_hexcrawl values (1, 'Rain', 'Heavy');`);
    await db.exec(rename);
    await db.exec(rename);
    const { rows } = await db.query('select weather, intensity from public.campaign_hexcrawl');
    assert.deepEqual(rows, [{ weather: 'Rain', intensity: 'Heavy' }]);
    const columns = await db.query(`select column_name from information_schema.columns
      where table_name = 'campaign_hexcrawl' order by column_name`);
    assert.deepEqual(columns.rows.map((row) => row.column_name), ['campaign_id', 'intensity', 'weather']);
  } finally {
    await db.close();
  }
});
