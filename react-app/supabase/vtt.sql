-- ============================================================================
-- GM Board — Virtual tabletop (maps + tokens). Run AFTER schema.sql and
-- campaigns.sql. Safe to re-run.
-- SQL Editor > New query > paste all > Run.
--
-- Unlike boards/encounters/dm_screens, this feature is cloud-only: there is no
-- local copy and no JSON payload column. A scene belongs to a CAMPAIGN, and
-- every token is its own row so two people moving pieces cannot overwrite each
-- other (a single jsonb scene would be last-writer-wins).
--
-- The GM-only layer is enforced here, not in the client: secret tokens are rows
-- with layer='gm' that RLS never returns to a player. Hiding them in the UI
-- would leave them readable in the network response.
--
-- Fog of war is NOT a security boundary: the map image is delivered whole to
-- every member and the fog is drawn client-side, so a determined player can
-- read the image out of the network tab. Hiding map content for real would take
-- server-side tiling. Secret *tokens* are the thing that is genuinely hidden.
-- ============================================================================

-- 1) HELPERS THAT DO NOT TOUCH THE NEW TABLES ---------------------------------
-- SECURITY DEFINER so policies can look past RLS without recursing.
--
-- Order matters in this file: a `language sql` body is parsed when the function
-- is created, so anything selecting from map_scenes has to come after the table
-- exists. That helper lives in section 3.

create or replace function public.is_campaign_gm(p_campaign uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.campaigns where id = p_campaign and gm = auth.uid()
  );
$$;

create or replace function public.owns_character(p_character text)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.characters where id = p_character and owner = auth.uid()
  );
$$;

-- Storage object paths start with a campaign id. A malformed path must fail the
-- policy, not raise: a bare `::uuid` cast would error the whole request.
create or replace function public.uuid_or_null(p_value text)
returns uuid
language plpgsql immutable
as $$
begin
  return p_value::uuid;
exception when others then
  return null;
end;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- 2) TABLES -------------------------------------------------------------------

create table if not exists public.map_scenes (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name        text not null default 'Scene',
  -- Two pictures, one shown at a time. The battlemap is the thing with a grid
  -- on it; the background is the establishing shot, the tavern, the painting of
  -- the villain. Keeping both means switching between them without re-uploading.
  image_path       text,
  background_path  text,
  -- Which of the two the table is looking at.
  shown_image      text not null default 'map' check (shown_image in ('map', 'background')),
  -- { size, offsetX, offsetY, visible, snapObjects } — grid calibration is
  -- client-side. `snapObjects` may be absent on scenes made before it existed,
  -- and the client reads a missing key as true: that is what they were built
  -- with. No migration for the same reason.
  grid        jsonb not null default '{"size":70,"offsetX":0,"offsetY":0,"visible":true,"snapObjects":true}'::jsonb,
  -- A tiny seeded description rendered locally by every client. Animation
  -- frames never touch Realtime.
  atmosphere  jsonb not null default '{"type":"none","intensity":0.65,"direction":12,"speed":1,"seed":1}'::jsonb,
  -- Fog of war: { cols, rows, cells } where cells is a base64 bitset, one bit
  -- per grid cell, set = revealed. NULL means the scene has no fog.
  --
  -- A blob is safe here precisely where it was not for tokens: only the GM ever
  -- writes fog, so there is no concurrent writer to overwrite. Per-cell rows
  -- would mean thousands of them per scene for no gain.
  fog         jsonb,
  -- The one scene the players are looking at. Everything else in the campaign
  -- is the GM's workshop and must not reach them at all.
  is_live     boolean not null default false,
  -- { x, y, w, h } in CELLS. Pieces outside it are the GM's staging area and are
  -- never sent to a player. NULL means the whole scene is in play.
  play_area   jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Re-runs on a database created before these columns existed.
alter table public.map_scenes add column if not exists fog jsonb;
alter table public.map_scenes add column if not exists is_live boolean not null default false;
alter table public.map_scenes add column if not exists play_area jsonb;
alter table public.map_scenes add column if not exists background_path text;
alter table public.map_scenes add column if not exists shown_image text not null default 'map';
alter table public.map_scenes add column if not exists atmosphere jsonb not null default '{"type":"none","intensity":0.65,"direction":12,"speed":1,"seed":1}'::jsonb;

-- One live scene per campaign, enforced here rather than by the client: two
-- browsers flipping the switch at once would otherwise both win.
create unique index if not exists map_scenes_one_live_idx
  on public.map_scenes(campaign_id) where is_live;

create table if not exists public.map_tokens (
  id           uuid primary key default gen_random_uuid(),
  scene_id     uuid not null references public.map_scenes(id) on delete cascade,
  -- Layers organise editing. Legacy `gm` rows remain private, while new
  -- visibility changes use hidden_from_players without losing the map layer.
  layer        text not null default 'tokens' check (layer in ('map', 'tokens', 'gm')),
  -- Visibility is separate from the editing layer: hiding scenery must not
  -- turn it into a token when it is revealed again.
  hidden_from_players boolean not null default false,
  x            double precision not null default 0,
  y            double precision not null default 0,
  w            double precision not null default 1,
  h            double precision not null default 1,
  z            integer not null default 0,
  -- Set when the token stands for a campaign character: it is what lets that
  -- player move this token and nobody else's.
  character_id text references public.characters(id) on delete set null,
  label        text,
  color        text,
  -- Two kinds of picture, deliberately separate: image_path is a file in our
  -- private bucket and needs signing, image_url is external art (a bestiary
  -- token) that is fetched as-is. Folding them into one column would mean
  -- guessing which kind a value is on every render.
  image_path   text,
  image_url    text,
  -- Lucide catalog key only. Vector markup and image bytes never enter storage.
  icon_key     text,
  icon_stroke_width double precision not null default 1.8,
  rotation     double precision not null default 0,
  -- Hit points shown on the piece. For a player's piece the character sheet
  -- remains the source of truth and these stay null; for a monster they are the
  -- piece's own state, seeded when it is imported.
  hp_current   integer,
  hp_max       integer,
  -- Off by default: a board covered in bars is noise, and which creatures wear
  -- one is a table-by-table call the GM makes per piece.
  show_hp      boolean not null default false,
  -- Where an imported piece came from: "<instance>:<fight>:<combatant>". One
  -- opaque column rather than three, because nothing in the database ever reads
  -- inside it — the encounter builder is local-first, so only the GM's own
  -- browser can resolve this back to a combatant.
  source_ref   text,
  -- Who put the piece down. A player may move and remove what they placed
  -- themselves, which is what makes "add a marker" usable without handing them
  -- the whole board.
  created_by   uuid default auth.uid(),
  -- Conditions are public at the table: the party can see who is prone.
  conditions   text[] not null default '{}',
  -- Ad-hoc advantage/disadvantage rulings, in the same shape the encounter
  -- builder stores them in, so the two can be kept in step without a
  -- translation layer. Not conditions: a condition is a published rules state,
  -- an effect is one GM's call for one fight.
  effects      jsonb not null default '[]',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Re-runs on a database created before conditions existed.
alter table public.map_tokens add column if not exists conditions text[] not null default '{}';
alter table public.map_tokens add column if not exists image_url text;
alter table public.map_tokens add column if not exists hp_current integer;
alter table public.map_tokens add column if not exists hp_max integer;
alter table public.map_tokens add column if not exists source_ref text;
alter table public.map_tokens add column if not exists show_hp boolean not null default false;
alter table public.map_tokens add column if not exists created_by uuid default auth.uid();
alter table public.map_tokens add column if not exists effects jsonb not null default '[]';
alter table public.map_tokens add column if not exists icon_key text;
alter table public.map_tokens add column if not exists icon_stroke_width double precision not null default 1.8;
alter table public.map_tokens add column if not exists rotation double precision not null default 0;
alter table public.map_tokens add column if not exists hidden_from_players boolean not null default false;

-- A GM-only note on a visible piece. It is a separate table for the same reason
-- the hidden layer is a separate row: RLS filters rows, not columns, so a secret
-- kept in map_tokens.label would be delivered to the player and merely hidden by
-- the client.
create table if not exists public.map_token_secrets (
  token_id   uuid primary key references public.map_tokens(id) on delete cascade,
  label      text,
  updated_at timestamptz not null default now()
);

-- Freehand annotation. ONE ROW PER STROKE, not a blob on the scene: undo is a
-- delete of the last row, realtime carries only the new stroke, and nothing has
-- to rewrite a payload that grows all session. This is the opposite call from
-- fog, which is a blob precisely because it is fixed in size and single-writer.
create table if not exists public.map_drawings (
  id         uuid primary key default gen_random_uuid(),
  scene_id   uuid not null references public.map_scenes(id) on delete cascade,
  layer      text not null default 'tokens' check (layer in ('map', 'tokens', 'gm')),
  -- [{x, y}, …] in CELLS, like tokens: recalibrating the grid must not slide the
  -- drawings off the walls they were traced on.
  points     jsonb not null,
  color      text,
  width      double precision not null default 3,
  -- A text note is a stroke with something written on it: same table, so it
  -- inherits the visibility rules, the realtime feed, undo and the eraser
  -- instead of growing a second copy of all four.
  text       text,
  -- Same rule as tokens: you may rub out your own strokes, and only those.
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.map_drawings add column if not exists created_by uuid default auth.uid();
alter table public.map_drawings add column if not exists text text;

create index if not exists map_scenes_campaign_idx on public.map_scenes(campaign_id);
create index if not exists map_drawings_scene_idx on public.map_drawings(scene_id);
create index if not exists map_drawings_scene_created_idx on public.map_drawings(scene_id, created_at);
create index if not exists map_tokens_scene_idx on public.map_tokens(scene_id);
create index if not exists map_tokens_scene_layer_idx on public.map_tokens(scene_id, layer);
create index if not exists map_tokens_scene_visibility_idx
  on public.map_tokens(scene_id, hidden_from_players, layer);
create index if not exists map_tokens_character_idx on public.map_tokens(character_id);
-- The encounter builder writes a creature's hit points into its piece by
-- reference: it knows which combatant changed and has never seen the map, so
-- source_ref is the only handle it has. Partial, because most pieces have none.
create index if not exists map_tokens_source_ref_idx on public.map_tokens(source_ref)
  where source_ref is not null;

drop trigger if exists map_scenes_touch on public.map_scenes;
create trigger map_scenes_touch before update on public.map_scenes
  for each row execute function public.touch_updated_at();

drop trigger if exists map_tokens_touch on public.map_tokens;
create trigger map_tokens_touch before update on public.map_tokens
  for each row execute function public.touch_updated_at();

drop trigger if exists map_token_secrets_touch on public.map_token_secrets;
create trigger map_token_secrets_touch before update on public.map_token_secrets
  for each row execute function public.touch_updated_at();

-- 3) HELPERS THAT READ THE NEW TABLES -----------------------------------------
-- Defined here, after the tables: a `language sql` body referencing a missing
-- relation fails at creation time.

create or replace function public.map_scene_campaign(p_scene uuid)
returns uuid
language sql security definer stable set search_path = public
as $$
  select campaign_id from public.map_scenes where id = p_scene;
$$;

create or replace function public.map_scene_is_live(p_scene uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select coalesce((select is_live from public.map_scenes where id = p_scene), false);
$$;

-- Whether a piece stands inside the part of the scene that is in play.
--
-- The rule is deliberately the token's ORIGIN cell, not its whole footprint: a
-- creature straddling the boundary has to be either in or out, and "the square
-- it is standing on" is the one a GM can predict without counting.
create or replace function public.map_token_in_play(p_scene uuid, p_x double precision, p_y double precision)
returns boolean
language sql security definer stable set search_path = public
as $$
  select case
    when area is null then true
    else p_x >= (area->>'x')::double precision
     and p_y >= (area->>'y')::double precision
     and p_x <  (area->>'x')::double precision + (area->>'w')::double precision
     and p_y <  (area->>'y')::double precision + (area->>'h')::double precision
  end
  from (select play_area as area from public.map_scenes where id = p_scene) scene;
$$;

create or replace function public.map_token_campaign(p_token uuid)
returns uuid
language sql security definer stable set search_path = public
as $$
  select s.campaign_id
  from public.map_tokens t
  join public.map_scenes s on s.id = t.scene_id
  where t.id = p_token;
$$;

-- 4) ROW LEVEL SECURITY -------------------------------------------------------

alter table public.map_scenes enable row level security;
alter table public.map_tokens enable row level security;
alter table public.map_token_secrets enable row level security;
alter table public.map_drawings enable row level security;

-- Drawings follow the token rules: the GM's own layer never reaches a player,
-- and only the live scene is readable at all. Only the GM draws.
drop policy if exists map_drawings_select on public.map_drawings;
create policy map_drawings_select on public.map_drawings
  for select using (
    public.is_campaign_gm(public.map_scene_campaign(scene_id))
    or (
      layer <> 'gm'
      and public.map_scene_is_live(scene_id)
      and public.map_scene_campaign(scene_id) in (select public.user_campaign_ids())
    )
  );

-- Everyone at the table can draw: circling a suspicious flagstone is as much a
-- player's move as the GM's. A player only ever adds to the live scene, never on
-- the GM layer, and always stamped as theirs.
drop policy if exists map_drawings_write on public.map_drawings;
drop policy if exists map_drawings_insert on public.map_drawings;
create policy map_drawings_insert on public.map_drawings
  for insert with check (
    public.is_campaign_gm(public.map_scene_campaign(scene_id))
    or (
      layer <> 'gm'
      and created_by = auth.uid()
      and public.map_scene_is_live(scene_id)
      and public.map_scene_campaign(scene_id) in (select public.user_campaign_ids())
    )
  );

-- Marks can be picked up and moved, which is an update rather than a new row:
-- a stroke keeps its identity, so everyone watching sees the same one move
-- instead of one vanishing and another appearing. Same rule as rubbing out —
-- the GM anything, a player only their own.
drop policy if exists map_drawings_update on public.map_drawings;
create policy map_drawings_update on public.map_drawings
  for update using (
    public.is_campaign_gm(public.map_scene_campaign(scene_id))
    or (
      layer <> 'gm'
      and created_by = auth.uid()
      and public.map_scene_is_live(scene_id)
      and public.map_scene_campaign(scene_id) in (select public.user_campaign_ids())
    )
  )
  with check (
    public.is_campaign_gm(public.map_scene_campaign(scene_id))
    or (
      layer <> 'gm'
      and created_by = auth.uid()
      and public.map_scene_is_live(scene_id)
      and public.map_scene_campaign(scene_id) in (select public.user_campaign_ids())
    )
  );

-- The GM can clear anything; a player rubs out only their own strokes, or the
-- undo button would become a way to wipe the GM's annotations.
drop policy if exists map_drawings_delete on public.map_drawings;
create policy map_drawings_delete on public.map_drawings
  for delete using (
    public.is_campaign_gm(public.map_scene_campaign(scene_id))
    or (
      layer <> 'gm'
      and created_by = auth.uid()
      and public.map_scene_is_live(scene_id)
      and public.map_scene_campaign(scene_id) in (select public.user_campaign_ids())
    )
  );

-- Secret labels: the campaign GM, nobody else, in every direction.
drop policy if exists map_token_secrets_all on public.map_token_secrets;
create policy map_token_secrets_all on public.map_token_secrets
  for all using (public.is_campaign_gm(public.map_token_campaign(token_id)))
  with check (public.is_campaign_gm(public.map_token_campaign(token_id)));

-- Scenes: the GM sees the whole campaign, a player sees only the live one.
-- Non-live scenes are the GM's preparation and never leave the server.
drop policy if exists map_scenes_select on public.map_scenes;
create policy map_scenes_select on public.map_scenes
  for select using (
    public.is_campaign_gm(campaign_id)
    or (is_live and campaign_id in (select public.user_campaign_ids()))
  );

drop policy if exists map_scenes_insert on public.map_scenes;
create policy map_scenes_insert on public.map_scenes
  for insert with check (public.is_campaign_gm(campaign_id));

drop policy if exists map_scenes_update on public.map_scenes;
create policy map_scenes_update on public.map_scenes
  for update using (public.is_campaign_gm(campaign_id))
  with check (public.is_campaign_gm(campaign_id));

drop policy if exists map_scenes_delete on public.map_scenes;
create policy map_scenes_delete on public.map_scenes
  for delete using (public.is_campaign_gm(campaign_id));

-- Tokens: the GM reads everything in their campaigns. A player reads the pieces
-- of the live scene only, never the GM layer, and never what is staged outside
-- the play area — the ambush waiting off the edge of the map is as much a secret
-- as the hidden layer, and is kept one the same way.
drop policy if exists map_tokens_select on public.map_tokens;
create policy map_tokens_select on public.map_tokens
  for select using (
    public.is_campaign_gm(public.map_scene_campaign(scene_id))
    or (
      layer <> 'gm'
      and not hidden_from_players
      and public.map_scene_is_live(scene_id)
      and public.map_token_in_play(scene_id, x, y)
      and public.map_scene_campaign(scene_id) in (select public.user_campaign_ids())
    )
  );

-- The GM places anything. A player may put down their own character's piece and
-- plain markers on the live scene — never on the GM layer, never standing for
-- somebody else's sheet, and always stamped as theirs.
drop policy if exists map_tokens_insert on public.map_tokens;
create policy map_tokens_insert on public.map_tokens
  for insert with check (
    public.is_campaign_gm(public.map_scene_campaign(scene_id))
    or (
      layer <> 'gm'
      and not hidden_from_players
      and created_by = auth.uid()
      and public.map_scene_is_live(scene_id)
      and public.map_scene_campaign(scene_id) in (select public.user_campaign_ids())
      and (character_id is null or public.owns_character(character_id))
    )
  );

-- Removing follows placing: a player can pick up what they put down, and
-- nothing else.
drop policy if exists map_tokens_delete on public.map_tokens;
create policy map_tokens_delete on public.map_tokens
  for delete using (
    public.is_campaign_gm(public.map_scene_campaign(scene_id))
    or (
      layer <> 'gm'
      and not hidden_from_players
      and created_by = auth.uid()
      and public.map_scene_is_live(scene_id)
      and public.map_token_in_play(scene_id, x, y)
      and public.map_scene_campaign(scene_id) in (select public.user_campaign_ids())
    )
  );

-- A player may move a piece that stands for one of their own characters, or one
-- they placed themselves. The identical WITH CHECK is what stops them from
-- promoting it to the GM layer, reassigning it to somebody else's sheet, or
-- stamping it as another player's: the row they are writing has to satisfy the
-- same predicate as the row they read.
--
-- Enemies are deliberately NOT covered here. Conditions on someone else's piece
-- go through set_token_conditions, because a policy wide enough to let a player
-- mark an enemy would also let them drag it across the room.
drop policy if exists map_tokens_update on public.map_tokens;
create policy map_tokens_update on public.map_tokens
  for update using (
    public.is_campaign_gm(public.map_scene_campaign(scene_id))
    or (
      layer <> 'gm'
      and not hidden_from_players
      and public.map_scene_is_live(scene_id)
      and public.map_token_in_play(scene_id, x, y)
      and public.map_scene_campaign(scene_id) in (select public.user_campaign_ids())
      and (
        (character_id is not null and public.owns_character(character_id))
        or created_by = auth.uid()
      )
    )
  )
  with check (
    public.is_campaign_gm(public.map_scene_campaign(scene_id))
    or (
      layer <> 'gm'
      and not hidden_from_players
      and public.map_scene_is_live(scene_id)
      and public.map_token_in_play(scene_id, x, y)
      and public.map_scene_campaign(scene_id) in (select public.user_campaign_ids())
      and (
        (character_id is not null and public.owns_character(character_id))
        or created_by = auth.uid()
      )
    )
  );

-- 4a) MARKING CONDITIONS -------------------------------------------------------
-- Anyone at the table can flag a creature as prone or grappled, including on an
-- enemy. It is an RPC and not a policy because RLS grants a whole row: a policy
-- permissive enough to let a player set a condition on a monster would also let
-- them drag it across the room. This function writes one column and nothing
-- else.

create or replace function public.set_token_conditions(p_token uuid, p_conditions text[])
returns public.map_tokens
language plpgsql security definer set search_path = public
as $$
declare
  token public.map_tokens;
  scene public.map_scenes;
begin
  select * into token from public.map_tokens where id = p_token;
  if token.id is null then
    raise exception 'Token not found';
  end if;
  select * into scene from public.map_scenes where id = token.scene_id;

  -- The GM anywhere in their campaign; a player only on the live scene, and
  -- never on a piece they were never sent in the first place.
  if not (
    public.is_campaign_gm(scene.campaign_id)
    or (
      token.layer <> 'gm'
      and not token.hidden_from_players
      and scene.is_live
      and scene.campaign_id in (select public.user_campaign_ids())
      and public.map_token_in_play(token.scene_id, token.x, token.y)
    )
  ) then
    raise exception 'Not allowed to mark this token';
  end if;

  update public.map_tokens
    set conditions = coalesce(p_conditions, '{}')
    where id = p_token
    returning * into token;
  return token;
end;
$$;

-- Advantage, disadvantage and the rest are marks too, and they follow the same
-- reasoning: a player calls out that the ogre is at disadvantage as readily as
-- that it is prone, and neither should hand them the ogre to drag around. One
-- column, the same guard.
create or replace function public.set_token_effects(p_token uuid, p_effects jsonb)
returns public.map_tokens
language plpgsql security definer set search_path = public
as $$
declare
  token public.map_tokens;
  scene public.map_scenes;
begin
  select * into token from public.map_tokens where id = p_token;
  if token.id is null then
    raise exception 'Token not found';
  end if;
  select * into scene from public.map_scenes where id = token.scene_id;

  if not (
    public.is_campaign_gm(scene.campaign_id)
    or (
      token.layer <> 'gm'
      and not token.hidden_from_players
      and scene.is_live
      and scene.campaign_id in (select public.user_campaign_ids())
      and public.map_token_in_play(token.scene_id, token.x, token.y)
    )
  ) then
    raise exception 'Not allowed to mark this token';
  end if;

  update public.map_tokens
    set effects = coalesce(p_effects, '[]'::jsonb)
    where id = p_token
    returning * into token;
  return token;
end;
$$;

-- 4b) GOING LIVE ---------------------------------------------------------------
-- Clearing the old live scene and setting the new one has to happen in one
-- statement pair inside a transaction: done as two client calls, the unique
-- index rejects the second one whenever the first has not landed yet.

create or replace function public.set_live_scene(p_scene uuid)
returns public.map_scenes
language plpgsql security definer set search_path = public
as $$
declare
  target public.map_scenes;
begin
  select * into target from public.map_scenes where id = p_scene;
  if target.id is null then
    raise exception 'Scene not found';
  end if;
  if not public.is_campaign_gm(target.campaign_id) then
    raise exception 'Only the campaign GM can choose the live scene';
  end if;

  update public.map_scenes
    set is_live = false
    where campaign_id = target.campaign_id and id <> p_scene and is_live;

  update public.map_scenes set is_live = true where id = p_scene returning * into target;
  return target;
end;
$$;

-- Ending the session: the players are left with nothing rather than with
-- whatever scene happened to be open.
create or replace function public.clear_live_scene(p_campaign uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_campaign_gm(p_campaign) then
    raise exception 'Only the campaign GM can end the live scene';
  end if;
  update public.map_scenes set is_live = false where campaign_id = p_campaign and is_live;
end;
$$;

-- 5) REALTIME -----------------------------------------------------------------
-- Token rows are streamed to open scenes. RLS still applies to realtime, so a
-- player never receives GM-layer changes.
-- DELETE events carry only the primary key unless the table replicates the whole
-- old row, and with RLS enabled Realtime cannot decide who may see a delete it
-- cannot inspect — so it sends it to nobody. That is why a removed piece or a
-- rubbed-out stroke vanished for the person who did it and stayed on everyone
-- else's screen. FULL costs a little more WAL per write and is the documented
-- price of delete events under RLS.
alter table public.map_tokens replica identity full;
alter table public.map_drawings replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'map_tokens'
  ) then
    alter publication supabase_realtime add table public.map_tokens;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'map_scenes'
  ) then
    alter publication supabase_realtime add table public.map_scenes;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'map_drawings'
  ) then
    alter publication supabase_realtime add table public.map_drawings;
  end if;
end
$$;

-- 6) STORAGE ------------------------------------------------------------------
-- Private bucket; images are read through signed URLs. Object paths are
-- `<campaign_id>/<scene_id>/<file>`, which is what the policies key off.

insert into storage.buckets (id, name, public)
values ('map-images', 'map-images', false)
on conflict (id) do nothing;

drop policy if exists map_images_select on storage.objects;
create policy map_images_select on storage.objects
  for select using (
    bucket_id = 'map-images'
    and public.uuid_or_null((storage.foldername(name))[1]) in (select public.user_campaign_ids())
  );

drop policy if exists map_images_insert on storage.objects;
create policy map_images_insert on storage.objects
  for insert with check (
    bucket_id = 'map-images'
    and public.is_campaign_gm(public.uuid_or_null((storage.foldername(name))[1]))
  );

drop policy if exists map_images_update on storage.objects;
create policy map_images_update on storage.objects
  for update using (
    bucket_id = 'map-images'
    and public.is_campaign_gm(public.uuid_or_null((storage.foldername(name))[1]))
  );

drop policy if exists map_images_delete on storage.objects;
create policy map_images_delete on storage.objects
  for delete using (
    bucket_id = 'map-images'
    and public.is_campaign_gm(public.uuid_or_null((storage.foldername(name))[1]))
  );
