-- ============================================================================
-- GM Board — Portraits written by whoever may edit the character. Run this
-- AFTER 05_character_art.sql. Safe to re-run.
--
-- A portrait always lives in its character's owner's folder, whoever uploads
-- it. 05_character_art.sql lets only the folder's owner write there, so a GM
-- changing a player's portrait could neither put the new one in the player's
-- folder nor remove the old one from it. Here a GM who may edit the character
-- (characters_update_own in 03_campaigns.sql) may also add and remove its
-- portraits.
--
-- The character is read from the path, `<owner id>/<character id>-<stamp>.webp`,
-- and must belong to the folder's owner, so a GM cannot write into a player's
-- folder under a character that is not that player's.
-- ============================================================================

-- SECURITY DEFINER so the lookup does not depend on the caller's RLS on
-- characters, the same way shares_campaign_with() does.
create or replace function public.can_edit_character_art(p_name text)
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from public.characters c
    where c.owner = public.uuid_or_null((storage.foldername(p_name))[1])
      and c.id = regexp_replace(storage.filename(p_name), '-[0-9]+\.webp$', '')
      and (
        public.is_gm()
        or (c.campaign_id is not null and c.campaign_id in (select id from public.campaigns where gm = auth.uid()))
      )
  );
$$;

drop policy if exists character_art_insert on storage.objects;
create policy character_art_insert on storage.objects
  for insert with check (
    bucket_id = 'character-art'
    and (
      public.uuid_or_null((storage.foldername(name))[1]) = auth.uid()
      or public.can_edit_character_art(name)
    )
  );

drop policy if exists character_art_delete on storage.objects;
create policy character_art_delete on storage.objects
  for delete using (
    bucket_id = 'character-art'
    and (
      public.uuid_or_null((storage.foldername(name))[1]) = auth.uid()
      or public.can_edit_character_art(name)
    )
  );
