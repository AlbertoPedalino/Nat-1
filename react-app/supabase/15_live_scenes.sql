-- Which scene each campaign is showing, as a row of its own.
--
-- Run AFTER 06_vtt.sql. Safe to re-run.
--
-- A player's map follows two things: which scene is live, and what that scene
-- looks like. `map_scenes` answers the second. Watching it for the first as
-- well meant every fog stroke and grid tweak reached each player twice — once
-- for the scene they are looking at and once more for "has the live scene
-- changed?". This table answers only that question: one small row per
-- campaign, written by the database whenever `map_scenes.is_live` moves, and
-- by nothing else.
--
-- `map_scenes.is_live` stays the source of truth (RLS for players reads it);
-- this is a projection of it and is never written by a client.

create table if not exists public.campaign_live_scenes (
  campaign_id uuid primary key references public.campaigns(id) on delete cascade,
  -- NULL: the campaign has no live scene right now.
  scene_id    uuid references public.map_scenes(id) on delete set null,
  updated_at  timestamptz not null default now()
);

alter table public.campaign_live_scenes enable row level security;

-- The same people who may follow the campaign's live scene: its members and
-- its GM. No insert/update/delete policy: only the trigger below writes here.
drop policy if exists campaign_live_scenes_select on public.campaign_live_scenes;
create policy campaign_live_scenes_select on public.campaign_live_scenes
  for select using (
    public.is_campaign_gm(campaign_id)
    or campaign_id in (select public.user_campaign_ids())
  );

-- Recompute one campaign's live scene from map_scenes. Idempotent, and a no-op
-- when nothing changed, so a statement touching many rows still produces at
-- most one change here.
create or replace function public.refresh_campaign_live_scene(p_campaign uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  live uuid;
begin
  if p_campaign is null then return; end if;
  -- The campaign itself may be going away in this transaction (cascade).
  if not exists (select 1 from public.campaigns where id = p_campaign) then return; end if;
  select id into live from public.map_scenes
    where campaign_id = p_campaign and is_live
    order by updated_at desc limit 1;
  insert into public.campaign_live_scenes (campaign_id, scene_id, updated_at)
    values (p_campaign, live, now())
  on conflict (campaign_id) do update
    set scene_id = excluded.scene_id, updated_at = excluded.updated_at
    where public.campaign_live_scenes.scene_id is distinct from excluded.scene_id;
end;
$$;

create or replace function public.sync_campaign_live_scene()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.refresh_campaign_live_scene(new.campaign_id);
  elsif tg_op = 'DELETE' then
    perform public.refresh_campaign_live_scene(old.campaign_id);
  else
    perform public.refresh_campaign_live_scene(old.campaign_id);
    if new.campaign_id is distinct from old.campaign_id then
      perform public.refresh_campaign_live_scene(new.campaign_id);
    end if;
  end if;
  return null;
end;
$$;

-- Deferred to commit: set_live_scene clears the old scene and marks the new
-- one in two statements. Evaluated at commit, both firings see the final
-- state, so followers get one change (old → new) and never a blank frame in
-- between.
drop trigger if exists sync_campaign_live_scene on public.map_scenes;
create constraint trigger sync_campaign_live_scene
  after insert or delete or update of is_live, campaign_id on public.map_scenes
  deferrable initially deferred
  for each row execute function public.sync_campaign_live_scene();

-- Databases that already have live scenes.
insert into public.campaign_live_scenes (campaign_id, scene_id)
  select s.campaign_id, s.id from public.map_scenes s
   where s.is_live and exists (select 1 from public.campaigns c where c.id = s.campaign_id)
on conflict (campaign_id) do update set scene_id = excluded.scene_id, updated_at = now()
  where public.campaign_live_scenes.scene_id is distinct from excluded.scene_id;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'campaign_live_scenes'
  ) then
    alter publication supabase_realtime add table public.campaign_live_scenes;
  end if;
end $$;
