import { asArray } from '../../lists.js';
import { choiceKey } from '../../content/nameKeys.js';
import { readChoiceValue } from './choiceUtils.js';
/**
 * Predicates for `requiredChoice` gating across builder specs, sheet effects,
 * and auto-granted spells.
 *
 * Adapters are expected to use canonical, exact-match values in
 * `requiredChoice.value` and in option `key`s. Stored choice values are
 * compared by normalized (lowercased, alphanumeric) equality.
 */

// `prefix`: the owner's multiclass choice prefix (`mc<i>_`), whose copy of the
// choice is read first.
export function matchesRequiredChoice(character, requiredChoice, { prefix = '' } = {}) {
  if (!requiredChoice?.key) return true;
  const expectedValues = asArray(requiredChoice.value).map(choiceKey).filter(Boolean);
  if (!expectedValues.length) return true;
  const stored = (prefix ? readChoiceValue(character, `${prefix}${requiredChoice.key}`) : null)
    ?? readChoiceValue(character, requiredChoice.key);
  const storedNorms = asArray(stored).map(choiceKey);
  return expectedValues.some((expected) => storedNorms.includes(expected));
}

export function filterByRequiredChoice(items, character) {
  return (items || []).filter((item) => (
    !item?.requiredChoice ? true : matchesRequiredChoice(character, item.requiredChoice)
  ));
}
