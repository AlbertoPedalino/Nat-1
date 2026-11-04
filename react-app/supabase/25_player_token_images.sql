-- ============================================================================
-- GM Board — Pictures on the players' own token pieces.
--
-- Run AFTER 06_vtt.sql. Safe to re-run. Replaces the map-images insert and
-- delete policies of 06_vtt.sql: run this file again after re-running 06.
--
-- A player builds a token piece the way the GM does — a name, a colour and a
-- picture. The picture goes where every scene upload goes,
-- `<campaign_id>/<scene_id>/<file>`, so deleting the scene still removes it with
-- the rest of the folder. A player may upload only:
--   - into a campaign they belong to,
--   - under a scene of that campaign that is live (where they may place pieces,
--     see map_tokens_insert),
--   - directly in the scene folder, nowhere deeper.
-- A player may delete only a file they uploaded themselves (`owner`), which is
-- what removing their piece does; the GM's maps and backgrounds stay out of
-- their reach even if a piece of theirs pointed at one.
-- ============================================================================

drop policy if exists map_images_insert on storage.objects;
create policy map_images_insert on storage.objects
  for insert with check (
    bucket_id = 'map-images'
    and (
      public.is_campaign_gm(public.uuid_or_null((storage.foldername(name))[1]))
      or (
        array_length(storage.foldername(name), 1) = 2
        and public.uuid_or_null((storage.foldername(name))[1]) in (select public.user_campaign_ids())
        and public.map_scene_campaign(public.uuid_or_null((storage.foldername(name))[2]))
          = public.uuid_or_null((storage.foldername(name))[1])
        and public.map_scene_is_live(public.uuid_or_null((storage.foldername(name))[2]))
      )
    )
  );

drop policy if exists map_images_delete on storage.objects;
create policy map_images_delete on storage.objects
  for delete using (
    bucket_id = 'map-images'
    and (
      public.is_campaign_gm(public.uuid_or_null((storage.foldername(name))[1]))
      or (
        owner = auth.uid()
        and public.uuid_or_null((storage.foldername(name))[1]) in (select public.user_campaign_ids())
      )
    )
  );
