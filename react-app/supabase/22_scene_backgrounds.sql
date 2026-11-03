-- Several backgrounds per scene.
--
-- Run AFTER 06_vtt.sql. Safe to re-run.
--
-- A scene showed one background: the establishing shot. A place often has
-- more than one face — the tavern by day and by night, the hall before and
-- after the fire — and swapping them meant re-uploading. `backgrounds` keeps
-- every uploaded background, in the order they were added; `background_path`
-- stays the one on show and is always one of them. Players, the projector and
-- RLS keep reading `background_path` exactly as before.
--
-- A scene made before this column has an empty list and, possibly, a
-- `background_path`: the client reads that as a list of one. No backfill.

alter table public.map_scenes add column if not exists backgrounds jsonb not null default '[]'::jsonb;
