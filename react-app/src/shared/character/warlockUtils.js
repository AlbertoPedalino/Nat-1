function norm(value) {
  return String(value || '').split('|')[0].trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function invocationNameFromValue(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.split('|')[0].trim();
  if (typeof value === 'object') {
    const raw = value.name || value.label || value.value || value.id || '';
    return String(raw || '').split('|')[0].trim();
  }
  return String(value || '').split('|')[0].trim();
}

function invocationNamesFromChoiceValue(value) {
  const arr = Array.isArray(value) ? value : [value];
  return arr
    .map(invocationNameFromValue)
    .filter(Boolean);
}

export function warlockInvocationSelectionsFromChoices(choices, keyPrefix = '') {
  if (!choices || typeof choices !== 'object') return [];
  const prefix = String(keyPrefix || '');
  const out = [];
  Object.entries(choices).forEach(function (entry) {
    const key = String(entry[0] || '');
    const matches = prefix
      ? key.startsWith(prefix + 'warlock_invocation_')
      : key.replace(/^mc\d+_/, '').startsWith('warlock_invocation_');
    if (!matches) return;
    invocationNamesFromChoiceValue(entry[1]).forEach(function (name) { out.push(name); });
  });
  return out;
}

export function warlockInvocationSelections(character, keyPrefix = '') {
  return warlockInvocationSelectionsFromChoices(character?.choices || {}, keyPrefix);
}

export function warlockHasInvocation(character, invocationName) {
  if (!invocationName) return false;
  const wanted = norm(invocationName);
  return warlockInvocationSelections(character).some(function(name) { return norm(name) === wanted; });
}

export function warlockHasInvocationInChoices(choices, invocationName) {
  if (!invocationName) return false;
  const wanted = norm(invocationName);
  return warlockInvocationSelectionsFromChoices(choices).some(function(name) { return norm(name) === wanted; });
}

export function warlockLevel(character) {
  if (!character) return 0;
  var out = 0;
  if (String(character.className || '').toLowerCase() === 'warlock') out += Number(character.classLevel || character.level || 0);
  (character.extraClasses || []).forEach(function (ec) {
    if (String(ec?.name || '').toLowerCase() === 'warlock') out += Number(ec.level || 0);
  });
  return out;
}

export function warlockKnownInvocations(character) {
  return warlockInvocationSelections(character)
    .map(function (name) { return norm(name); })
    .filter(Boolean);
}

// ── Eldritch Invocations that attach a modifier to a chosen damaging cantrip ──
// Single source of truth for the "choose a known Warlock cantrip" invocations.
// Drives the builder choice specs and sheet cantrip modifiers (see warlock.js),
// plus the choice-key exclusion below so these picks are not treated as granted
// or known spells. Add an entry here to support a new such invocation.
// `minRangeFeet` narrows the eligible cantrips to those with at least that range
// (Eldritch Spear: "a range of 10 feet or greater"); omit for no range restriction.
export const WARLOCK_MODIFIER_CANTRIP_INVOCATIONS = [
  { invocation: 'Agonizing Blast', slug: 'agonizing_blast', minLevel: 2 },
  { invocation: 'Repelling Blast', slug: 'repelling_blast', minLevel: 2 },
  { invocation: 'Eldritch Spear', slug: 'eldritch_spear', minLevel: 2, minRangeFeet: 10 },
];

const _MODIFIER_CANTRIP_CHOICE_KEY_RE = new RegExp(
  '^warlock_(' + WARLOCK_MODIFIER_CANTRIP_INVOCATIONS.map(function (m) { return m.slug; }).join('|') + ')_cantrip'
);

// Builder choice key for a modifier-cantrip invocation slot. Index suffix is added
// only when the invocation is taken more than once, matching the legacy key shape.
export function warlockModifierCantripChoiceKey(slug, index, total) {
  const base = 'warlock_' + slug + '_cantrip';
  return total > 1 ? base + '_' + index : base;
}

// True for choice keys produced by warlockModifierCantripChoiceKey. Such choices
// store a cantrip name but only attach a modifier — they are not granted/known spells.
export function isWarlockModifierCantripChoiceKey(key) {
  return _MODIFIER_CANTRIP_CHOICE_KEY_RE.test(String(key || '').replace(/^mc\d+_/, ''));
}
