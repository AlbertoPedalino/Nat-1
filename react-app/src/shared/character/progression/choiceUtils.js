import { asArray } from '../../lists.js';
import { choiceKey, stripSource } from '../../content/nameKeys.js';
import { classEntities } from './classLevel.js';
// A choice is saved under its base key, or under a multiclass-prefixed copy
// (`mc1_<key>`) when its class was added as a multiclass.
export function baseChoiceKey(key) {
  return String(key || '').replace(/^mc\d+_/, '');
}

const isChoiceKey = (stored, key) => stored === key || baseChoiceKey(stored) === key;

// A character's stored value for a choice key, wherever it was saved: the
// choice itself, the normalized choices (raw, then by bucket), or a
// multiclass-prefixed copy. null when there is none.
export function readChoiceValue(character, key) {
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

  const found = Object.entries(character?.choices || {}).find(([stored]) => baseChoiceKey(stored) === key);
  return found ? found[1] : null;
}

export function getChoiceValue(C, key) {
  if (!C?.choices) return null;
  const match = Object.entries(C.choices).find(([k]) => isChoiceKey(k, key));
  if (!match) return null;
  const raw = match[1];
  return String(Array.isArray(raw) ? raw[0] : raw || '');
}

// The prefix the builder gives a class's choices: none for the primary class,
// `mc<i>_` for the i-th multiclass.
// Where a class's choices are saved: '' for the primary class, `mc<i>_` for
// an extra class. A class skin answers for its base class (a Hunter's choices
// for 'Ranger').
export function classChoicePrefix(C, className) {
  const target = String(className || '').toLowerCase();
  const entity = classEntities(C).find((candidate) => (
    candidate.className.toLowerCase() === target || candidate.ruleClassName.toLowerCase() === target
  ));
  return entity?.choicePrefix || '';
}

// Patch that sets a single-pick builder choice from the sheet, in the builder's
// own format (a one-item array), under the key it is already saved as — or, if
// never chosen, the key the builder uses for `className`'s choices.
export function setChoiceValuePatch(C, key, value, { className = '' } = {}) {
  const choices = { ...(C?.choices || {}) };
  const storedKey = Object.keys(choices).find((k) => isChoiceKey(k, key))
    || `${classChoicePrefix(C, className)}${key}`;
  choices[storedKey] = [value];
  return { choices };
}

export function inventoryHasFlag(inventory, requirement) {
  if (!requirement || !inventory) return false;
  const spec = typeof requirement === 'string' ? { flag: requirement } : requirement;
  const flag = spec.flag;
  if (!flag) return true;
  const itemType = spec.itemType;
  const requireEquipped = spec.equipped === true;
  return inventory.some((item) => {
    if (requireEquipped && !item.equipped) return false;
    if (itemType) {
      const type = String(item.type || '').toUpperCase();
      const types = asArray(itemType);
      if (!types.some((t) => String(t).toUpperCase() === type)) return false;
    }
    return (item.flags || []).includes(flag);
  });
}

// Whether a character's stored choice holds `expected` (names compared without
// source or markup).
export function hasChoiceValue(character, key, expected) {
  const wanted = choiceKey(expected);
  if (!wanted) return false;
  return asArray(readChoiceValue(character, key)).some((value) => choiceKey(value) === wanted);
}

// A class adapter's own choice while the class is being built: the base key,
// or the key with the class's multiclass prefix.
export function classChoiceValue(choices, key, keyPrefix = '') {
  const direct = choices?.[key];
  return direct !== undefined ? direct : choices?.[keyPrefix + key];
}

export function classChoiceIs(choices, key, expected, keyPrefix = '') {
  const wanted = choiceKey(expected);
  return asArray(classChoiceValue(choices, key, keyPrefix)).some((value) => choiceKey(value) === wanted);
}

// The names picked in a character's choices, as name keys (sources dropped):
// every choice, or one class's (`prefix`: '' for the primary class, `mc<i>_`
// for an extra class).
export function choiceValueNames(character, { prefix = null } = {}) {
  const names = new Set();
  Object.entries(character?.choices || {}).forEach(([key, value]) => {
    if (prefix != null && (prefix ? !key.startsWith(prefix) : /^mc\d+_/.test(key))) return;
    asArray(value).forEach((item) => { if (typeof item === 'string') names.add(choiceKey(stripSource(item))); });
  });
  return names;
}
