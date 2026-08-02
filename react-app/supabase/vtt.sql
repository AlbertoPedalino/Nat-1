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
-- ============================================================================

-- 1) HELPERS ------------------------------------------------------------------
-- SECURITY DEFINER so policies can look past RLS without recursing.

create or replace function public.is_campaign_gm(p_campaign uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.campaigns where id = p_campaign and gm = auth.uid()
  );
$$;

create or replace function public.map_scene_campaign(p_scene uuid)
returns uuid
language sql security definer stable set search_path = public
as $$
  select campaign_id from public.map_scenes where id = p_scene;
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
  image_path  text,
  -- { size, offsetX, offsetY, visible } — grid calibration is client-side.
  grid        jsonb not null default '{"size":70,"offsetX":0,"offsetY":0,"visible":true}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.map_tokens (
  id           uuid primary key default gen_random_uuid(),
  scene_id     uuid not null references public.map_scenes(id) on delete cascade,
  -- 'gm' is the hidden layer; RLS keys off this value.
  layer        text not null default 'tokens' check (layer in ('map', 'tokens', 'gm')),
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
  image_path   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists map_scenes_campaign_idx on public.map_scenes(campaign_id);
create index if not exists map_tokens_scene_idx on public.map_tokens(scene_id);
create index if not exists map_tokens_scene_layer_idx on public.map_tokens(scene_id, layer);
create index if not exists map_tokens_character_idx on public.map_tokens(character_id);

drop trigger if exists map_scenes_touch on public.map_scenes;
create trigger map_scenes_touch before update on public.map_scenes
  for each row execute function public.touch_updated_at();

drop trigger if exists map_tokens_touch on public.map_tokens;
create trigger map_tokens_touch before update on public.map_tokens
  for each row execute function public.touch_updated_at();

-- 3) ROW LEVEL SECURITY -------------------------------------------------------

alter table public.map_scenes enable row level security;
alter table public.map_tokens enable row level security;

-- Scenes: every campaign member reads them, only the campaign GM writes.
drop policy if exists map_scenes_select on public.map_scenes;
create policy map_scenes_select on public.map_scenes
  for select using (campaign_id in (select public.user_campaign_ids()));

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

-- Tokens: members read the scene's tokens, EXCEPT the GM layer.
drop policy if exists map_tokens_select on public.map_tokens;
create policy map_tokens_select on public.map_tokens
  for select using (
    public.map_scene_campaign(scene_id) in (select public.user_campaign_ids())
    and (
      layer <> 'gm'
      or public.is_campaign_gm(public.map_scene_campaign(scene_id))
    )
  );

-- Only the GM adds or removes tokens; players just move their own.
drop policy if exists map_tokens_insert on public.map_tokens;
create policy map_tokens_insert on public.map_tokens
  for insert with check (public.is_campaign_gm(public.map_scene_campaign(scene_id)));

drop policy if exists map_tokens_delete on public.map_tokens;
create policy map_tokens_delete on public.map_tokens
  for delete using (public.is_campaign_gm(public.map_scene_campaign(scene_id)));

-- A player may update a token only while it stands for one of their own
-- characters. The identical WITH CHECK is what stops them from promoting it to
-- the GM layer or reassigning it to somebody else's sheet: the row they are
-- writing has to satisfy the same predicate as the row they read.
drop policy if exists map_tokens_update on public.map_tokens;
create policy map_tokens_update on public.map_tokens
  for update using (
    public.is_campaign_gm(public.map_scene_campaign(scene_id))
    or (
      layer <> 'gm'
      and character_id is not null
      and public.owns_character(character_id)
    )
  )
  with check (
    public.is_campaign_gm(public.map_scene_campaign(scene_id))
    or (
      layer <> 'gm'
      and character_id is not null
      and public.owns_character(character_id)
    )
  );

-- 4) REALTIME -----------------------------------------------------------------
-- Token rows are streamed to open scenes. RLS still applies to realtime, so a
-- player never receives GM-layer changes.
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
end
$$;

-- 5) STORAGE ------------------------------------------------------------------
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
