-- ============================================================================
-- One-off data update: the GM Board's Italian field names become English.
--
--   meteo -> weather     tipo -> type        danno -> damage
--   rarita -> rarity     qualita -> quality  valore -> value
--   gravita -> severity  sole -> clear       pioggia -> rain
--
-- NOT part of the numbered setup sequence. Run it once, in the SQL Editor,
-- right AFTER:
--   1. the frontend that reads the English names is deployed;
--   2. 10_hexcrawl.sql has been re-run (it renames campaign_hexcrawl.meteo).
-- Best run outside a play session. Safe to re-run: the WHERE clauses only
-- touch rows that still carry an Italian name.
--
-- Where the names live:
--   boards.data      GM Board payloads: each value is a JSON *string*
--                    (state, tables, results), so the keys appear escaped
--                    as \"tipo\": inside the jsonb text.
--   map_dungeons.key generated dungeons on the maps: plain jsonb, "tipo":.
-- Only key names change ("tipo": / \"tipo\":), never a value. No object
-- carries both the Italian and the English name, so nothing collides.
--
-- What each updated row goes through: boards.version moves on (18), so every
-- open GM Board reads the new copy at its next check; map_dungeons.updated_at
-- moves, which the maps follow like any change. A board kept only in one
-- browser (never synced) is not here and keeps the old names: reset its
-- tables from the board if they show empty.
-- ============================================================================

-- Optional backup; drop it when done. No policies: only the SQL Editor reads it.
create table if not exists public.english_data_keys_backup as
  select 'boards'::text as source, id::text as id, data as value
    from public.boards
   where data::text ~ '\\"(meteo|tipo|danno|rarita|qualita|valore|gravita|sole|pioggia)\\":'
  union all
  select 'map_dungeons', scene_id::text, key
    from public.map_dungeons
   where key::text ~ '"(tipo|danno|rarita|qualita|valore|gravita)":';
alter table public.english_data_keys_backup enable row level security;

create or replace function pg_temp.english_keys(source text) returns text
language sql immutable as $$
  select replace(replace(replace(replace(replace(replace(replace(replace(replace(
         replace(replace(replace(replace(replace(replace(replace(replace(replace(source,
    '\"meteo\":',   '\"weather\":'),  '"meteo":',   '"weather":'),
    '\"tipo\":',    '\"type\":'),     '"tipo":',    '"type":'),
    '\"danno\":',   '\"damage\":'),   '"danno":',   '"damage":'),
    '\"rarita\":',  '\"rarity\":'),   '"rarita":',  '"rarity":'),
    '\"qualita\":', '\"quality\":'),  '"qualita":', '"quality":'),
    '\"valore\":',  '\"value\":'),    '"valore":',  '"value":'),
    '\"gravita\":', '\"severity\":'), '"gravita":', '"severity":'),
    '\"sole\":',    '\"clear\":'),    '"sole":',    '"clear":'),
    '\"pioggia\":', '\"rain\":'),     '"pioggia":', '"rain":')
$$;

update public.boards
   set data = pg_temp.english_keys(data::text)::jsonb
 where data::text ~ '\\"(meteo|tipo|danno|rarita|qualita|valore|gravita|sole|pioggia)\\":';

update public.map_dungeons
   set key = pg_temp.english_keys(key::text)::jsonb
 where key::text ~ '"(tipo|danno|rarita|qualita|valore|gravita)":';

-- Check: both counts should be 0.
select
  (select count(*) from public.boards
    where data::text ~ '\\"(meteo|tipo|danno|rarita|qualita|valore|gravita|sole|pioggia)\\":') as boards_left,
  (select count(*) from public.map_dungeons
    where key::text ~ '"(tipo|danno|rarita|qualita|valore|gravita)":') as dungeons_left;
