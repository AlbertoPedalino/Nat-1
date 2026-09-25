import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { SUPABASE_STUBS } from './supabaseStubs.js';

// The setup order is the file names: a two-digit prefix, run in name order
// (CLOUD_SETUP.md, section 2).
const DIR = new URL('../../../../supabase/', import.meta.url);


// Tables the frontend subscribes to with postgres_changes.
const REALTIME_TABLES = [
  'campaign_hexcrawl', 'campaign_live_scenes', 'character_digests', 'character_sheet_revisions', 'encounter_fights',
  'map_drawings', 'map_hex_cells', 'map_scenes', 'map_token_secrets', 'map_tokens',
];

test('every Supabase script is listed and the documented order builds the schema twice', async () => {
  const ORDER = (await readdir(DIR)).filter((name) => name.endsWith('.sql')).sort();
  const unnumbered = ORDER.filter((name) => !/^\d{2}_[a-z0-9_]+\.sql$/.test(name));
  assert.deepEqual(unnumbered, [], 'every script needs a two-digit order prefix and a snake_case name');
  const numbers = ORDER.map((name) => Number(name.slice(0, 2)));
  assert.deepEqual(numbers, numbers.map((_, index) => index + 1), 'order prefixes must be 01, 02, … without gaps or repeats');
  const documented = await readFile(new URL('../CLOUD_SETUP.md', DIR), 'utf8');
  for (const name of ORDER) assert.ok(documented.includes(name), `${name} is missing from CLOUD_SETUP.md`);

  const db = new PGlite();
  try {
    await db.exec(SUPABASE_STUBS);
    for (const pass of [1, 2]) {
      for (const file of ORDER) {
        await assert.doesNotReject(
          db.exec(await readFile(new URL(file, DIR), 'utf8')),
          `${file} fails on pass ${pass}`,
        );
      }
    }
    const rows = async (sql) => (await db.query(sql)).rows;

    const published = (await rows(`select tablename from pg_publication_tables
      where pubname = 'supabase_realtime' order by 1`)).map((row) => row.tablename);
    for (const table of REALTIME_TABLES) assert.ok(published.includes(table), `${table} is not in Realtime`);

    const unprotected = await rows(`select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
        and (not c.relrowsecurity
          or not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname))`);
    assert.deepEqual(unprotected, [], 'every public table needs RLS and at least one policy');

    const retired = await rows(`select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and proname in ('patch_character_data')`);
    assert.deepEqual(retired, []);
    assert.equal((await rows("select to_regclass('public.character_vital_operations') as t"))[0].t, null);

    const markRpcs = await rows(`select proname, count(*)::int as n from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and proname in ('set_token_conditions', 'set_token_effects') group by 1 order by 1`);
    assert.deepEqual(markRpcs, [{ proname: 'set_token_conditions', n: 1 }, { proname: 'set_token_effects', n: 1 }]);
  } finally { await db.close(); }
});
