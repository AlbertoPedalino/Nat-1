import { matchesRequiredChoice } from './lineageMatch.js';
import { warlockHasInvocation } from './warlockUtils.js';

/**
 * Single source of truth for "is this auto-granted spell actually unlocked?".
 *
 * Auto-granted spells (class/subclass/species `alwaysKnownSpells` &
 * `alwaysPreparedSpells`, and class at-will spells) may be gated behind a player
 * choice. Two declarative tags express that gate on an entry:
 *
 *   - `requiredChoice: { key, value }` — generic single-pick gate. Used by species
 *     lineages (`species_version`) and class sub-orders (`cleric_divine_order`, …).
 *   - `invocation: '<name>'` — Warlock-only gate. Eldritch Invocations live across
 *     multiple slot keys (`warlock_invocation_1..10`), so a single-key
 *     `requiredChoice` can't express them; `warlockHasInvocation` scans every slot.
 *
 * An entry with neither tag is unconditional and always unlocked. Both the builder
 * and the character sheet route every gated grant through this predicate so the two
 * surfaces can never disagree on what a character knows.
 *
 * @param {object|null} entry - the grant entry (may carry `requiredChoice`/`invocation`)
 * @param {object} character - the character to evaluate the gate against
 * @returns {boolean}
 */
export function isGrantUnlocked(entry, character) {
  return matchesRequiredChoice(character, entry?.requiredChoice)
    && (!entry?.invocation || warlockHasInvocation(character, entry.invocation));
}
