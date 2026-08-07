-- The dungeon key: what is in each room of the dungeon this map is being played
-- as. Rolled on the GM Board's own tables, from a room count the GM chooses —
-- no floor plan is read, so this works the same for a generated dungeon, a
-- cave, a dwelling and a map drawn by hand.
--
-- A table of its own rather than a column on map_scenes, and the reason is the
-- policy above it: a player may select the live scene row — they need its
-- picture, its grid and its fog — so anything kept there is read by the whole
-- table. The key is every trap, every encounter and every hoard on the map. It
-- is the GM's alone, and it says so in the only place that can enforce it.
--
-- One row per scene, written whole. Only the GM writes it, so there is no
-- second writer to overwrite, which is what makes a blob safe here and not for
-- tokens.

create table if not exists public.map_dungeons (
  scene_id    uuid primary key references public.map_scenes(id) on delete cascade,
  -- { id, createdAt, config, rooms: [{ id, index, popLabel, slots, loot, … }] }
  key         jsonb,
  -- Which room has been sent to the Encounter Builder, and as which fight, so
  -- the pieces dragged onto the map can be tied to the combat that is already
  -- tracking them: { "room_3": { instanceId, fightId } }.
  fights      jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- An earlier shape of this table carried the imported floor plan and required
-- it. Reading plans was dropped: it worked for one export of one generator and
-- for none of the others, and the room count is a number the GM knows.
alter table public.map_dungeons drop column if exists plan;
alter table public.map_dungeons drop column if exists origin;
alter table public.map_dungeons drop column if exists placed;
alter table public.map_dungeons add column if not exists fights jsonb not null default '{}'::jsonb;

drop trigger if exists map_dungeons_touch on public.map_dungeons;
create trigger map_dungeons_touch before update on public.map_dungeons
  for each row execute function public.touch_updated_at();

alter table public.map_dungeons enable row level security;

-- GM only, all four verbs. There is deliberately no player-readable half: a
-- room's contents are a secret until the party is standing in it, and the
-- pieces the GM puts on the board are what the players get to see.
drop policy if exists map_dungeons_all on public.map_dungeons;
create policy map_dungeons_all on public.map_dungeons
  for all using (public.is_campaign_gm(public.map_scene_campaign(scene_id)))
  with check (public.is_campaign_gm(public.map_scene_campaign(scene_id)));
