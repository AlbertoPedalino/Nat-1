-- Run once in the Supabase SQL editor after deploying the Atmosphere rename.
-- Existing values in the legacy weather column are intentionally discarded.

begin;

alter table public.map_scenes
  add column if not exists atmosphere jsonb not null
  default '{"type":"none","intensity":0.65,"direction":12,"speed":1,"seed":1}'::jsonb;

alter table public.map_scenes
  drop column if exists weather;

comment on column public.map_scenes.atmosphere is
  'Seeded scene atmosphere rendered locally by each VTT client.';

commit;

-- Make the new column visible to the REST API immediately.
notify pgrst, 'reload schema';
