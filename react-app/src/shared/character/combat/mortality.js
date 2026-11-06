import { DEAD_CONDITION_KEY, normalizeConditions, setConditionActive } from './conditions.js';
import { normalizeDeathSaves } from './vitals.js';

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
