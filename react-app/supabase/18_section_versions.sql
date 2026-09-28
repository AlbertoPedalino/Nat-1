-- ============================================================================
-- GM Board — tool instance versions (run after 02_sections.sql)
-- Safe to re-run.
--
-- `version` is the optimistic-concurrency revision of a GM Board, Encounter
-- Builder or DM Screen row. Only the database sets it:
--   INSERT                → version 0
--   UPDATE changing data  → old version + 1 (and updated_at = now())
--   UPDATE of name/link   → version and updated_at unchanged
-- Whatever a client sends for either column is ignored. A client updates data
-- with `... where id = $1 and version = $2`: one statement, so the check and the
-- increment are atomic, and 0 rows means another copy got there first.
--
-- `updated_at` is only a timestamp for sorting and display.
-- ============================================================================

alter table public.boards add column if not exists version bigint not null default 0;
alter table public.encounters add column if not exists version bigint not null default 0;
alter table public.dm_screens add column if not exists version bigint not null default 0;

create or replace function public.section_instance_version()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.version := 0;
    new.updated_at := now();
  elsif new.data is distinct from old.data then
    new.version := old.version + 1;
    new.updated_at := now();
  else
    new.version := old.version;
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;

drop trigger if exists boards_version on public.boards;
create trigger boards_version
  before insert or update on public.boards
  for each row execute function public.section_instance_version();

drop trigger if exists encounters_version on public.encounters;
create trigger encounters_version
  before insert or update on public.encounters
  for each row execute function public.section_instance_version();

drop trigger if exists dm_screens_version on public.dm_screens;
create trigger dm_screens_version
  before insert or update on public.dm_screens
  for each row execute function public.section_instance_version();
