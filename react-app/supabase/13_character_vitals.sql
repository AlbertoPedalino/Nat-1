-- Run AFTER 04_characters_realtime.sql, BEFORE deploying the matching frontend.
-- The health command reads character_digests (16_character_digests.sql) when
-- it is called, not when it is created, so run order is unaffected.
-- Existing characters retain their HP. Missing HP still means full health.
alter table public.characters add column if not exists row_revision bigint not null default 0;
alter table public.characters add column if not exists vitals_revision bigint not null default 0;

-- Every ordinary sheet/upsert save preserves the current combat state.
-- Only the health RPC advances vitals_revision.
--
-- row_revision is the one version of a sheet, whoever writes it: every UPDATE
-- goes through here (sheet saves, upserts, the health RPC, campaign moves,
-- ON DELETE SET NULL), and a client-supplied value is never kept. Open sheets
-- compare it before downloading the row again, so a write that leaves the row
-- as it was (an unchanged save, or one that only tried to change health) keeps
-- the revision: nobody re-reads a sheet that did not change.
create or replace function public.protect_character_vitals()
returns trigger language plpgsql set search_path = public as $$
declare
  keys text[] := array['currentHP','tempHP','deathSaves','maxHPBonus','activeConditions'];
  bookkeeping text[] := array['row_revision','vitals_revision','updated_at'];
  vitals jsonb;
begin
  if new.vitals_revision is distinct from old.vitals_revision + 1 then
    select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into vitals
      from jsonb_each(old.data) where key = any(keys);
    new.data := (new.data - keys) || vitals;
    new.vitals_revision := old.vitals_revision;
  end if;
  new.updated_at := clock_timestamp();
  if (to_jsonb(new) - bookkeeping) = (to_jsonb(old) - bookkeeping) then
    new.row_revision := old.row_revision;
    new.vitals_revision := old.vitals_revision;
  else
    new.row_revision := old.row_revision + 1;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_character_vitals on public.characters;
create trigger protect_character_vitals before update on public.characters
for each row execute function public.protect_character_vitals();

-- Retired: the per-command operation ledger and its UUID-keyed RPC, and the
-- form that was committed against `characters.row_revision` and answered with
-- the whole row. A health command is committed once against a known digest; a
-- failed or conflicting command is never replayed by the database.
drop function if exists public.commit_character_vitals(text, bigint, uuid, jsonb);
drop function if exists public.commit_character_vitals(text, bigint, jsonb);
drop table if exists public.character_vital_operations;

-- What a health command answers with: the vitals as stored, the revision of
-- the character digest (16_character_digests.sql) and its max-HP basis. Never
-- the sheet itself: a command costs a few hundred bytes, not the whole row.
create or replace function public.character_vitals_answer(
  p_applied boolean, p_id text, p_data jsonb, p_digest_revision bigint, p_hp_basis text
) returns jsonb language sql stable as $$
  select jsonb_build_object(
    'applied', p_applied,
    'characterId', p_id,
    'vitals', (
      select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
        from jsonb_each(coalesce(p_data, '{}'::jsonb))
       where key = any(array['currentHP','tempHP','deathSaves','maxHPBonus','activeConditions'])
    ),
    'digestRevision', p_digest_revision,
    'hpBasis', p_hp_basis
  );
$$;

-- Optimistic transaction. The client computes an absolute vitals patch from
-- the digest it holds and a base max HP it derived for that digest's `hpBasis`
-- (the max-HP rules live in JavaScript; the database only checks the basis).
-- The patch is applied only if the digest is still that revision and basis:
-- the digest moves exactly when vitals, the max-HP inputs or the roster facts
-- do, so saving notes or inventory never conflicts with a health command.
-- A mismatch applies nothing and answers with the current state. SELECT FOR
-- UPDATE serializes commands on one character; the digest is written by the
-- characters trigger in the same transaction, so under that lock it is the
-- digest of the locked row. The digest table is only needed at call time.
create or replace function public.commit_character_vitals(
  p_id text, p_digest_revision bigint, p_hp_basis text, p_patch jsonb
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  c public.characters;
  clean jsonb;
  allowed text[] := array['currentHP','tempHP','deathSaves','maxHPBonus','activeConditions'];
  digest_revision bigint;
  hp_basis text;
begin
  select * into c from public.characters where id = p_id for update;
  if not found then raise exception 'Character unavailable or no permission.'; end if;
  select d.row_revision, d.digest->>'hpBasis' into digest_revision, hp_basis
    from public.character_digests d where d.character_id = p_id;
  if digest_revision is distinct from p_digest_revision or hp_basis is distinct from p_hp_basis then
    return public.character_vitals_answer(false, c.id, c.data, digest_revision, hp_basis);
  end if;
  select coalesce(jsonb_object_agg(key,value), '{}'::jsonb) into clean
    from jsonb_each(p_patch) where key = any(allowed);
  update public.characters set data = data || clean, vitals_revision = vitals_revision + 1
    where id = p_id returning * into c;
  if not found then raise exception 'No permission to change character health.'; end if;
  -- The digest trigger has run with the update: read what it wrote.
  select d.row_revision, d.digest->>'hpBasis' into digest_revision, hp_basis
    from public.character_digests d where d.character_id = p_id;
  return public.character_vitals_answer(true, c.id, c.data, digest_revision, hp_basis);
end;
$$;
revoke all on function public.commit_character_vitals(text,bigint,text,jsonb) from public;
grant execute on function public.commit_character_vitals(text,bigint,text,jsonb) to authenticated;
