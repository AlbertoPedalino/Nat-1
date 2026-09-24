-- Token health: authoritative sources and the public projection.
--
-- Run AFTER vtt.sql and encounter_fights.sql (it replaces the two player mark
-- RPCs from vtt.sql; re-run this file whenever vtt.sql is re-run). Safe to re-run.
--
-- Real hit points live only in GM-only tables:
--   * a monster linked through `source_ref = <instance>:<fight>:<combatant>`
--     to a cloud fight: the combatant inside `encounter_fights.fight`;
--   * any other piece: `map_token_secrets.hp_current / hp_max`.
-- `map_tokens.hp_current / hp_max` are only a public projection, computed by
-- the database on every write: the real values when `show_hp` is on, NULL
-- when it is off. Nothing a client writes to those two columns is kept, and
-- nothing flows back from them into a private source.

alter table public.encounter_fights
  add column if not exists vitals_revision bigint not null default 0;

create or replace function public.fight_monster_vital_keys()
returns text[] language sql immutable as $$
  select array['hpCurrent','hpMax','tempHP','maxHPBonus','activeConditions','activeEffects','isDead']
$$;

create or replace function public.fight_combatant_is_monster(c jsonb)
returns boolean language sql immutable as $$
  select (c->>'type') is distinct from 'player' and coalesce(c->>'sourceId', '') = ''
$$;

-- 1) Ordinary fight saves (the builder's full upsert: turn, round, roster)
-- keep the stored monster vitals. Only commit_fight_combatant_vitals advances
-- vitals_revision, and only that path may change them. New combatants take
-- the values they arrive with.
create or replace function public.protect_fight_vitals()
returns trigger language plpgsql set search_path = public as $$
declare
  keys text[] := public.fight_monster_vital_keys();
begin
  if new.vitals_revision is distinct from old.vitals_revision + 1 then
    if jsonb_typeof(new.fight->'combatants') = 'array' then
      new.fight := jsonb_set(new.fight, '{combatants}', coalesce((
        select jsonb_agg(
          case
            when public.fight_combatant_is_monster(n.value) and o.value is not null
              then (n.value - keys) || (
                select coalesce(jsonb_object_agg(k, v), '{}'::jsonb)
                  from jsonb_each(o.value) as e(k, v) where k = any(keys)
              )
            else n.value
          end order by n.ord)
        from jsonb_array_elements(new.fight->'combatants') with ordinality as n(value, ord)
        left join lateral (
          select x.value from jsonb_array_elements(
            case when jsonb_typeof(old.fight->'combatants') = 'array' then old.fight->'combatants' else '[]'::jsonb end
          ) as x(value)
          where x.value->>'id' = n.value->>'id'
          limit 1
        ) as o on true
      ), '[]'::jsonb));
    end if;
    new.vitals_revision := old.vitals_revision;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_fight_vitals on public.encounter_fights;
create trigger protect_fight_vitals before update on public.encounter_fights
for each row execute function public.protect_fight_vitals();

-- The linked combatant of a piece, read past RLS (players cannot see fights).
-- Only a fight owned by the GM of the piece's campaign counts: anyone else
-- creating a row with a matching id must not gain control of the piece.
drop function if exists public.linked_fight_combatant(text);
create or replace function public.linked_fight_combatant(p_source_ref text, p_scene uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select c.value
    from public.encounter_fights f
    join public.map_scenes s on s.id = p_scene
    join public.campaigns g on g.id = s.campaign_id and g.gm = f.owner,
         jsonb_array_elements(
           case when jsonb_typeof(f.fight->'combatants') = 'array' then f.fight->'combatants' else '[]'::jsonb end
         ) as c(value)
   where p_source_ref is not null
     and f.id = split_part(p_source_ref, ':', 2)
     and f.instance_id = split_part(p_source_ref, ':', 1)
     and c.value->>'id' = split_part(p_source_ref, ':', 3)
     and public.fight_combatant_is_monster(c.value)
   limit 1
$$;
revoke all on function public.linked_fight_combatant(text, uuid) from public, anon, authenticated;

-- 2) The private source for pieces without a cloud fight. GM-only through the
-- existing map_token_secrets RLS (and therefore through Realtime as well).
alter table public.map_token_secrets add column if not exists hp_current integer;
alter table public.map_token_secrets add column if not exists hp_max integer;

-- Backfill, before the projection below can clear anything: the HP a legacy
-- piece carries on its public row become its private value. Pieces linked to
-- a cloud fight are skipped (the fight is their source); an existing private
-- value is never overwritten.
insert into public.map_token_secrets (token_id, hp_current, hp_max)
select t.id, t.hp_current, t.hp_max
  from public.map_tokens t
 where (t.hp_current is not null or t.hp_max is not null)
   and public.linked_fight_combatant(t.source_ref, t.scene_id) is null
on conflict (token_id) do update
   set hp_current = excluded.hp_current, hp_max = excluded.hp_max
 where public.map_token_secrets.hp_current is null and public.map_token_secrets.hp_max is null;

-- A piece's real HP, from whichever private source owns it.
create or replace function public.token_real_hp(p_token public.map_tokens)
returns table (hp_current integer, hp_max integer)
language plpgsql stable security definer set search_path = public as $$
declare
  c jsonb := public.linked_fight_combatant(p_token.source_ref, p_token.scene_id);
begin
  if c is not null then
    return query select round((c->>'hpCurrent')::numeric)::integer, round((c->>'hpMax')::numeric)::integer;
  else
    return query select s.hp_current, s.hp_max from public.map_token_secrets s where s.token_id = p_token.id;
  end if;
end;
$$;
revoke all on function public.token_real_hp(public.map_tokens) from public, anon, authenticated;

-- 3) Every insert or update of a piece recomputes its public vitals from the
-- private sources: HP only while `show_hp` is on, and a linked monster's
-- conditions/effects from its combatant. Values written by clients (players,
-- old frontends, stale caches) are discarded.
create or replace function public.guard_token_public_vitals()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  c jsonb := public.linked_fight_combatant(new.source_ref, new.scene_id);
  hp record;
begin
  if c is not null then
    new.conditions := coalesce(array(select jsonb_array_elements_text(
      case when jsonb_typeof(c->'activeConditions') = 'array' then c->'activeConditions' else '[]'::jsonb end)), '{}');
    new.effects := case when jsonb_typeof(c->'activeEffects') = 'array' then c->'activeEffects' else '[]'::jsonb end;
  end if;
  select * into hp from public.token_real_hp(new);
  if coalesce(new.show_hp, false) then
    new.hp_current := hp.hp_current;
    new.hp_max := hp.hp_max;
  else
    new.hp_current := null;
    new.hp_max := null;
  end if;
  return new;
end;
$$;
drop trigger if exists guard_linked_token_vitals on public.map_tokens;
drop function if exists public.guard_linked_token_vitals();
drop trigger if exists guard_token_public_vitals on public.map_tokens;
create trigger guard_token_public_vitals before insert or update on public.map_tokens
for each row execute function public.guard_token_public_vitals();

-- The public values a piece should carry right now (used to skip no-op writes).
create or replace function public.token_public_hp_differs(p_token public.map_tokens)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  hp record;
  want_current integer;
  want_max integer;
begin
  select * into hp from public.token_real_hp(p_token);
  if coalesce(p_token.show_hp, false) then
    want_current := hp.hp_current;
    want_max := hp.hp_max;
  end if;
  return (p_token.hp_current, p_token.hp_max) is distinct from (want_current, want_max);
end;
$$;
revoke all on function public.token_public_hp_differs(public.map_tokens) from public, anon, authenticated;

-- 4) A private HP change re-projects its piece (the guard does the work).
create or replace function public.project_secret_token_hp()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.map_tokens t set hp_current = t.hp_current
   where t.id = coalesce(new.token_id, old.token_id) and public.token_public_hp_differs(t);
  return null;
end;
$$;
drop trigger if exists project_secret_token_hp on public.map_token_secrets;
create trigger project_secret_token_hp after insert or update of hp_current, hp_max or delete
on public.map_token_secrets
for each row execute function public.project_secret_token_hp();

-- 5) A fight change re-projects its linked pieces: only pieces whose campaign
-- GM owns this fight, and only pieces whose public values actually change (no
-- no-op UPDATE, no realtime event).
create or replace function public.project_fight_vitals()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.fight is not distinct from old.fight then return null; end if;
  update public.map_tokens t
     set conditions = v.conditions, effects = v.effects
    from (
      select new.instance_id || ':' || new.id || ':' || (c.value->>'id') as ref,
             coalesce(array(select jsonb_array_elements_text(
               case when jsonb_typeof(c.value->'activeConditions') = 'array'
                 then c.value->'activeConditions' else '[]'::jsonb end)), '{}') as conditions,
             case when jsonb_typeof(c.value->'activeEffects') = 'array'
               then c.value->'activeEffects' else '[]'::jsonb end as effects
        from jsonb_array_elements(
          case when jsonb_typeof(new.fight->'combatants') = 'array' then new.fight->'combatants' else '[]'::jsonb end
        ) as c(value)
       where public.fight_combatant_is_monster(c.value) and c.value ? 'id'
    ) as v
   where t.source_ref = v.ref
     and public.linked_fight_combatant(t.source_ref, t.scene_id) is not null
     and ((t.conditions, t.effects) is distinct from (v.conditions, v.effects)
          or public.token_public_hp_differs(t));
  return null;
end;
$$;
drop trigger if exists project_fight_vitals on public.encounter_fights;
create trigger project_fight_vitals after insert or update on public.encounter_fights
for each row execute function public.project_fight_vitals();

-- Realtime for the private source reaches the GM only (RLS); the default
-- replica identity sends nothing but the key on delete.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'map_token_secrets'
  ) then
    alter publication supabase_realtime add table public.map_token_secrets;
  end if;
end $$;

-- 6) The one write path for enemy vitals. Atomic per combatant under a row
-- lock. `p_base` holds the values the caller computed from; if the stored
-- combatant no longer matches, nothing is applied and the current row comes
-- back so the caller realigns. An identical patch writes nothing.
create or replace function public.apply_fight_combatant_patch(
  p_fight_id text, p_combatant_id text, p_base jsonb, p_patch jsonb
) returns jsonb language plpgsql set search_path = public as $$
declare
  f public.encounter_fights;
  cur jsonb;
  idx integer;
  clean jsonb;
  k text;
begin
  select * into f from public.encounter_fights where id = p_fight_id for update;
  if not found then
    raise exception 'Fight unavailable or no permission.' using errcode = 'P0002';
  end if;
  select e.value, (e.ord - 1)::integer into cur, idx
    from jsonb_array_elements(
      case when jsonb_typeof(f.fight->'combatants') = 'array' then f.fight->'combatants' else '[]'::jsonb end
    ) with ordinality as e(value, ord)
   where e.value->>'id' = p_combatant_id and public.fight_combatant_is_monster(e.value);
  if cur is null then
    raise exception 'Combatant unavailable.' using errcode = 'P0002';
  end if;
  for k in select jsonb_object_keys(coalesce(p_base, '{}'::jsonb)) loop
    if coalesce(cur->k, 'null'::jsonb) is distinct from coalesce(p_base->k, 'null'::jsonb) then
      return jsonb_build_object('applied', false, 'row', to_jsonb(f));
    end if;
  end loop;
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into clean
    from jsonb_each(coalesce(p_patch, '{}'::jsonb))
   where key = any(public.fight_monster_vital_keys());
  if (cur || clean) = cur then
    return jsonb_build_object('applied', true, 'row', to_jsonb(f));
  end if;
  update public.encounter_fights
     set fight = jsonb_set(fight, array['combatants', idx::text], cur || clean),
         vitals_revision = vitals_revision + 1,
         updated_at = now()
   where id = p_fight_id
  returning * into f;
  if not found then
    raise exception 'No permission to change this fight.' using errcode = '42501';
  end if;
  return jsonb_build_object('applied', true, 'row', to_jsonb(f));
end;
$$;
-- Runs as the caller (RLS applies), except when forward_token_marks calls it.
revoke all on function public.apply_fight_combatant_patch(text, text, jsonb, jsonb) from public, anon;
grant execute on function public.apply_fight_combatant_patch(text, text, jsonb, jsonb) to authenticated;

-- The GM's call, from the builder or the battle map. Runs as the caller:
-- encounter_fights RLS keeps it to the fight owner.
create or replace function public.commit_fight_combatant_vitals(
  p_fight_id text, p_combatant_id text, p_base jsonb, p_patch jsonb
) returns jsonb language sql security invoker set search_path = public as $$
  select public.apply_fight_combatant_patch(p_fight_id, p_combatant_id, p_base, p_patch)
$$;
revoke all on function public.commit_fight_combatant_vitals(text, text, jsonb, jsonb) from public;
grant execute on function public.commit_fight_combatant_vitals(text, text, jsonb, jsonb) to authenticated;

-- Marks on a linked piece become a mark on its combatant, with the monster
-- mortality rule the builder uses: Dead means 0 HP, removing Dead restores 1.
create or replace function public.forward_token_marks(p_token public.map_tokens, p_patch jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  c jsonb := public.linked_fight_combatant(p_token.source_ref, p_token.scene_id);
  patch jsonb := p_patch;
  was_dead boolean;
  now_dead boolean;
begin
  if c is null then return false; end if;
  if patch ? 'activeConditions' then
    was_dead := coalesce(c->'activeConditions', '[]'::jsonb) ? 'dead';
    now_dead := patch->'activeConditions' ? 'dead';
    if now_dead and not was_dead then
      patch := patch || jsonb_build_object('hpCurrent', 0, 'isDead', true);
    elsif was_dead and not now_dead then
      patch := patch || jsonb_build_object('hpCurrent', 1, 'isDead', false);
    end if;
  end if;
  perform public.apply_fight_combatant_patch(
    split_part(p_token.source_ref, ':', 2), split_part(p_token.source_ref, ':', 3), null, patch);
  return true;
end;
$$;
revoke all on function public.forward_token_marks(public.map_tokens, jsonb) from public, anon, authenticated;

-- 7) The player mark RPCs from vtt.sql, same permission checks. On a linked
-- piece the mark goes to the fight; the display copy follows by projection.
create or replace function public.set_token_conditions(p_token uuid, p_conditions text[])
returns public.map_tokens
language plpgsql security definer set search_path = public
as $$
declare
  token public.map_tokens;
  scene public.map_scenes;
begin
  select * into token from public.map_tokens where id = p_token;
  if token.id is null then
    raise exception 'Token not found';
  end if;
  select * into scene from public.map_scenes where id = token.scene_id;

  if not (
    public.is_campaign_gm(scene.campaign_id)
    or (
      token.layer <> 'gm'
      and not token.hidden_from_players
      and scene.is_live
      and scene.campaign_id in (select public.user_campaign_ids())
      and public.map_token_in_play(token.scene_id, token.x, token.y)
    )
  ) then
    raise exception 'Not allowed to mark this token';
  end if;

  if public.forward_token_marks(token, jsonb_build_object('activeConditions', to_jsonb(coalesce(p_conditions, '{}')))) then
    select * into token from public.map_tokens where id = p_token;
    return token;
  end if;
  update public.map_tokens
    set conditions = coalesce(p_conditions, '{}')
    where id = p_token
    returning * into token;
  return token;
end;
$$;

create or replace function public.set_token_effects(p_token uuid, p_effects jsonb)
returns public.map_tokens
language plpgsql security definer set search_path = public
as $$
declare
  token public.map_tokens;
  scene public.map_scenes;
begin
  select * into token from public.map_tokens where id = p_token;
  if token.id is null then
    raise exception 'Token not found';
  end if;
  select * into scene from public.map_scenes where id = token.scene_id;

  if not (
    public.is_campaign_gm(scene.campaign_id)
    or (
      token.layer <> 'gm'
      and not token.hidden_from_players
      and scene.is_live
      and scene.campaign_id in (select public.user_campaign_ids())
      and public.map_token_in_play(token.scene_id, token.x, token.y)
    )
  ) then
    raise exception 'Not allowed to mark this token';
  end if;

  if public.forward_token_marks(token, jsonb_build_object('activeEffects', coalesce(p_effects, '[]'::jsonb))) then
    select * into token from public.map_tokens where id = p_token;
    return token;
  end if;
  update public.map_tokens
    set effects = coalesce(p_effects, '[]'::jsonb)
    where id = p_token
    returning * into token;
  return token;
end;
$$;

-- 8) Existing pieces take their projection now: linked monsters from their
-- fight (stale public HP ignored), others from the backfilled private value,
-- hidden HP cleared. Pieces already correct are not touched.
update public.map_tokens t
   set hp_current = t.hp_current
 where public.token_public_hp_differs(t)
    or (t.source_ref is not null and public.linked_fight_combatant(t.source_ref, t.scene_id) is not null);
