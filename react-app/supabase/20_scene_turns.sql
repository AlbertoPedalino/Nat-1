-- Initiative on the battle map: whose turn it is, shown to the table.
--
-- Run AFTER 06_vtt.sql, 08_encounter_fights.sql and 14_token_vitals.sql. Safe
-- to re-run.
--
-- The turn lives where the rest of a fight lives: `currentTurn` and `round`
-- inside `encounter_fights.fight`. Nothing here copies that authority; it
-- adds three things around it:
--
--   1. `turnRevision` inside the fight, advanced only by commit_fight_turn
--      (the GM's "next turn" on the map). An ordinary builder save that still
--      carries an older revision cannot put an earlier turn back; the builder
--      takes the new turn from the row instead.
--   2. `map_scene_turns`: which fight a scene shows, one row per scene. The GM
--      picks it; placing a piece imported from a fight picks that fight.
--   3. `map_tokens.turn_order / turn_active`: a public projection of the shown
--      fight onto its pieces, kept by the database. Players read it through
--      the token RLS they already have, so a creature they cannot see — GM
--      layer, hidden, staged outside the play area, not placed at all — is not
--      in their turn order, and its turn passes without them knowing whose it
--      was. Nothing a client writes to these columns is kept.

-- 0) Small readers ------------------------------------------------------------

-- A whole number from a JSON value, or the fallback for anything else.
create or replace function public.fight_int(p_value jsonb, p_fallback integer)
returns integer language sql immutable as $$
  select case when jsonb_typeof(p_value) = 'number' then floor((p_value #>> '{}')::numeric)::integer else p_fallback end
$$;

create or replace function public.fight_combatant_list(p_fight jsonb)
returns jsonb language sql immutable as $$
  select case when jsonb_typeof(p_fight->'combatants') = 'array' then p_fight->'combatants' else '[]'::jsonb end
$$;

-- 1) The turn authority -------------------------------------------------------

-- One step forward (1) or back (-1), as the builder's nextTurn/prevTurn do it:
-- the round turns over at the top of the order, and dead combatants are
-- skipped while anyone is still standing.
create or replace function public.fight_turn_step(p_fight jsonb, p_step integer)
returns jsonb language plpgsql immutable as $$
declare
  list jsonb := public.fight_combatant_list(p_fight);
  n integer := jsonb_array_length(list);
  turn integer := public.fight_int(p_fight->'currentTurn', 0);
  rnd integer := public.fight_int(p_fight->'round', 1);
  someone_alive boolean;
  safety integer := 0;
begin
  if n = 0 then
    return jsonb_build_object('currentTurn', turn, 'round', rnd);
  end if;
  someone_alive := exists (
    select 1 from jsonb_array_elements(list) as c(value) where c.value->'isDead' is distinct from 'true'::jsonb
  );
  loop
    if p_step > 0 then
      turn := (turn + 1) % n;
      if turn = 0 then rnd := rnd + 1; end if;
    else
      turn := ((turn - 1) % n + n) % n;
      if turn = n - 1 then rnd := greatest(1, rnd - 1); end if;
    end if;
    safety := safety + 1;
    exit when not (list->turn->'isDead' = 'true'::jsonb and someone_alive and safety < n);
  end loop;
  return jsonb_build_object('currentTurn', turn, 'round', rnd);
end;
$$;

-- An ordinary save (the builder's full upsert) carries the turn revision it
-- last saw. The same one: its own turn change, kept. One more: the RPC below.
-- Anything else is a save from before the latest "next turn": the stored turn
-- stands — as the same combatant, wherever the save put them in the order —
-- with its round and revision.
create or replace function public.protect_fight_turn()
returns trigger language plpgsql set search_path = public as $$
declare
  old_rev integer := public.fight_int(old.fight->'turnRevision', 0);
  new_rev integer := public.fight_int(new.fight->'turnRevision', 0);
  current_id jsonb;
  idx integer;
begin
  if new.fight is not distinct from old.fight or new_rev = old_rev or new_rev = old_rev + 1 then
    return new;
  end if;
  current_id := public.fight_combatant_list(old.fight)->public.fight_int(old.fight->'currentTurn', 0)->'id';
  select (e.ord - 1)::integer into idx
    from jsonb_array_elements(public.fight_combatant_list(new.fight)) with ordinality as e(value, ord)
   where current_id is not null and e.value->'id' = current_id
   limit 1;
  new.fight := new.fight || jsonb_build_object(
    'currentTurn', coalesce(idx, public.fight_int(new.fight->'currentTurn', 0)),
    'round', public.fight_int(old.fight->'round', 1),
    'turnRevision', old_rev
  );
  return new;
end;
$$;
drop trigger if exists protect_fight_turn on public.encounter_fights;
create trigger protect_fight_turn before update on public.encounter_fights
for each row execute function public.protect_fight_turn();

-- The GM's "next turn" / "previous turn". Atomic under a row lock; `p_base`
-- holds the turn the caller saw (currentTurn, round, turnRevision). If the
-- stored fight has moved on, nothing is applied and the current row comes back
-- so the caller realigns. Runs as the caller: encounter_fights RLS keeps it to
-- the fight's owner.
create or replace function public.commit_fight_turn(p_fight_id text, p_base jsonb, p_step integer)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  f public.encounter_fights;
  k text;
  fallback integer;
begin
  if p_step is null or p_step not in (1, -1) then
    raise exception 'Step must be 1 or -1.' using errcode = '22023';
  end if;
  select * into f from public.encounter_fights where id = p_fight_id for update;
  if not found then
    raise exception 'Fight unavailable or no permission.' using errcode = 'P0002';
  end if;
  for k in select jsonb_object_keys(coalesce(p_base, '{}'::jsonb)) loop
    if k not in ('currentTurn', 'round', 'turnRevision') then continue; end if;
    fallback := case k when 'round' then 1 else 0 end;
    if public.fight_int(f.fight->k, fallback) is distinct from public.fight_int(p_base->k, fallback) then
      return jsonb_build_object('applied', false, 'row', to_jsonb(f));
    end if;
  end loop;
  update public.encounter_fights
     set fight = fight || public.fight_turn_step(fight, p_step)
           || jsonb_build_object('turnRevision', public.fight_int(fight->'turnRevision', 0) + 1),
         updated_at = now()
   where id = p_fight_id
  returning * into f;
  if not found then
    raise exception 'No permission to change this fight.' using errcode = '42501';
  end if;
  return jsonb_build_object('applied', true, 'row', to_jsonb(f));
end;
$$;
revoke all on function public.commit_fight_turn(text, jsonb, integer) from public, anon;
grant execute on function public.commit_fight_turn(text, jsonb, integer) to authenticated;

-- 2) Which fight a scene shows ------------------------------------------------

create table if not exists public.map_scene_turns (
  scene_id    uuid primary key references public.map_scenes(id) on delete cascade,
  -- NULL: the scene shows no initiative.
  instance_id text,
  fight_id    text,
  -- Projection of the shown fight's round, for players (they cannot read the
  -- fight). Kept by the triggers below; a client value is replaced.
  round       integer,
  updated_at  timestamptz not null default now()
);

create index if not exists map_scene_turns_fight_idx on public.map_scene_turns(fight_id);

alter table public.map_scene_turns enable row level security;

-- Read like the scene itself: the GM always, players while it is live.
drop policy if exists map_scene_turns_select on public.map_scene_turns;
create policy map_scene_turns_select on public.map_scene_turns
  for select using (
    public.is_campaign_gm(public.map_scene_campaign(scene_id))
    or (
      public.map_scene_is_live(scene_id)
      and public.map_scene_campaign(scene_id) in (select public.user_campaign_ids())
    )
  );

drop policy if exists map_scene_turns_insert on public.map_scene_turns;
create policy map_scene_turns_insert on public.map_scene_turns
  for insert with check (public.is_campaign_gm(public.map_scene_campaign(scene_id)));

drop policy if exists map_scene_turns_update on public.map_scene_turns;
create policy map_scene_turns_update on public.map_scene_turns
  for update using (public.is_campaign_gm(public.map_scene_campaign(scene_id)))
  with check (public.is_campaign_gm(public.map_scene_campaign(scene_id)));

drop policy if exists map_scene_turns_delete on public.map_scene_turns;
create policy map_scene_turns_delete on public.map_scene_turns
  for delete using (public.is_campaign_gm(public.map_scene_campaign(scene_id)));

-- The fight a scene shows, read past RLS. Only a fight owned by the GM of the
-- scene's campaign counts, as for linked pieces.
create or replace function public.scene_turn_fight(p_scene uuid)
returns table (instance_id text, fight_id text, fight jsonb)
language sql stable security definer set search_path = public as $$
  select f.instance_id, f.id, f.fight
    from public.map_scene_turns t
    join public.encounter_fights f on f.id = t.fight_id and f.instance_id = t.instance_id
    join public.map_scenes s on s.id = t.scene_id
    join public.campaigns g on g.id = s.campaign_id and g.gm = f.owner
   where t.scene_id = p_scene
$$;
revoke all on function public.scene_turn_fight(uuid) from public, anon, authenticated;

-- A chosen fight that is not the GM's is no choice at all; the round is the
-- fight's, never the writer's.
create or replace function public.guard_scene_turns()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  shown jsonb;
begin
  select f.fight into shown
    from public.encounter_fights f
    join public.map_scenes s on s.id = new.scene_id
    join public.campaigns g on g.id = s.campaign_id and g.gm = f.owner
   where f.id = new.fight_id and f.instance_id = new.instance_id;
  if shown is null then
    new.instance_id := null;
    new.fight_id := null;
    new.round := null;
  else
    new.round := public.fight_int(shown->'round', 1);
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists guard_scene_turns on public.map_scene_turns;
create trigger guard_scene_turns before insert or update on public.map_scene_turns
for each row execute function public.guard_scene_turns();

-- 3) The projection onto pieces -----------------------------------------------

alter table public.map_tokens add column if not exists turn_order integer;
alter table public.map_tokens add column if not exists turn_active boolean not null default false;

-- Where a piece stands in its scene's shown fight: a monster by its
-- `source_ref`, a character by its sheet. 1-based; NULL when it is not in it.
create or replace function public.token_turn_slot(p_token public.map_tokens)
returns table (turn_order integer, turn_active boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  shown record;
begin
  select * into shown from public.scene_turn_fight(p_token.scene_id);
  if found then
    return query
      select e.ord::integer, (e.ord - 1) = public.fight_int(shown.fight->'currentTurn', 0)
        from jsonb_array_elements(public.fight_combatant_list(shown.fight)) with ordinality as e(value, ord)
       where (
           p_token.source_ref is not null
           and p_token.source_ref = shown.instance_id || ':' || shown.fight_id || ':' || (e.value->>'id')
           and public.fight_combatant_is_monster(e.value)
         ) or (
           p_token.character_id is not null
           and e.value->>'type' = 'player'
           and e.value->>'sourceId' = p_token.character_id
         )
       order by e.ord
       limit 1;
    if found then return; end if;
  end if;
  return query select null::integer, false;
end;
$$;
revoke all on function public.token_turn_slot(public.map_tokens) from public, anon, authenticated;

create or replace function public.token_turn_differs(p_token public.map_tokens)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  slot record;
begin
  select * into slot from public.token_turn_slot(p_token);
  return (p_token.turn_order, p_token.turn_active) is distinct from (slot.turn_order, coalesce(slot.turn_active, false));
end;
$$;
revoke all on function public.token_turn_differs(public.map_tokens) from public, anon, authenticated;

-- Every insert or update of a piece takes its slot from the shown fight. The
-- GM placing a piece imported from a fight also makes that fight the one the
-- scene shows: putting an encounter on the board is starting it.
create or replace function public.guard_token_turn()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  slot record;
begin
  if tg_op = 'INSERT'
     and new.source_ref is not null
     and public.is_campaign_gm(public.map_scene_campaign(new.scene_id))
     and public.linked_fight_combatant(new.source_ref, new.scene_id) is not null then
    insert into public.map_scene_turns (scene_id, instance_id, fight_id)
    values (new.scene_id, split_part(new.source_ref, ':', 1), split_part(new.source_ref, ':', 2))
    on conflict (scene_id) do update
      set instance_id = excluded.instance_id, fight_id = excluded.fight_id
      where (public.map_scene_turns.instance_id, public.map_scene_turns.fight_id)
        is distinct from (excluded.instance_id, excluded.fight_id);
  end if;
  select * into slot from public.token_turn_slot(new);
  new.turn_order := slot.turn_order;
  new.turn_active := coalesce(slot.turn_active, false);
  return new;
end;
$$;
drop trigger if exists guard_token_turn on public.map_tokens;
create trigger guard_token_turn before insert or update on public.map_tokens
for each row execute function public.guard_token_turn();

-- Re-project the pieces of one scene; only those whose slot actually changes
-- are written (no no-op UPDATE, no realtime event).
create or replace function public.reproject_scene_turns(p_scene uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  -- The scene may be going away in this transaction (cascade).
  if p_scene is null or not exists (select 1 from public.map_scenes where id = p_scene) then return; end if;
  update public.map_tokens t set turn_active = t.turn_active
   where t.scene_id = p_scene and public.token_turn_differs(t);
end;
$$;
revoke all on function public.reproject_scene_turns(uuid) from public, anon, authenticated;

create or replace function public.project_scene_turn_choice()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.reproject_scene_turns(coalesce(new.scene_id, old.scene_id));
  return null;
end;
$$;
drop trigger if exists project_scene_turn_choice on public.map_scene_turns;
create trigger project_scene_turn_choice after insert or delete or update of instance_id, fight_id
on public.map_scene_turns
for each row execute function public.project_scene_turn_choice();

-- A fight change re-projects the scenes showing it: the round on their row,
-- the slots on their pieces. A deleted fight is shown nowhere any more.
create or replace function public.project_fight_turns()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  shown record;
begin
  if tg_op = 'DELETE' then
    update public.map_scene_turns set instance_id = null, fight_id = null
     where fight_id = old.id and instance_id = old.instance_id;
    return null;
  end if;
  if tg_op = 'UPDATE' and new.fight is not distinct from old.fight then return null; end if;
  for shown in
    select t.scene_id, t.round from public.map_scene_turns t
     where t.fight_id = new.id and t.instance_id = new.instance_id
  loop
    if shown.round is distinct from public.fight_int(new.fight->'round', 1) then
      update public.map_scene_turns set round = round where scene_id = shown.scene_id;
    end if;
    perform public.reproject_scene_turns(shown.scene_id);
  end loop;
  return null;
end;
$$;
drop trigger if exists project_fight_turns on public.encounter_fights;
create trigger project_fight_turns after insert or update or delete on public.encounter_fights
for each row execute function public.project_fight_turns();

-- Players follow the row of their live scene. REPLICA IDENTITY FULL: a delete
-- must carry the scene for RLS to decide who may hear of it.
alter table public.map_scene_turns replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'map_scene_turns'
  ) then
    alter publication supabase_realtime add table public.map_scene_turns;
  end if;
end $$;
