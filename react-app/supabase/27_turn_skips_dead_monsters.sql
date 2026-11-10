-- ============================================================================
-- GM Board — "Next turn" passes over dead monsters only.
--
-- Run AFTER 20_scene_turns.sql. Safe to re-run. Changes no table.
--
-- The turn step skipped every combatant marked `isDead`. For a character that
-- flag is only a copy of their sheet, refreshed while an Encounter Builder tab
-- runs, so the map's "Next turn" could stop on a character killed on their
-- sheet or skip one just revived. User decision 2026-11-10: a character keeps
-- their turn dead or alive (death is often not the end of them, and the GM
-- moves on with one click); only a dead monster is passed over. Must match
-- skipsTurn in src/shared/encounter/initiative.js.
-- ============================================================================

create or replace function public.fight_turn_skips(p_combatant jsonb)
returns boolean language sql immutable as $$
  select coalesce(p_combatant->'isDead' = 'true'::jsonb, false)
     and (p_combatant->>'type') is distinct from 'player'
$$;

create or replace function public.fight_turn_step(p_fight jsonb, p_step integer)
returns jsonb language plpgsql immutable as $$
declare
  list jsonb := public.fight_combatant_list(p_fight);
  n integer := jsonb_array_length(list);
  turn integer := public.fight_int(p_fight->'currentTurn', 0);
  rnd integer := public.fight_int(p_fight->'round', 1);
  someone_acts boolean;
  safety integer := 0;
begin
  if n = 0 then
    return jsonb_build_object('currentTurn', turn, 'round', rnd);
  end if;
  someone_acts := exists (
    select 1 from jsonb_array_elements(list) as c(value) where not public.fight_turn_skips(c.value)
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
    exit when not (public.fight_turn_skips(list->turn) and someone_acts and safety < n);
  end loop;
  return jsonb_build_object('currentTurn', turn, 'round', rnd);
end;
$$;
