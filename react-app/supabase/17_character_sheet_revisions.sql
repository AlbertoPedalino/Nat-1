-- The signal that a character sheet's content changed, as a row of its own.
--
-- Run AFTER 13_character_vitals.sql (it reads `characters.sheet_revision`)
-- and 16_character_digests.sql. Safe to re-run.
--
-- Two light projections of a sheet, for two different needs:
--   - character_digests (16): vitals and roster facts, for everyone at the
--     table; changes with hit points.
--   - character_sheet_revisions (here): only "the whole sheet changed", for a
--     view that holds that whole sheet (an open CharacterSheet, editable or
--     read-only); never changes with hit points.
-- A view follows the row of the one character it shows and downloads the sheet
-- only when `sheet_revision` moved past the one it holds. Nobody follows
-- `characters` itself, so no whole row is ever pushed over Realtime.
--
-- One row per character, rewritten only when the revision (or the facts its
-- read policy needs) change; deleted with the character.

create table if not exists public.character_sheet_revisions (
  character_id   text primary key references public.characters(id) on delete cascade,
  campaign_id    uuid,
  owner          uuid,
  sheet_revision bigint not null default 0,
  updated_at     timestamptz not null default now()
);
create index if not exists character_sheet_revisions_campaign on public.character_sheet_revisions(campaign_id);

alter table public.character_sheet_revisions enable row level security;

-- Exactly who may read the sheet: its owner, a global GM, or a member (or the
-- GM) of its campaign. No write policies: only the trigger writes here.
drop policy if exists character_sheet_revisions_select on public.character_sheet_revisions;
create policy character_sheet_revisions_select on public.character_sheet_revisions
  for select using (
    owner = auth.uid()
    or public.is_gm()
    or (campaign_id is not null and campaign_id in (select public.user_campaign_ids()))
  );

create or replace function public.sync_character_sheet_revision()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.character_sheet_revisions (character_id, campaign_id, owner, sheet_revision, updated_at)
  values (new.id, new.campaign_id, new.owner, coalesce(new.sheet_revision, 0), now())
  on conflict (character_id) do update
    set campaign_id = excluded.campaign_id,
        owner = excluded.owner,
        sheet_revision = excluded.sheet_revision,
        updated_at = excluded.updated_at
    -- A health command, a no-op or anything else that leaves these alone
    -- writes nothing here, so nobody following the table hears about it.
    where (public.character_sheet_revisions.sheet_revision, public.character_sheet_revisions.campaign_id,
           public.character_sheet_revisions.owner)
      is distinct from (excluded.sheet_revision, excluded.campaign_id, excluded.owner);
  return null;
end;
$$;

drop trigger if exists sync_character_sheet_revision on public.characters;
create trigger sync_character_sheet_revision
  after insert or update on public.characters
  for each row execute function public.sync_character_sheet_revision();

-- Existing sheets.
insert into public.character_sheet_revisions (character_id, campaign_id, owner, sheet_revision)
  select c.id, c.campaign_id, c.owner, coalesce(c.sheet_revision, 0)
    from public.characters c
on conflict (character_id) do update
  set campaign_id = excluded.campaign_id, owner = excluded.owner,
      sheet_revision = excluded.sheet_revision, updated_at = now()
  where (public.character_sheet_revisions.sheet_revision, public.character_sheet_revisions.campaign_id,
         public.character_sheet_revisions.owner)
    is distinct from (excluded.sheet_revision, excluded.campaign_id, excluded.owner);

-- A deleted sheet must reach its followers too; under RLS that needs the old
-- row (same reason as character_digests in 16).
alter table public.character_sheet_revisions replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'character_sheet_revisions'
    ) then
    alter publication supabase_realtime add table public.character_sheet_revisions;
  end if;
end $$;
