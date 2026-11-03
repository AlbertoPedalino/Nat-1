-- A light filter per scene picture.
--
-- Run AFTER 22_scene_backgrounds.sql. Safe to re-run.
--
-- A daylight map can be shown at dusk or at night without a second painting:
-- `image_filters` maps a picture's storage path (the battlemap's
-- `image_path` or one of `backgrounds`) to `{ "type": "night", "intensity": 0.8 }`.
-- A picture shown as painted has no entry. Players and the projector read it
-- with the rest of the row; only the GM writes it, like the atmosphere.

alter table public.map_scenes add column if not exists image_filters jsonb not null default '{}'::jsonb;
