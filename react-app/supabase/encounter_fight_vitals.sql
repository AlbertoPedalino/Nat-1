-- Enemy health: `encounter_fights` is the only authority.
--
-- Run AFTER vtt.sql and encounter_fights.sql (it replaces the two player mark
-- RPCs from vtt.sql; re-run this file whenever vtt.sql is re-run). Safe to re-run.
--
-- A monster combatant's vitals live inside `encounter_fights.fight.combatants`.
-- A map piece linked through `source_ref = <instance>:<fight>:<combatant>` keeps
-- hp_current / hp_max / conditions / effects only as a read-only display copy:
-- players cannot read fights, yet the GM may show them a creature's HP bar.
-- The database maintains that copy; no client write can change it.

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

-- 2) Display copy on linked pieces, derived from the fight. Runs as the caller
-- (the fight owner), so map_tokens RLS still decides which pieces it reaches.
-- Unchanged pieces are skipped: no no-op UPDATE, no realtime event.
create or replace function public.project_fight_vitals()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.fight is not distinct from old.fight then return null; end if;
  perform set_config('gb.fight_projection', 'on', true);
  update public.map_tokens t
     set hp_current = v.hp_current, hp_max = v.hp_max,
         conditions = v.conditions, effects = v.effects
    from (
      select new.instance_id || ':' || new.id || ':' || (c.value->>'id') as ref,
             round((c.value->>'hpCurrent')::numeric)::integer as hp_current,
             round((c.value->>'hpMax')::numeric)::integer as hp_max,
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
     and (t.hp_current, t.hp_max, t.conditions, t.effects)
         is distinct from (v.hp_current, v.hp_max, v.conditions, v.effects);
  perform set_config('gb.fight_projection', 'off', true);
  return null;
end;
$$;
drop trigger if exists project_fight_vitals on public.encounter_fights;
create trigger project_fight_vitals after insert or update on public.encounter_fights
for each row execute function public.project_fight_vitals();

-- The linked combatant of a piece, read past RLS (players cannot see fights).
create or replace function public.linked_fight_combatant(p_source_ref text)
returns jsonb language sql stable security definer set search_path = public as $$
  select c.value
    from public.encounter_fights f,
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
revoke all on function public.linked_fight_combatant(text) from public, anon, authenticated;

-- 3) No client write can change a linked piece's vitals: inserts (imports,
-- dungeon rooms) and updates always carry the fight's current values. Pieces
-- whose fight is not in the cloud keep their own values as before.
create or replace function public.guard_linked_token_vitals()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  c jsonb;
begin
  if new.source_ref is null or current_setting('gb.fight_projection', true) = 'on' then
    return new;
  end if;
  c := public.linked_fight_combatant(new.source_ref);
  if c is null then return new; end if;
  new.hp_current := round((c->>'hpCurrent')::numeric)::integer;
  new.hp_max := round((c->>'hpMax')::numeric)::integer;
  new.conditions := coalesce(array(select jsonb_array_elements_text(
    case when jsonb_typeof(c->'activeConditions') = 'array' then c->'activeConditions' else '[]'::jsonb end)), '{}');
  new.effects := case when jsonb_typeof(c->'activeEffects') = 'array' then c->'activeEffects' else '[]'::jsonb end;
  return new;
end;
$$;
drop trigger if exists guard_linked_token_vitals on public.map_tokens;
create trigger guard_linked_token_vitals before insert or update on public.map_tokens
for each row execute function public.guard_linked_token_vitals();

-- 4) The one write path for enemy vitals. Atomic per combatant under a row
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
  c jsonb := public.linked_fight_combatant(p_token.source_ref);
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

-- 5) The player mark RPCs from vtt.sql, same permission checks. On a linked
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

-- 6) Existing pieces start from their fight's values.
update public.map_tokens t
   set hp_current = t.hp_current
 where t.source_ref is not null
   and public.linked_fight_combatant(t.source_ref) is not null;
