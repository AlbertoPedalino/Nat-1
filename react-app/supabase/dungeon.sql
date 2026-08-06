-- The dungeon key: the floor plan of a generated map and what is in each room.
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
  -- The plan as the generator exported it, already read into rooms, corridors
  -- and doors, in the plan's own cells.
  plan        jsonb not null,
  -- The scene square that the plan's own cell (0, 0) sits on, so a room in the
  -- file is a place on the board: { col, row }.
  origin      jsonb not null default '{"col":0,"row":0}'::jsonb,
  -- What the rooms hold, rolled by the GM Board's own dungeon engine. Null
  -- until the GM asks for it — a map may be imported to be drawn on and never
  -- populated at all.
  key         jsonb,
  -- Which rooms have already had their monsters put on the board, so a second
  -- press does not double them: { "room_3": ["token-id", …] }.
  placed      jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

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
