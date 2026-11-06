// Turning "one value or a list of them" into a list, the same way everywhere.

// A list as is, a single value as a one-item list, nothing (null/undefined)
// as an empty list.
export function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

// Like asArray, but nested lists and Sets are flattened into one list.
export function flattenList(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.flatMap(flattenList);
  if (value instanceof Set) return Array.from(value).flatMap(flattenList);
  return [value];
}

const TEXT_ORDER = new Intl.Collator('en', { sensitivity: 'base' });

// Alphabetical order, the same in every list: English rules, case and accents
// ignored, whatever the browser's language.
export function compareText(a, b) {
  return TEXT_ORDER.compare(String(a ?? ''), String(b ?? ''));
}

export function byName(a, b) {
  return compareText(a?.name, b?.name);
}
