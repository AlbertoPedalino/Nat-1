// Enemy vitals live in one place: the combatant inside its `encounter_fights`
// row. The builder and the battle map both write them through
// `commit_fight_combatant_vitals`; a linked map piece only displays a copy the
// database derives from the fight (see supabase/encounter_fight_vitals.sql).
//
// Everything here is pure: the callers own the requests and the state.

import { fightWithTokenVitals, parseSourceRef } from './encounterSync.js';

// Must match public.fight_monster_vital_keys() in encounter_fight_vitals.sql.
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

// The GM's view of real hit points, overlaid on the public rows at render: a
// piece linked to a loaded cloud fight takes its combatant's, any other its
// private values. `fights` maps fight id -> { instance_id, fight }.
export function withGmTokenVitals(tokens, { byToken = {}, fights = {} } = {}) {
  return (tokens || []).map((token) => {
    if (!token || token.characterId) return token;
    const ref = parseSourceRef(token.sourceRef);
    const row = ref ? fights[ref.fightId] : null;
    const combatant = row && String(row.instance_id) === ref.instanceId
      ? (row.fight?.combatants || []).find((c) => String(c?.id) === ref.combatantId && isMonsterCombatant(c))
      : null;
    const real = combatant
      ? { hpCurrent: combatant.hpCurrent ?? null, hpMax: combatant.hpMax ?? null }
      : byToken[token.id];
    if (!real || (real.hpCurrent === token.hpCurrent && real.hpMax === token.hpMax)) return token;
    return { ...token, hpCurrent: real.hpCurrent, hpMax: real.hpMax };
  });
}

// A linked piece's displayed values as the combatant they mirror, and the same
// combatant after an edit made on the map, with the builder's mortality rules
// (0 HP is Dead; Dead is 0 HP; removing Dead from a 0 HP creature revives it).
export function monsterFromToken(token) {
  const conditions = Array.isArray(token?.conditions) ? token.conditions : [];
  return {
    id: 'piece',
    type: 'monster',
    hpCurrent: token?.hpCurrent ?? null,
    hpMax: token?.hpMax ?? null,
    activeConditions: conditions,
    activeEffects: Array.isArray(token?.effects) ? token.effects : [],
    isDead: conditions.includes('dead') || (token?.hpCurrent != null && Number(token.hpCurrent) <= 0),
  };
}

export function monsterEditFromToken(token, edit) {
  const before = monsterFromToken(token);
  let next = { ...token, ...edit };
  const wasDead = before.activeConditions.includes('dead');
  const nowDead = Array.isArray(next.conditions) && next.conditions.includes('dead');
  if (wasDead && !nowDead && Number(next.hpCurrent) <= 0) next = { ...next, hpCurrent: 1 };
  const [after] = fightWithTokenVitals([before], {
    sourceRef: 'edit:edit:piece',
    hpCurrent: next.hpCurrent,
    hpMax: next.hpMax,
    conditions: next.conditions,
    effects: next.effects,
  }) || [before];
  return { before, after };
}
