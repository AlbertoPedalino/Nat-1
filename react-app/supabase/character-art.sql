-- ============================================================================
-- GM Board — Character portraits. Run this AFTER campaigns.sql.
-- SQL Editor > New query > paste all > Run.
--
-- A portrait is a small square picture a player uploads for their character.
-- The bytes live in a private bucket; the path to them lives in the character's
-- own data, so it travels with the sheet and every screen that shows the
-- character — the sheet, the encounter builder, the battle map — reads the same
-- one.
--
-- Paths are `<owner id>/<character id>-<stamp>.webp`. The owner comes first
-- because that is what these policies key on, and the stamp is there so that a
-- new portrait is a new address: the bytes at any given path never change,
-- which is what makes them safe to cache in a browser for a month.
-- ============================================================================

-- 1) BUCKET -------------------------------------------------------------------
-- Private. A portrait is not a secret, but the rest of a character's data is
-- behind RLS and there is no reason for this one field to be the exception.
insert into storage.buckets (id, name, public)
values ('character-art', 'character-art', false)
on conflict (id) do nothing;

-- 2) HELPERS ------------------------------------------------------------------
-- A folder name is text; a policy needs it as a uuid, and a folder that is not
-- one must fail the check rather than the query. Repeated from vtt.sql so this
-- file can be run on its own.
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

-- Does this person share a table with me?
-- SECURITY DEFINER so it bypasses RLS and cannot recurse through the policies
-- that call it, the same way user_campaign_ids() does.
create or replace function public.shares_campaign_with(p_user uuid)
returns boolean
language sql security definer set search_path = public stable
as $$
  select p_user is not null and (
    p_user = auth.uid()
    -- They play in one of my campaigns…
    or exists (
      select 1 from public.campaign_members m
      where m.user_id = p_user
        and m.campaign_id in (select public.user_campaign_ids())
    )
    -- …or they run one.
    or exists (
      select 1 from public.campaigns c
      where c.gm = p_user
        and c.id in (select public.user_campaign_ids())
    )
  );
$$;

-- 3) POLICIES -----------------------------------------------------------------
-- Read: anyone at the same table. The party has to see each other's faces on
-- the map and in an encounter, and the GM has to see the party's — but a
-- stranger with a signed link's worth of curiosity does not.
drop policy if exists character_art_select on storage.objects;
create policy character_art_select on storage.objects
  for select using (
    bucket_id = 'character-art'
    and public.shares_campaign_with(public.uuid_or_null((storage.foldername(name))[1]))
  );

-- Write: your own folder, nobody else's. This is the whole reason the owner's
-- id is the first thing in the path.
drop policy if exists character_art_insert on storage.objects;
create policy character_art_insert on storage.objects
  for insert with check (
    bucket_id = 'character-art'
    and public.uuid_or_null((storage.foldername(name))[1]) = auth.uid()
  );

drop policy if exists character_art_update on storage.objects;
create policy character_art_update on storage.objects
  for update using (
    bucket_id = 'character-art'
    and public.uuid_or_null((storage.foldername(name))[1]) = auth.uid()
  );

drop policy if exists character_art_delete on storage.objects;
create policy character_art_delete on storage.objects
  for delete using (
    bucket_id = 'character-art'
    and public.uuid_or_null((storage.foldername(name))[1]) = auth.uid()
  );
