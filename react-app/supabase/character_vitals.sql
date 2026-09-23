-- Run AFTER combat_sync.sql, BEFORE deploying the matching frontend.
-- Existing characters retain their HP. Missing HP still means full health.
alter table public.characters add column if not exists row_revision bigint not null default 0;
alter table public.characters add column if not exists vitals_revision bigint not null default 0;

-- Every ordinary sheet/upsert save preserves the current combat state, including
-- saves sent by an older tab. Only the health RPC advances vitals_revision.
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

-- Durable deduplication: a retry after a lost response never applies damage twice.
create table if not exists public.character_vital_operations (
  character_id text not null references public.characters(id) on delete cascade,
  operation_id uuid not null,
  primary key (character_id, operation_id)
);
alter table public.character_vital_operations enable row level security;
drop policy if exists vital_operations_access on public.character_vital_operations;
create policy vital_operations_access on public.character_vital_operations
  for all using (exists (select 1 from public.characters c where c.id = character_id))
  with check (exists (select 1 from public.characters c where c.id = character_id));
grant select, insert on public.character_vital_operations to authenticated;

-- Optimistic transaction: the client derives class/feat max HP from this exact
-- row, then commits against its revision. A conflict re-reads and recalculates
-- the original intent. SELECT FOR UPDATE serializes commands on one character.
create or replace function public.commit_character_vitals(
  p_id text, p_revision bigint, p_operation uuid, p_patch jsonb
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  c public.characters;
  clean jsonb;
  allowed text[] := array['currentHP','tempHP','deathSaves','maxHPBonus','activeConditions'];
begin
  select * into c from public.characters where id = p_id for update;
  if not found then raise exception 'Character unavailable or no permission.'; end if;
  if exists (select 1 from public.character_vital_operations
             where character_id = p_id and operation_id = p_operation) then
    return jsonb_build_object('applied', true, 'row', to_jsonb(c));
  end if;
  if c.row_revision <> p_revision then
    return jsonb_build_object('applied', false, 'row', to_jsonb(c));
  end if;
  select coalesce(jsonb_object_agg(key,value), '{}'::jsonb) into clean
    from jsonb_each(p_patch) where key = any(allowed);
  update public.characters set data = data || clean, vitals_revision = vitals_revision + 1
    where id = p_id returning * into c;
  if not found then raise exception 'No permission to change character health.'; end if;
  insert into public.character_vital_operations values (p_id, p_operation);
  return jsonb_build_object('applied', true, 'row', to_jsonb(c));
end;
$$;
revoke all on function public.commit_character_vitals(text,bigint,uuid,jsonb) from public;
grant execute on function public.commit_character_vitals(text,bigint,uuid,jsonb) to authenticated;

-- Old encounter clients inferred edits from saved snapshots. Reject that path
-- explicitly instead of letting an old open tab silently undo a new command.
create or replace function public.patch_character_data(p_id text, p_patch jsonb)
returns void language plpgsql security invoker set search_path = public as $$
begin
  raise exception 'Please reload Nat-1 to update character health.';
end;
$$;
