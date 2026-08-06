-- ============================================================================
-- GM Board — Hexcrawl on the map. Run AFTER campaigns.sql, sections.sql and
-- vtt.sql. Safe to re-run.
-- SQL Editor > New query > paste all > Run.
--
-- This file is the bridge between two things that were built apart: the GM Board
-- (a local-first tool synced as one jsonb blob in `boards`) and the VTT (rows,
-- per campaign, guarded by RLS).
--
-- The split is by WRITE RATE, not by feature:
--
--   boards.data          the d20 tables and the board's own settings. Config.
--                        One writer, whole-payload push, unchanged by this file.
--   campaign_hexcrawl    the clock and the weather. Written every time the party
--                        enters a hex, by the board OR by the map, which is
--                        exactly why it cannot live in the blob: two writers on
--                        one payload is last-writer-wins, and the loser is
--                        whichever screen the GM was not looking at.
--   campaign_hexcrawl_log  one row per entry. Append-only has no contention.
--   map_hex_cells        what each hex IS. One row per hex, like tokens: a click
--                        is one upsert and realtime repaints every viewer.
--
-- The board blob stays owner-only. Players never read it — they read the clock
-- and the hexes that have been revealed to them, which is a different boundary
-- and needs a different table. Fog-of-war's caveat applies here too: an
-- unrevealed hex is genuinely withheld by RLS, but the map IMAGE under it is
-- delivered whole, as it always was.
-- ============================================================================

-- 1) THE BOARD A CAMPAIGN KEEPS ITS TABLES IN ---------------------------------
-- Campaign -> board, not board -> campaign: this direction makes "one hexcrawl
-- board per campaign" a property of the column instead of a partial unique index
-- somebody has to remember. A board with no campaign keeps working alone, which
-- is how the GM Board has always been used.
alter table public.campaigns
  add column if not exists hexcrawl_board_id text
  references public.boards(id) on delete set null;

-- 2) TABLES -------------------------------------------------------------------

-- The travelling clock. One row per campaign: a table has one date and one sky.
create table if not exists public.campaign_hexcrawl (
  campaign_id         uuid primary key references public.campaigns(id) on delete cascade,
  -- Minutes since midnight, and the calendar the board already counts in.
  min                 integer not null default 480,
  day                 integer not null default 1,
  month               integer not null default 1,
  year                integer not null default 1,
  season              text,
  meteo               text,
  intensity           text,
  hours_since_weather double precision not null default 0,
  next_weather_in     double precision not null default 0,
  -- Where the party stands, in the same axial coordinates a token uses.
  party_q             integer,
  party_r             integer,
  -- The scene the hexes belong to. Null until a map is picked, and a deleted
  -- scene must not delete the campaign's calendar with it.
  scene_id            uuid references public.map_scenes(id) on delete set null,
  updated_at          timestamptz not null default now()
);

-- The session log. Append-only, and read by the GM alone: an entry names what
-- the party has not met yet.
create table if not exists public.campaign_hexcrawl_log (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  entry       text not null,
  created_at  timestamptz not null default now()
);

-- What each hex is. Keyed by the hex itself, so entering the same hex twice
-- updates one row instead of growing a history nobody reads.
create table if not exists public.map_hex_cells (
  scene_id   uuid not null references public.map_scenes(id) on delete cascade,
  q          integer not null,
  r          integer not null,
  terrain    text,
  -- 0-5 in the board's tables; kept loose here and validated client-side, the
  -- way the tiers themselves are editable there.
  tier       integer,
  pop        text,
  -- What the GM has marked it as: 'unexplored', 'travelled', 'settled', … The
  -- colour is NOT stored — it is derived from this, so re-theming the map does
  -- not mean rewriting every row.
  status     text not null default 'unexplored',
  note       text,
  -- Revealed hexes are the ones the party has seen. The rest never reach a
  -- player's browser at all.
  revealed   boolean not null default false,
  created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key (scene_id, q, r)
);

create index if not exists campaign_hexcrawl_log_campaign_idx
  on public.campaign_hexcrawl_log(campaign_id, created_at desc);
create index if not exists map_hex_cells_scene_idx on public.map_hex_cells(scene_id);
create index if not exists map_hex_cells_scene_revealed_idx on public.map_hex_cells(scene_id, revealed);
create index if not exists campaigns_hexcrawl_board_idx on public.campaigns(hexcrawl_board_id);

drop trigger if exists campaign_hexcrawl_touch on public.campaign_hexcrawl;
create trigger campaign_hexcrawl_touch before update on public.campaign_hexcrawl
  for each row execute function public.touch_updated_at();

drop trigger if exists map_hex_cells_touch on public.map_hex_cells;
create trigger map_hex_cells_touch before update on public.map_hex_cells
  for each row execute function public.touch_updated_at();

-- 3) RLS ----------------------------------------------------------------------
alter table public.campaign_hexcrawl enable row level security;
alter table public.campaign_hexcrawl_log enable row level security;
alter table public.map_hex_cells enable row level security;

-- The clock is shared knowledge: the party knows what day it is and whether it
-- is raining. Only the GM winds it.
drop policy if exists campaign_hexcrawl_select on public.campaign_hexcrawl;
create policy campaign_hexcrawl_select on public.campaign_hexcrawl
  for select using (campaign_id in (select public.user_campaign_ids()));

drop policy if exists campaign_hexcrawl_insert on public.campaign_hexcrawl;
create policy campaign_hexcrawl_insert on public.campaign_hexcrawl
  for insert with check (public.is_campaign_gm(campaign_id));

drop policy if exists campaign_hexcrawl_update on public.campaign_hexcrawl;
create policy campaign_hexcrawl_update on public.campaign_hexcrawl
  for update using (public.is_campaign_gm(campaign_id))
  with check (public.is_campaign_gm(campaign_id));

drop policy if exists campaign_hexcrawl_delete on public.campaign_hexcrawl;
create policy campaign_hexcrawl_delete on public.campaign_hexcrawl
  for delete using (public.is_campaign_gm(campaign_id));

-- The log is the GM's notes, including the rolls for things the party walked
-- past without noticing. GM only, all four verbs.
drop policy if exists campaign_hexcrawl_log_all on public.campaign_hexcrawl_log;
create policy campaign_hexcrawl_log_all on public.campaign_hexcrawl_log
  for all using (public.is_campaign_gm(campaign_id))
  with check (public.is_campaign_gm(campaign_id));

-- Hexes: the GM sees the whole map. A player sees the revealed hexes of the
-- campaign's live scene, and nothing else — an unrevealed hex is withheld by the
-- database, not merely undrawn by the client.
drop policy if exists map_hex_cells_select on public.map_hex_cells;
create policy map_hex_cells_select on public.map_hex_cells
  for select using (
    public.is_campaign_gm(public.map_scene_campaign(scene_id))
    or (
      revealed
      and public.map_scene_is_live(scene_id)
      and public.map_scene_campaign(scene_id) in (select public.user_campaign_ids())
    )
  );

drop policy if exists map_hex_cells_write on public.map_hex_cells;
create policy map_hex_cells_write on public.map_hex_cells
  for all using (public.is_campaign_gm(public.map_scene_campaign(scene_id)))
  with check (public.is_campaign_gm(public.map_scene_campaign(scene_id)));

-- 4) REALTIME -----------------------------------------------------------------
-- Same reasoning as map_tokens: under RLS a DELETE carries only the primary key
-- unless the whole old row is replicated, and Realtime then sends it to nobody.
alter table public.map_hex_cells replica identity full;
alter table public.campaign_hexcrawl replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'map_hex_cells'
  ) then
    alter publication supabase_realtime add table public.map_hex_cells;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'campaign_hexcrawl'
  ) then
    alter publication supabase_realtime add table public.campaign_hexcrawl;
  end if;
end
$$;
