// Minimal stand-ins for the schemas Supabase provides, shared by the SQL
// suites that build the whole numbered schema in PGlite.
export const SUPABASE_STUBS = `
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
