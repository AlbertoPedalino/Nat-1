-- ============================================================================
-- GM Board — Campaigns add-on. Run this AFTER schema.sql.
-- SQL Editor > New query > paste all > Run.
-- Players in the same campaign can VIEW each other's sheets.
-- Editing is allowed to the owner, a global GM (profiles.role='gm'), or the GM
-- of the sheet's campaign. Join is via an invite code.
-- ============================================================================

-- 1) TABLES -------------------------------------------------------------------
create table if not exists public.campaigns (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  gm         uuid not null references auth.users(id) on delete cascade,
  join_code  text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.campaign_members (
  campaign_id uuid references public.campaigns(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete cascade,
  joined_at   timestamptz not null default now(),
  primary key (campaign_id, user_id)
);

alter table public.characters
  add column if not exists campaign_id uuid references public.campaigns(id) on delete set null;

create index if not exists characters_campaign_idx on public.characters(campaign_id);

-- 2) HELPER: campaign ids the current user belongs to (member OR gm) ----------
-- SECURITY DEFINER so it bypasses RLS and can't cause recursion in policies.
create or replace function public.user_campaign_ids()
returns setof uuid
language sql security definer set search_path = public stable
as $$
  select campaign_id from public.campaign_members where user_id = auth.uid()
  union
  select id from public.campaigns where gm = auth.uid();
$$;

-- 3) RPC: create a campaign (caller becomes GM, gets a unique invite code) -----
create or replace function public.create_campaign(p_name text)
returns public.campaigns
language plpgsql security definer set search_path = public
as $$
declare c public.campaigns; code text;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  loop
    code := upper(substring(md5(random()::text) from 1 for 6));
    begin
      insert into public.campaigns (name, gm, join_code)
      values (coalesce(nullif(trim(p_name), ''), 'Campaign'), auth.uid(), code)
      returning * into c;
      exit;
    exception when unique_violation then
      -- code collision, retry
    end;
  end loop;
  insert into public.campaign_members (campaign_id, user_id)
  values (c.id, auth.uid()) on conflict do nothing;
  return c;
end;
$$;

-- 4) RPC: join a campaign by code ---------------------------------------------
create or replace function public.join_campaign(p_code text)
returns public.campaigns
language plpgsql security definer set search_path = public
as $$
declare c public.campaigns;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into c from public.campaigns where join_code = upper(trim(p_code));
  if c.id is null then raise exception 'Invalid invite code'; end if;
  insert into public.campaign_members (campaign_id, user_id)
  values (c.id, auth.uid()) on conflict do nothing;
  return c;
end;
$$;

-- 5) ROW LEVEL SECURITY -------------------------------------------------------
alter table public.campaigns        enable row level security;
alter table public.campaign_members enable row level security;

-- campaigns: visible to members + gm; only gm mutates
drop policy if exists campaigns_select on public.campaigns;
create policy campaigns_select on public.campaigns
  for select using (id in (select public.user_campaign_ids()));

drop policy if exists campaigns_insert on public.campaigns;
create policy campaigns_insert on public.campaigns
  for insert with check (gm = auth.uid());

drop policy if exists campaigns_modify on public.campaigns;
create policy campaigns_modify on public.campaigns
  for update using (gm = auth.uid());

drop policy if exists campaigns_delete on public.campaigns;
create policy campaigns_delete on public.campaigns
  for delete using (gm = auth.uid());

-- campaign_members: a member sees the roster of their campaigns
drop policy if exists members_select on public.campaign_members;
create policy members_select on public.campaign_members
  for select using (campaign_id in (select public.user_campaign_ids()));

drop policy if exists members_insert_self on public.campaign_members;
create policy members_insert_self on public.campaign_members
  for insert with check (user_id = auth.uid());

drop policy if exists members_delete on public.campaign_members;
create policy members_delete on public.campaign_members
  for delete using (
    user_id = auth.uid()
    or campaign_id in (select id from public.campaigns where gm = auth.uid())
  );

-- 6) Extend CHARACTERS policies for campaign visibility ----------------------
-- View: owner, global GM, OR any member of the sheet's campaign.
drop policy if exists characters_select on public.characters;
create policy characters_select on public.characters
  for select using (
    owner = auth.uid()
    or public.is_gm()
    or (campaign_id is not null and campaign_id in (select public.user_campaign_ids()))
  );

-- Edit: the owner, a global GM (profiles.role='gm'), or the GM of the sheet's
-- campaign. Clients editing someone else's sheet update data/name only (never
-- owner/campaign_id), so the WITH CHECK keeps passing on the unchanged row.
drop policy if exists characters_update_own on public.characters;
create policy characters_update_own on public.characters
  for update using (
    owner = auth.uid()
    or public.is_gm()
    or (campaign_id is not null and campaign_id in (select id from public.campaigns where gm = auth.uid()))
  )
  with check (
    owner = auth.uid()
    or public.is_gm()
    or (campaign_id is not null and campaign_id in (select id from public.campaigns where gm = auth.uid()))
  );
