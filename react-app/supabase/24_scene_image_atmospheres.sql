-- An atmosphere per scene picture.
--
-- Run AFTER 23_scene_image_filters.sql. Safe to re-run.
--
-- Like the light filters, the weather belongs to a picture rather than to the
-- scene: the battlemap can be under a storm while the tavern background stays
-- dry. `image_atmospheres` maps a picture's storage path (the battlemap's
-- `image_path` or one of `backgrounds`) to the seeded description the clients
-- render, e.g. `{ "type": "rain", "intensity": 0.7, "direction": 12,
-- "speed": 1, "seed": 42 }`. A picture without weather has no entry. Players
-- and the projector read it with the rest of the row; only the GM writes it.
--
-- The old scene-wide `atmosphere` column is no longer read by the app. It is
-- left in place (nothing is migrated): a scene that had weather shows none
-- until the GM picks it again for the picture it belongs to.

alter table public.map_scenes add column if not exists image_atmospheres jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';
