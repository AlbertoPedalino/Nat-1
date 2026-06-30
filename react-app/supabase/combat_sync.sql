-- ============================================================================
-- GM Board — Encounter combat sync add-on. Run this AFTER schema.sql.
-- SQL Editor > New query > paste all > Run.
--
-- Contract: p_patch is a shallow top-level JSON patch. For object-valued keys
-- such as deathSaves, callers must send the complete sub-object.
-- ============================================================================

create or replace function public.patch_character_data(p_id text, p_patch jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  allowed text[] := array['currentHP','tempHP','deathSaves'];
  clean jsonb;
begin
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into clean
  from jsonb_each(p_patch)
  where key = any(allowed);

  if clean = '{}'::jsonb then
    return;
  end if;

  update public.characters
     set data = data || clean,
         updated_at = now()
   where id = p_id;
end;
$$;

-- Enable Supabase Realtime for live sheet -> encounter combat updates.
-- RLS still decides which character rows each connected client can receive.
do $$
begin
  if exists (
    select 1
      from pg_publication
     where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
      from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'characters'
  ) then
    alter publication supabase_realtime add table public.characters;
  end if;
end;
$$;
