-- Temporary hit points and a maximum's bonus for pieces without an encounter.
--
-- Run AFTER 14_token_vitals.sql. Safe to re-run.
--
-- The GM manages a piece's hit points from its menu on the map. A character's
-- live on their sheet and an encounter creature's in its fight combatant
-- (`tempHP`, `maxHPBonus`), both already. A piece with neither keeps its hit
-- points in `map_token_secrets`; this adds beside them its temporary ones and
-- how far its maximum was stepped from the one last typed (`hp_max_bonus`),
-- GM-only under the same RLS and Realtime. Nothing is projected onto the
-- public row.

alter table public.map_token_secrets add column if not exists hp_temp integer;
alter table public.map_token_secrets add column if not exists hp_max_bonus integer;
