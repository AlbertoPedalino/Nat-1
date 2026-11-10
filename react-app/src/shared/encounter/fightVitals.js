// Enemy vitals live in one place: the combatant inside its `encounter_fights`
// row. The builder and the battle map both write them through
// `commit_fight_combatant_vitals`; a linked map piece only displays a copy the
// database derives from the fight (see supabase/14_token_vitals.sql).
//
// Everything here is pure: the callers own the requests and the state.

import { parseSourceRef } from '../vtt/tokens/encounterSync.js';
import { clampTempHp } from '../character/combat/vitals.js';

// Must match public.fight_monster_vital_keys() in 14_token_vitals.sql.
export const MONSTER_VITAL_KEYS = Object.freeze([
  'hpCurrent', 'hpMax', 'tempHP', 'maxHPBonus', 'activeConditions', 'activeEffects', 'isDead',
]);

// The values a change is computed from. Conditions and effects are toggles
// and do not take part in the conflict check.
const BASE_KEYS = ['hpCurrent', 'hpMax', 'tempHP'];

export function isMonsterCombatant(combatant) {
  return Boolean(combatant) && combatant.type !== 'player' && !combatant.sourceId;
}

function same(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

export function monsterVitalsBase(combatant) {
  return Object.fromEntries(BASE_KEYS.map((key) => [key, combatant?.[key] ?? null]));
}

// Only the fields that actually changed: an identical edit is an empty patch
// and must not reach the database at all.
export function monsterVitalsPatch(before, after) {
  const patch = {};
  if (!after) return patch;
  for (const key of MONSTER_VITAL_KEYS) {
    if (!Object.hasOwn(after, key)) continue;
    if (!same(before?.[key], after[key])) patch[key] = after[key] ?? null;
  }
  return patch;
}

// Take the stored vitals of every monster in `fight` (a row's `fight` column)
// into `combat`. Returns the same object when nothing differs, so absorbing an
// echo of our own write is a no-op for React and for the save hook.
export function absorbMonsterVitals(combat, fight) {
  const stored = new Map((fight?.combatants || [])
    .filter((combatant) => combatant?.id != null)
    .map((combatant) => [String(combatant.id), combatant]));
  if (!combat || !stored.size) return combat;
  let changed = false;
  const combatants = (combat.combatants || []).map((combatant) => {
    if (!isMonsterCombatant(combatant)) return combatant;
    const source = stored.get(String(combatant.id));
    if (!source || !isMonsterCombatant(source)) return combatant;
    const patch = {};
    for (const key of MONSTER_VITAL_KEYS) {
      if (Object.hasOwn(source, key) && !same(combatant[key], source[key])) patch[key] = source[key];
    }
    if (!Object.keys(patch).length) return combatant;
    changed = true;
    return { ...combatant, ...patch };
  });
  return changed ? { ...combat, combatants } : combat;
}

// A piece's hit points in a combatant's field names, and back: the one place
// the map's `tempHp` / `maxHpBonus` / `conditions` meet the fight's `tempHP` /
// `maxHPBonus` / `activeConditions`.
export function creatureVitalsOfToken(token) {
  return {
    hpCurrent: token?.hpCurrent ?? null,
    hpMax: token?.hpMax ?? null,
    tempHP: token?.tempHp ?? 0,
    maxHPBonus: token?.maxHpBonus ?? 0,
    activeConditions: token?.conditions || [],
  };
}

export function tokenVitalsOfCreature(creature) {
  return {
    hpCurrent: creature?.hpCurrent ?? null,
    hpMax: creature?.hpMax ?? null,
    tempHp: clampTempHp(creature?.tempHP),
    maxHpBonus: Math.round(Number(creature?.maxHPBonus) || 0),
  };
}

// The GM's view of real hit points, overlaid on the public rows at render: a
// piece linked to a loaded cloud fight takes its combatant's, any other its
// private values. `fights` maps fight id -> { instance_id, fight }.
export function withGmTokenVitals(tokens, { byToken = {}, fights = {} } = {}) {
  return (tokens || []).map((token) => {
    if (!token || token.characterId) return token;
    const combatant = linkedCombatant(fights, parseSourceRef(token.sourceRef));
    const stored = combatant || (byToken[token.id] && creatureVitalsOfToken(byToken[token.id]));
    if (!stored) return token;
    const real = tokenVitalsOfCreature(stored);
    if (Object.keys(real).every((key) => real[key] === token[key])) return token;
    return { ...token, ...real };
  });
}

// The monster combatant a parsed source ref names, as stored in its loaded
// fight row.
export function linkedCombatant(fights, ref) {
  const row = ref ? fights?.[ref.fightId] : null;
  if (!row || String(row.instance_id) !== ref.instanceId) return null;
  return (row.fight?.combatants || []).find((c) => String(c?.id) === ref.combatantId && isMonsterCombatant(c)) || null;
}


// Of two copies of one fight row, the one with the newer enemy vitals. The
// database advances `vitals_revision` on every vitals command and on nothing
// else, so it orders a late read against a realtime event where `updated_at`
// (stamped by the browser on an ordinary save) cannot. Either copy lacking it
// is not compared: the incoming one wins, as before.
export function newerFightRow(held, incoming) {
  const before = Number(held?.vitals_revision);
  const after = Number(incoming?.vitals_revision);
  if (held && Number.isFinite(before) && Number.isFinite(after) && after < before) return held;
  // The turn has its own counter (20_scene_turns.sql), advanced by "next turn".
  const turnBefore = Number(held?.fight?.turnRevision) || 0;
  const turnAfter = Number(incoming?.fight?.turnRevision) || 0;
  if (held && turnAfter < turnBefore) return held;
  return incoming;
}
