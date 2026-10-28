// Enemy vitals live in one place: the combatant inside its `encounter_fights`
// row. The builder and the battle map both write them through
// `commit_fight_combatant_vitals`; a linked map piece only displays a copy the
// database derives from the fight (see supabase/14_token_vitals.sql).
//
// Everything here is pure: the callers own the requests and the state.

import { DEAD_CONDITION_KEY, setConditionActive } from '../../character/combat/conditions.js';
import { fightWithTokenVitals, parseSourceRef } from './encounterSync.js';

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

// The GM's view of real hit points, overlaid on the public rows at render: a
// piece linked to a loaded cloud fight takes its combatant's, any other its
// private values. `fights` maps fight id -> { instance_id, fight }.
export function withGmTokenVitals(tokens, { byToken = {}, fights = {} } = {}) {
  return (tokens || []).map((token) => {
    if (!token || token.characterId) return token;
    const combatant = linkedCombatant(fights, parseSourceRef(token.sourceRef));
    const stored = combatant
      ? { hpCurrent: combatant.hpCurrent, hpMax: combatant.hpMax, tempHp: combatant.tempHP, maxHpBonus: combatant.maxHPBonus }
      : byToken[token.id];
    if (!stored) return token;
    const real = {
      hpCurrent: stored.hpCurrent ?? null,
      hpMax: stored.hpMax ?? null,
      tempHp: tempHpOf(stored.tempHp),
      maxHpBonus: Math.round(Number(stored.maxHpBonus) || 0),
    };
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

function tempHpOf(value) {
  return Math.max(0, Math.round(Number(value) || 0));
}

// The commands that are amounts rather than values: safe to apply again to a
// newer copy after a conflict.
export const RELATIVE_VITAL_COMMANDS = new Set(['modifyHp', 'modifyTempHp', 'modifyMaxHp']);

// Damage, healing, temporary and maximum hit points for a creature, with the
// builder's rules (combat.js): damage takes temporary HP first, healing never
// passes the maximum, lowering the maximum lowers current HP but raising it
// heals nothing, and 0 HP is Dead. The commands are the character health
// command names, so the menu sends one intent whatever the piece is.
// Only the fields the command touched change, so the result diffs into a
// minimal fight patch.
export function applyMonsterVitalCommand(before, command) {
  const n = Math.trunc(Number(command?.value ?? command?.delta) || 0);
  const hpMax = before?.hpMax == null ? null : Math.round(Number(before.hpMax));
  const current = Math.round(Number(before?.hpCurrent ?? hpMax ?? 0));
  const clampHp = (value, max = hpMax) => Math.max(0, max == null ? value : Math.min(max, value));
  const next = { ...before };
  switch (command?.type) {
    case 'modifyHp': {
      const temp = tempHpOf(before?.tempHP);
      const absorbed = n < 0 ? Math.min(temp, -n) : 0;
      if (absorbed) next.tempHP = temp - absorbed;
      next.hpCurrent = clampHp(current + n + absorbed);
      break;
    }
    case 'setHp': next.hpCurrent = clampHp(n); break;
    case 'setTempHp': next.tempHP = Math.max(0, n); break;
    case 'modifyTempHp': next.tempHP = Math.max(0, tempHpOf(before?.tempHP) + n); break;
    // A maximum moved by an amount is a new maximum.
    case 'modifyMaxHp':
      return applyMonsterVitalCommand(before, { type: 'setMaxHp', value: (hpMax ?? current) + n });
    case 'setMaxHp': {
      const max = Math.max(1, n);
      next.hpMax = max;
      // A creature without hit points yet starts whole.
      next.hpCurrent = before?.hpCurrent == null && hpMax == null ? max : clampHp(current, max);
      // As the builder's setMaxHp: the change is tracked as a bonus so the
      // base maximum stays recoverable.
      next.maxHPBonus = (Number(before?.maxHPBonus) || 0) + (max - (hpMax ?? max));
      break;
    }
    default: throw new Error('Unknown creature health command.');
  }
  if (next.hpCurrent !== before?.hpCurrent) {
    const dead = next.hpCurrent <= 0;
    const conditions = Array.isArray(before?.activeConditions) ? before.activeConditions : [];
    if (conditions.includes(DEAD_CONDITION_KEY) !== dead) {
      next.activeConditions = setConditionActive(conditions, DEAD_CONDITION_KEY, dead);
    }
    if (Boolean(before?.isDead) !== dead) next.isDead = dead;
  }
  return next;
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
