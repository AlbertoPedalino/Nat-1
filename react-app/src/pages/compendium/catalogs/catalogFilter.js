import { normalizeSearchText } from '../../../shared/content/searchText.js';
import { sourceLabel } from '../../../shared/content/sourcePriority.js';
import { countChosenValues, fieldDefaults, fieldTests } from '../../../shared/content/filterFields.js';
import { byName } from '../../../shared/lists.js';

// A compendium catalog (spells, monsters, magic items, equipment) is one
// definition:
//
//   { key, label, select(entry) — the index entries it lists,
//     fields: [...] — its filters (shared/content/filterFields.js),
//     sorts: [{ key, label, compare? }] — the first is the default }
//
// The search (every word in the name) and the source are every catalog's:
// the source is one more field (catalogFields), its books those the catalog
// holds.

const SOURCE_FIELD = Object.freeze({
  kind: 'select',
  key: 'source',
  label: 'Source',
  options: (entries) => sourceOptions(entries),
  valueOf: (record, entry) => entry.source,
});

// A catalog's fields, its source included.
export function catalogFields(definition) {
  return [...definition.fields, SOURCE_FIELD];
}

export function catalogDefaults(definition) {
  return { search: '', sort: definition.sorts[0].key, ...fieldDefaults(catalogFields(definition)) };
}

// Whether anything is chosen beyond the order: a search or a filter.
export function catalogFiltering(definition, filters) {
  return Boolean(String(filters?.search || '').trim()) || countChosenValues(catalogFields(definition), filters) > 0;
}

export function catalogEntries(definition, index) {
  return (index || []).filter(definition.select);
}

export function sourceOptions(entries) {
  return [...new Set(entries.map((entry) => entry.source))].sort()
    .map((source) => ({ key: source, label: sourceLabel(source) }));
}

// The entries the filters keep, in the chosen order (the name breaking ties,
// name order when the sort has no comparator).
export function runCatalog(definition, entries, filters = {}) {
  const f = { ...catalogDefaults(definition), ...filters };
  const terms = normalizeSearchText(f.search).split(' ').filter(Boolean);
  const tests = fieldTests(catalogFields(definition), f);
  const list = (entries || []).filter((entry) => (
    terms.every((term) => entry.nameText.includes(term))
    && tests.every((test) => test(entry.record, entry))
  ));
  const compare = definition.sorts.find((sort) => sort.key === f.sort)?.compare;
  return list.sort(compare ? (a, b) => compare(a, b) || byName(a, b) : byName);
}
