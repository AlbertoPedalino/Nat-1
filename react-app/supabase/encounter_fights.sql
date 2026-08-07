-- FIGHTS ----------------------------------------------------------------------
--
-- A fight is the one thing the encounter builder and the battle map both hold,
-- so it is the one thing that cannot live inside either of them.
--
-- Until now it lived in `encounters.data` — the whole instance as one blob,
-- pushed on a timer. Two writers meant the later push replaced the earlier one
-- entire, and a fight the other side had just added went with it. That is not a
-- bug to fix once: it is what a blob does. A row per fight cannot be overwritten
-- by somebody saving something else.
--
-- Party and library stay in the blob for now. They are edited in one place and
-- read there; the fight is the shared object, and it is the one moved out.
--
-- Owner-only, all four verbs. There is deliberately no player-readable half: a
-- fight is the GM's preparation, and what the table sees are the pieces on the
-- board.

create table if not exists public.encounter_fights (
  -- The builder's own fight id, so a piece's `source_ref` on the map keeps
  -- pointing at the same record with nothing to translate.
  id           text primary key,
  instance_id  text not null,
  owner        uuid not null references auth.users(id) on delete cascade,
  name         text,
  -- The library encounter it was launched from — the whole saved record, not
  -- just its id. A fight is only reachable through its library card, and the
  -- library is still a blob in one browser: without this a room sent from one
  -- device would arrive on another as a fight nothing can open.
  encounter_id text,
  encounter    jsonb,
  -- The snapshot the builder restores from: combatants, turn, round.
  fight        jsonb not null,
  updated_at   timestamptz not null default now()
);

create index if not exists encounter_fights_instance_idx
  on public.encounter_fights(instance_id, updated_at desc);
create index if not exists encounter_fights_owner_idx
  on public.encounter_fights(owner);

alter table public.encounter_fights enable row level security;

drop policy if exists encounter_fights_select on public.encounter_fights;
create policy encounter_fights_select on public.encounter_fights
  for select using (owner = auth.uid());

drop policy if exists encounter_fights_insert_own on public.encounter_fights;
create policy encounter_fights_insert_own on public.encounter_fights
  for insert with check (owner = auth.uid());

drop policy if exists encounter_fights_update_own on public.encounter_fights;
create policy encounter_fights_update_own on public.encounter_fights
  for update using (owner = auth.uid())
  with check (owner = auth.uid());

drop policy if exists encounter_fights_delete_own on public.encounter_fights;
create policy encounter_fights_delete_own on public.encounter_fights
  for delete using (owner = auth.uid());

-- Streamed, so a builder open on one screen hears a room arriving from the map
-- on another. RLS applies to realtime too, so this is still owner-only.
--
-- REPLICA IDENTITY FULL: without the old row a delete carries no owner, and
-- Realtime with RLS enabled cannot decide who may be told about it.
alter table public.encounter_fights replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'encounter_fights'
  ) then
    alter publication supabase_realtime add table public.encounter_fights;
  end if;
end $$;
