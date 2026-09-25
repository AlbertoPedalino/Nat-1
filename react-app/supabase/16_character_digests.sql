-- The part of a character sheet the table needs, as a row of its own.
--
-- Run AFTER 13_character_vitals.sql (it reads row_revision). Safe to re-run.
--
-- A sheet is one big `data` blob. The battle map and the encounter builder
-- need a sliver of it — name, portrait, class colour, hit points, death
-- saves, conditions — plus to know when max HP may have moved. Subscribing to
-- `characters` sent them the whole blob on every autosave: a note typed, a
-- spell slot ticked, a coin spent.
--
-- `character_digests` is a projection kept by the database: one row per
-- character, rewritten only when the digest itself changes. Clients read and
-- subscribe to it; none can write it. The full row stays the record and is
-- still what the sheet itself (and a read-only viewer of it) follows.
--
-- Max HP is derived by class/species/feat/item rules that live in JavaScript,
-- so it is not recomputed here. Instead `hpBasis` hashes every part of the
-- sheet that could feed it; a consumer re-reads the full sheet only when that
-- hash moves. The hash is conservative: it covers everything except keys known
-- not to affect max HP (the vitals carried alongside, presentation, and the
-- high-traffic trackers listed below). An unknown key counts as relevant.

create or replace function public.character_hp_basis_ignored_keys()
returns text[] language sql immutable as $$
  select array[
    -- carried in the digest itself (maxHPBonus is added on top of the base max)
    'currentHP', 'tempHP', 'maxHPBonus', 'deathSaves', 'activeConditions',
    -- presentation carried in the digest
    'name', 'portraitPath', 'classIconColor',
    -- trackers that change all session and never feed max HP
    'notes', 'resources', 'freeCastUses', 'spellSlotsUsed', 'createdSpellSlots',
    'usedHD', 'usedHDPools', 'currency', 'inspiration',
    -- runtime-only catalog attached by an open sheet (13_character_vitals.sql,
    -- character_runtime_only_keys): never stored, and never part of the basis
    -- while older rows still carry it
    'optionalFeatureEntries'
  ];
$$;

create or replace function public.character_digest(p_name text, p_owner_username text, p_data jsonb)
returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'name', coalesce(nullif(p_data->>'name', ''), p_name),
    'ownerUsername', p_owner_username,
    'className', p_data->'className',
    'classIconColor', p_data->'classIconColor',
    'portraitPath', p_data->'portraitPath',
    'currentHP', p_data->'currentHP',
    'tempHP', p_data->'tempHP',
    'maxHPBonus', p_data->'maxHPBonus',
    'deathSaves', p_data->'deathSaves',
    'activeConditions', p_data->'activeConditions',
    -- jsonb text output is canonical (sorted keys), so equal sheets hash equal.
    'hpBasis', md5((coalesce(p_data, '{}'::jsonb) - public.character_hp_basis_ignored_keys())::text)
  );
$$;

create table if not exists public.character_digests (
  character_id text primary key references public.characters(id) on delete cascade,
  campaign_id  uuid,
  owner        uuid,
  -- The sheet revision this digest was taken from. It moves only when the
  -- digest does, so a consumer holding it can tell a missed event apart from
  -- an autosave that changed nothing it cares about.
  row_revision bigint not null default 0,
  digest       jsonb not null,
  updated_at   timestamptz not null default now()
);
create index if not exists character_digests_campaign on public.character_digests(campaign_id);

alter table public.character_digests enable row level security;

-- Exactly who may read the sheet: its owner, a global GM, or a member (or the
-- GM) of its campaign. No write policies: only the trigger writes here.
drop policy if exists character_digests_select on public.character_digests;
create policy character_digests_select on public.character_digests
  for select using (
    owner = auth.uid()
    or public.is_gm()
    or (campaign_id is not null and campaign_id in (select public.user_campaign_ids()))
  );

create or replace function public.sync_character_digest()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.character_digests (character_id, campaign_id, owner, row_revision, digest, updated_at)
  values (
    new.id, new.campaign_id, new.owner, coalesce(new.row_revision, 0),
    public.character_digest(new.name, new.owner_username, new.data), now()
  )
  on conflict (character_id) do update
    set campaign_id = excluded.campaign_id,
        owner = excluded.owner,
        row_revision = excluded.row_revision,
        digest = excluded.digest,
        updated_at = excluded.updated_at
    -- The whole point: an autosave that leaves the digest alone writes nothing
    -- here, so nobody following the table hears about it.
    where (public.character_digests.digest, public.character_digests.campaign_id, public.character_digests.owner)
      is distinct from (excluded.digest, excluded.campaign_id, excluded.owner);
  return null;
end;
$$;

drop trigger if exists sync_character_digest on public.characters;
create trigger sync_character_digest
  after insert or update of data, name, owner, owner_username, campaign_id on public.characters
  for each row execute function public.sync_character_digest();

-- Existing sheets.
insert into public.character_digests (character_id, campaign_id, owner, row_revision, digest)
  select c.id, c.campaign_id, c.owner, coalesce(c.row_revision, 0),
         public.character_digest(c.name, c.owner_username, c.data)
    from public.characters c
on conflict (character_id) do update
  set campaign_id = excluded.campaign_id, owner = excluded.owner,
      row_revision = excluded.row_revision, digest = excluded.digest, updated_at = now()
  where (public.character_digests.digest, public.character_digests.campaign_id, public.character_digests.owner)
    is distinct from (excluded.digest, excluded.campaign_id, excluded.owner);

-- A deleted sheet must reach its followers too; under RLS that needs the old
-- row (same reason as map_tokens in 06_vtt.sql).
alter table public.character_digests replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'character_digests'
  ) then
    alter publication supabase_realtime add table public.character_digests;
  end if;
end $$;
