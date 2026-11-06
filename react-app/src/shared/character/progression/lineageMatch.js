import { asArray } from '../../lists.js';
import { choiceKey } from '../../content/nameKeys.js';
/**
 * Predicates for `requiredChoice` gating across builder specs, sheet effects,
 * and auto-granted spells.
 *
 * Adapters are expected to use canonical, exact-match values in
 * `requiredChoice.value` and in option `key`s. Stored choice values are
 * compared by normalized (lowercased, alphanumeric) equality.
 */

function readChoiceValue(character, key) {
  if (!character || !key) return null;

  const direct = character?.choices?.[key];
  if (direct != null) return direct;

  const normalized = character?.normalizedChoices || {};
  const byKey = normalized.rawByKey || {};
  if (byKey[key] != null) return byKey[key];

  const buckets = [
    normalized.classOptions,
    normalized.subclassOptions,
    normalized.species?.options,
    normalized.background?.options,
    normalized.feats?.byKey,
    normalized.spells?.byKey,
  ];
  for (const bucket of buckets) {
    if (bucket && bucket[key] != null) return bucket[key];
  }

  const found = Object.entries(character?.choices || {}).find(([choiceKey]) => (
    String(choiceKey || '').replace(/^mc\d+_/, '') === key
  ));
  return found ? found[1] : null;
}

export function matchesRequiredChoice(character, requiredChoice) {
  if (!requiredChoice?.key) return true;
  const expectedValues = asArray(requiredChoice.value).map(choiceKey).filter(Boolean);
  if (!expectedValues.length) return true;
  const stored = readChoiceValue(character, requiredChoice.key);
  const storedNorms = asArray(stored).map(choiceKey);
  return expectedValues.some((expected) => storedNorms.includes(expected));
}

export function filterByRequiredChoice(items, character) {
  return (items || []).filter((item) => (
    !item?.requiredChoice ? true : matchesRequiredChoice(character, item.requiredChoice)
  ));
}
