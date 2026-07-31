/**
 * Predicates for `requiredChoice` gating across builder specs, sheet effects,
 * and auto-granted spells.
 *
 * Adapters are expected to use canonical, exact-match values in
 * `requiredChoice.value` and in option `key`s. Stored choice values are
 * compared by normalized (lowercased, alphanumeric) equality.
 */

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function cleanText(value) {
  if (value == null) return '';
  if (typeof value === 'string') {
    return value
      .split('|')[0]
      .replace(/\{@\w+\s+/g, '')
      .replace(/\}/g, '')
      .trim();
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    const candidate = value.label ?? value.name ?? value.key ?? value.value ?? value.id;
    return cleanText(candidate);
  }
  return String(value).trim();
}

function norm(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

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
  const expectedValues = asArray(requiredChoice.value).map(norm).filter(Boolean);
  if (!expectedValues.length) return true;
  const stored = readChoiceValue(character, requiredChoice.key);
  const storedNorms = asArray(stored).map(norm);
  return expectedValues.some((expected) => storedNorms.includes(expected));
}

export function filterByRequiredChoice(items, character) {
  return (items || []).filter((item) => (
    !item?.requiredChoice ? true : matchesRequiredChoice(character, item.requiredChoice)
  ));
}
