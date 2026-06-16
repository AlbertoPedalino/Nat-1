-- ============================================================================
-- GM Board — Supabase schema for cloud character sheets
-- Paste this whole file into: Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================================

-- 1) PROFILES: one row per user, holds username + role (player | gm) ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text unique,
  role       text not null default 'player' check (role in ('player', 'gm')),
  created_at timestamptz not null default now()
);

-- Auto-create a profile whenever a new auth user signs up. The username comes
-- from the signUp metadata (options.data.username) sent by the frontend.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: is the current user a GM?  SECURITY DEFINER avoids RLS recursion.
create or replace function public.is_gm()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'gm'
  );
$$;

-- 2) CHARACTERS: the whole sheet JSON, one row per character ------------------
create table if not exists public.characters (
  id             text primary key,            -- reuse the local gb char id
  owner          uuid not null references auth.users(id) on delete cascade,
  owner_username text,
  name           text,
  data           jsonb not null,              -- entire sheet, as-is
  updated_at     timestamptz not null default now()
);

create index if not exists characters_owner_idx on public.characters(owner);

-- 3) ROW LEVEL SECURITY -------------------------------------------------------
alter table public.profiles   enable row level security;
alter table public.characters enable row level security;

-- profiles: a user sees own row; a GM sees all (to show player names)
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_gm());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid());

-- characters: a player reads/writes own rows; a global GM can read/edit/delete
-- everything. Client-side foreign edits update data/name only and never owner.
drop policy if exists characters_select on public.characters;
create policy characters_select on public.characters
  for select using (owner = auth.uid() or public.is_gm());

drop policy if exists characters_insert_own on public.characters;
create policy characters_insert_own on public.characters
  for insert with check (owner = auth.uid());

drop policy if exists characters_update_own on public.characters;
create policy characters_update_own on public.characters
  for update using (owner = auth.uid() or public.is_gm())
  with check (owner = auth.uid() or public.is_gm());

drop policy if exists characters_delete on public.characters;
create policy characters_delete on public.characters
  for delete using (owner = auth.uid() or public.is_gm());

-- ============================================================================
-- 4) AFTER a user registers, promote yourself (the GM) by username:
--      update public.profiles set role = 'gm' where username = 'IL_TUO_NOME';
-- ============================================================================
