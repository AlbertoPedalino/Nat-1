-- ============================================================================
-- One-off data cleanup: remove the optional-feature catalog from stored sheets.
--
-- NOT part of the numbered setup sequence. Run it once, in the SQL Editor,
-- only AFTER:
--   1. the frontend that no longer saves `optionalFeatureEntries` is deployed;
--   2. 16_character_digests.sql has been re-run (the key is ignored by hpBasis);
--   3. 13_character_vitals.sql has been re-run (the database strips the key on
--      every INSERT/UPDATE, so no older tab can bring it back).
-- Best run outside a play session.
--
-- `optionalFeatureEntries` is the same ~31 KB catalog in every row, rebuilt by
-- the sheet on every open; no choice of the player is in it. Safe to re-run:
-- the WHERE clause only touches rows that still carry the key.
--
-- What each cleaned row goes through (13/16 triggers): vitals are preserved,
-- row_revision advances by one and updated_at moves (read-only viewers follow
-- that like any change); hpBasis ignores the key, so the character digest does
-- not change and no follower re-reads the sheet.
-- ============================================================================

-- Optional backup (the catalog is derived data; reproducible from 5etools).
create table if not exists public.characters_optional_features_backup as
  select id, data->'optionalFeatureEntries' as entries
    from public.characters
   where data ? 'optionalFeatureEntries';
-- No policies: the API cannot read it (only the SQL Editor). Drop it when done.
alter table public.characters_optional_features_backup enable row level security;

update public.characters
   set data = data - 'optionalFeatureEntries'
 where data ? 'optionalFeatureEntries';

-- Check: expected 0.
select count(*) as rows_still_carrying_catalog
  from public.characters
 where data ? 'optionalFeatureEntries';
