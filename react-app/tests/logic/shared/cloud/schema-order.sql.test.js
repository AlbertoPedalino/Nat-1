import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

// The documented setup order (CLOUD_SETUP.md, section 2).
const ORDER = [
  'schema.sql', 'sections.sql', 'campaigns.sql', 'combat_sync.sql', 'character-art.sql',
  'vtt.sql', 'atmosphere.sql', 'encounter_fights.sql', 'dungeon.sql', 'hexcrawl.sql',
  'campaign_tools.sql', 'rolls.sql', 'character_vitals.sql', 'encounter_fight_vitals.sql',
];
const DIR = new URL('../../../../supabase/', import.meta.url);

// Minimal stand-ins for the schemas Supabase provides.
const SUPABASE_STUBS = `
  create role authenticated; create role anon; create role service_role;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text,
    raw_user_meta_data jsonb default '{}'::jsonb, raw_app_meta_data jsonb default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean default false);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text,
    name text, owner uuid, metadata jsonb);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as
    $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  create schema realtime;
  create table realtime.messages (id bigserial primary key, topic text, extension text,
    payload jsonb, event text, private boolean);
  alter table realtime.messages enable row level security;
  create function realtime.topic() returns text language sql stable as
    $$ select current_setting('test.topic', true) $$;
  create publication supabase_realtime;
`;

// Tables the frontend subscribes to with postgres_changes.
const REALTIME_TABLES = [
  'campaign_hexcrawl', 'characters', 'encounter_fights', 'map_drawings',
  'map_hex_cells', 'map_scenes', 'map_token_secrets', 'map_tokens',
];

test('every Supabase script is listed and the documented order builds the schema twice', async () => {
  const files = (await readdir(DIR)).filter((name) => name.endsWith('.sql')).sort();
  assert.deepEqual(files, [...ORDER].sort(), 'a new .sql file must be added to the setup order');

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
