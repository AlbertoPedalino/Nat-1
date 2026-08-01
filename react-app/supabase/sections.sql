-- ============================================================================
-- GM Board — personal cloud sections (run after schema.sql)
-- Safe to re-run. These documents are owner-only; global GM access is excluded.
-- ============================================================================

create table if not exists public.boards (
  id             text primary key,
  owner          uuid not null references auth.users(id) on delete cascade,
  owner_username text,
  name           text,
  data           jsonb not null,
  updated_at     timestamptz not null default now()
);

create table if not exists public.encounters (
  id             text primary key,
  owner          uuid not null references auth.users(id) on delete cascade,
  owner_username text,
  name           text,
  data           jsonb not null,
  updated_at     timestamptz not null default now()
);

create table if not exists public.dm_screens (
  id             text primary key,
  owner          uuid not null references auth.users(id) on delete cascade,
  owner_username text,
  name           text,
  data           jsonb not null,
  updated_at     timestamptz not null default now()
);

create index if not exists boards_owner_idx on public.boards(owner);
create index if not exists encounters_owner_idx on public.encounters(owner);
create index if not exists dm_screens_owner_idx on public.dm_screens(owner);

alter table public.boards enable row level security;
alter table public.encounters enable row level security;
alter table public.dm_screens enable row level security;

drop policy if exists boards_select on public.boards;
create policy boards_select on public.boards
  for select using (owner = auth.uid());

drop policy if exists boards_insert_own on public.boards;
create policy boards_insert_own on public.boards
  for insert with check (owner = auth.uid());

drop policy if exists boards_update_own on public.boards;
create policy boards_update_own on public.boards
  for update using (owner = auth.uid())
  with check (owner = auth.uid());

drop policy if exists boards_delete_own on public.boards;
create policy boards_delete_own on public.boards
  for delete using (owner = auth.uid());

drop policy if exists encounters_select on public.encounters;
create policy encounters_select on public.encounters
  for select using (owner = auth.uid());

drop policy if exists encounters_insert_own on public.encounters;
create policy encounters_insert_own on public.encounters
  for insert with check (owner = auth.uid());

drop policy if exists encounters_update_own on public.encounters;
create policy encounters_update_own on public.encounters
  for update using (owner = auth.uid())
  with check (owner = auth.uid());

drop policy if exists encounters_delete_own on public.encounters;
create policy encounters_delete_own on public.encounters
  for delete using (owner = auth.uid());

drop policy if exists dm_screens_select on public.dm_screens;
create policy dm_screens_select on public.dm_screens
  for select using (owner = auth.uid());

drop policy if exists dm_screens_insert_own on public.dm_screens;
create policy dm_screens_insert_own on public.dm_screens
  for insert with check (owner = auth.uid());

drop policy if exists dm_screens_update_own on public.dm_screens;
create policy dm_screens_update_own on public.dm_screens
  for update using (owner = auth.uid())
  with check (owner = auth.uid());

drop policy if exists dm_screens_delete_own on public.dm_screens;
create policy dm_screens_delete_own on public.dm_screens
  for delete using (owner = auth.uid());
