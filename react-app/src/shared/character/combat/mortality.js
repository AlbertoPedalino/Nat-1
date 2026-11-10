import {
  DEAD_CONDITION_KEY, EXHAUSTION_KEY, normalizeConditions, setConditionActive, toggleCondition,
} from './conditions.js';
import { clampDeathSaveCount, normalizeDeathSaves } from './vitals.js';

// Whether a creature at `hp` is dead, and the Dead condition and death saves
// that go with it — the one rule every place that changes hit points, death
// saves or the Dead condition resolves through:
//
//   - a monster is dead at 0 HP;
//   - a player character at 0 HP is dying, and dead only with three failed
//     death saves or the Dead condition;
//   - a dead player character shows three failed saves.
//
// Returns { dead, conditions, deathSaves }; otherwise the death saves pass
// through untouched. Clearing them when a creature regains hit points is the
// healing's business, not a rule to apply on every read: a synced sheet keeps
// the saves it has.
export function resolveMortality({ player, hp, deathSaves, conditions }) {
  const atZero = !(Number(hp) > 0);
  const saves = normalizeDeathSaves(deathSaves);
  const dead = atZero && (!player || saves.fail >= 3 || normalizeConditions(conditions).includes(DEAD_CONDITION_KEY));
  return {
    dead,
    conditions: setConditionActive(conditions, DEAD_CONDITION_KEY, dead),
    deathSaves: player && dead ? { ...saves, fail: 3 } : deathSaves,
  };
}

// A player character at 0 HP: where the death save controls belong, dead or
// not (a dead character's saves can still be corrected).
export function atDeathsDoor({ player, hp }) {
  return Boolean(player) && hp != null && Number(hp) === 0;
}

// A player character at 0 HP and not yet dead: the one rolling death saves.
export function isDying({ player, hp, conditions }) {
  return atDeathsDoor({ player, hp }) && !normalizeConditions(conditions).includes(DEAD_CONDITION_KEY);
}

// The changes a sheet, the encounter builder and the battle map make by hand,
// on the same { player, hp, deathSaves, conditions } shape. Each returns
// { hp, deathSaves, conditions, dead }.

// Marking a creature Dead drops it to 0 HP; a character fails all three saves.
export function markDead({ player, deathSaves, conditions }) {
  return {
    hp: 0,
    deathSaves: player ? { success: 0, fail: 3 } : deathSaves,
    conditions: setConditionActive(conditions, DEAD_CONDITION_KEY, true),
    dead: true,
  };
}

// Removing Dead brings a creature back at 1 HP with clean death saves.
export function revive({ player, deathSaves, conditions }) {
  return {
    hp: 1,
    deathSaves: player ? { success: 0, fail: 0 } : deathSaves,
    conditions: setConditionActive(conditions, DEAD_CONDITION_KEY, false),
    dead: false,
  };
}

// A condition clicked on or off, the way every surface does it: Dead kills
// or revives (markDead / revive), Exhaustion is graded and left to whoever
// owns its level, any other just toggles. Returns { hp, deathSaves,
// conditions, dead }.
export function toggleMortalCondition(state, key) {
  const conditions = normalizeConditions(state.conditions);
  if (key === DEAD_CONDITION_KEY) {
    return (conditions.includes(DEAD_CONDITION_KEY) ? revive : markDead)({ ...state, conditions });
  }
  return {
    hp: state.hp,
    deathSaves: state.deathSaves,
    conditions: key === EXHAUSTION_KEY ? conditions : normalizeConditions(toggleCondition(conditions, key)),
    dead: conditions.includes(DEAD_CONDITION_KEY),
  };
}

// One death-save count set to `count`: the third failure kills (at 0 HP), and
// taking it back revives.
export function withDeathSave({ hp, deathSaves, conditions }, type, count) {
  const saves = { ...normalizeDeathSaves(deathSaves), [type]: clampDeathSaveCount(count) };
  const dead = saves.fail >= 3;
  return {
    hp: dead ? 0 : hp,
    deathSaves: saves,
    conditions: setConditionActive(conditions, DEAD_CONDITION_KEY, dead),
    dead,
  };
}

// Clicking the pip that is already the count takes one back.
export function clickedDeathSaveCount(current, clicked) {
  return Number(current) === Number(clicked) ? clicked - 1 : clicked;
}
