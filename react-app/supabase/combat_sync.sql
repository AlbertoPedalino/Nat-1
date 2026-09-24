-- ============================================================================
-- GM Board — Live character sheets. Run this AFTER schema.sql. Safe to re-run.
-- SQL Editor > New query > paste all > Run.
--
-- Adds `characters` to Supabase Realtime so open sheets, the encounter builder
-- and the battle map see each other's changes. RLS still decides which rows
-- each connected client receives.
--
-- Character health (HP, temp HP, death saves, conditions) is written only
-- through commit_character_vitals in character_vitals.sql. The former
-- patch_character_data RPC is retired: it is dropped here so existing
-- databases do not keep an unused write path.
-- ============================================================================

drop function if exists public.patch_character_data(text, jsonb);

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
