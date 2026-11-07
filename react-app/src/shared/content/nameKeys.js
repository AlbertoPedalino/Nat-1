import { stripMarkup } from './markupText.js';
import { asArray, compareText } from '../lists.js';

// Turning a name into something to compare or show, the same way everywhere.
// Each helper has one meaning; pick the one that says what the comparison is.

// Lowercase letters and digits only: "Sleight of Hand" and "sleight-of-hand"
// match. For comparing names and ids.
export function matchKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Lowercase and trimmed, punctuation kept: for comparing values whose
// punctuation matters (item flags, spell ids).
export function lowerKey(value) {
  return String(value || '').trim().toLowerCase();
}

// A 5etools reference without its source: "Longsword|XPHB" -> "Longsword".
// A lowercase "name|source" key for records looked up by both.
export function recordKey(name, source) {
  return `${String(name || '').toLowerCase()}|${String(source || '').toLowerCase()}`;
}

export function stripSource(value) {
  return String(value || '').split('|')[0].trim();
}

// A 5etools reference "Name|SOURCE|..." as { name, source }, trimmed ('' when
// missing).
export function splitNameSource(value) {
  const [name = '', source = ''] = String(value ?? '').split('|');
  return { name: name.trim(), source: source.trim() };
}

// The readable text of a stored choice: a string without its source and
// {@tag } markup, a number as text, an option object by its label/name/key.
export function choiceText(value) {
  if (value == null) return '';
  if (typeof value === 'string') {
    return stripMarkup(value).split('|')[0].trim();
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    return choiceText(value.label ?? value.name ?? value.key ?? value.value ?? value.id);
  }
  return String(value).trim();
}

// A stored choice as a comparison key.
export function choiceKey(value) {
  return matchKey(choiceText(value));
}

// Labels without repeats: each value turned into its label by `toLabel`,
// compared loosely (matchKey), empty ones dropped, first spelling kept;
// alphabetical with `sort`.
export function uniqueLabels(values, toLabel = (value) => String(value ?? ''), { sort = false } = {}) {
  const seen = new Set();
  const out = [];
  asArray(values).flat().forEach((value) => {
    if (value == null || value === '') return;
    const label = toLabel(value);
    const key = matchKey(label);
    if (!label || !key || seen.has(key)) return;
    seen.add(key);
    out.push(label);
  });
  return sort ? out.sort(compareText) : out;
}
