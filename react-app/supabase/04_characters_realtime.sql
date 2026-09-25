-- ============================================================================
-- GM Board — Character sheets and Realtime. Run this AFTER 01_schema.sql. Safe to re-run.
-- SQL Editor > New query > paste all > Run.
--
-- `characters` is REST/RPC only: it is NOT in the `supabase_realtime`
-- publication. Subscribing to it would push the whole sheet blob on every
-- autosave. Instead, clients follow two light projections kept by the database:
--   - character_digests (16_character_digests.sql): roster facts, vitals and
--     the max-HP input hash, for the battle map, the encounter builder and
--     every open sheet's vitals;
--   - character_sheet_revisions (17_character_sheet_revisions.sql): only "the
--     sheet's content changed", for an open sheet to know when to re-read it.
-- Earlier versions of this script added `characters` to the publication; the
-- block below takes it out of an existing database and is a no-op otherwise.
--
-- Character health (HP, temp HP, death saves, conditions) is written only
-- through commit_character_vitals in 13_character_vitals.sql. The former
-- patch_character_data RPC is retired: it is dropped here so existing
-- databases do not keep an unused write path.
-- ============================================================================

drop function if exists public.patch_character_data(text, jsonb);

do $$
begin
  if exists (
    select 1
      from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'characters'
  ) then
    alter publication supabase_realtime drop table public.characters;
  end if;
end;
$$;
