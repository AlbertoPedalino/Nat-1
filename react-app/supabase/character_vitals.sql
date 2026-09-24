-- Run AFTER combat_sync.sql, BEFORE deploying the matching frontend.
-- Existing characters retain their HP. Missing HP still means full health.
alter table public.characters add column if not exists row_revision bigint not null default 0;
alter table public.characters add column if not exists vitals_revision bigint not null default 0;

-- Every ordinary sheet/upsert save preserves the current combat state.
-- Only the health RPC advances vitals_revision.
create or replace function public.protect_character_vitals()
returns trigger language plpgsql set search_path = public as $$
declare
  keys text[] := array['currentHP','tempHP','deathSaves','maxHPBonus','activeConditions'];
  vitals jsonb;
begin
  if new.vitals_revision is distinct from old.vitals_revision + 1 then
    select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into vitals
      from jsonb_each(old.data) where key = any(keys);
    new.data := (new.data - keys) || vitals;
    new.vitals_revision := old.vitals_revision;
  end if;
  new.row_revision := old.row_revision + 1;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
drop trigger if exists protect_character_vitals on public.characters;
create trigger protect_character_vitals before update on public.characters
for each row execute function public.protect_character_vitals();

-- Retired: the per-command operation ledger and its UUID-keyed RPC. A health
-- command is now committed once against a known revision; a failed or
-- conflicting command re-reads the row instead of being replayed.
drop function if exists public.commit_character_vitals(text, bigint, uuid, jsonb);
drop table if exists public.character_vital_operations;

-- Optimistic transaction: the client derives class/feat max HP from the row it
-- read, then commits against that row's revision. A stale revision is never
-- applied; the current row is returned so the caller can realign and stop.
-- SELECT FOR UPDATE serializes commands on one character.
create or replace function public.commit_character_vitals(
  p_id text, p_revision bigint, p_patch jsonb
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  c public.characters;
  clean jsonb;
  allowed text[] := array['currentHP','tempHP','deathSaves','maxHPBonus','activeConditions'];
begin
  select * into c from public.characters where id = p_id for update;
  if not found then raise exception 'Character unavailable or no permission.'; end if;
  if c.row_revision <> p_revision then
    return jsonb_build_object('applied', false, 'row', to_jsonb(c));
  end if;
  select coalesce(jsonb_object_agg(key,value), '{}'::jsonb) into clean
    from jsonb_each(p_patch) where key = any(allowed);
  update public.characters set data = data || clean, vitals_revision = vitals_revision + 1
    where id = p_id returning * into c;
  if not found then raise exception 'No permission to change character health.'; end if;
  return jsonb_build_object('applied', true, 'row', to_jsonb(c));
end;
$$;
revoke all on function public.commit_character_vitals(text,bigint,jsonb) from public;
grant execute on function public.commit_character_vitals(text,bigint,jsonb) to authenticated;
