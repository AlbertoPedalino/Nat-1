import { normalizeSearchText } from '../../../shared/content/searchText.js';
import { sourceLabel } from '../../../shared/content/sourcePriority.js';
import { fieldDefaults, fieldTests } from '../../../shared/content/filterFields.js';
import { byName } from '../../../shared/lists.js';

// A compendium catalog (spells, monsters, magic items, equipment) is one
// definition:
//
//   { key, label, select(entry) — the index entries it lists,
//     fields: [...] — its filters (shared/content/filterFields.js),
//     sorts: [{ key, label, compare? }] — the first is the default }
//
// The search (every word in the name) and the source are every catalog's.

export function catalogDefaults(definition) {
  return { search: '', source: 'all', sort: definition.sorts[0].key, ...fieldDefaults(definition.fields) };
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
  const tests = fieldTests(definition.fields, f);
  const list = (entries || []).filter((entry) => (
    terms.every((term) => entry.nameText.includes(term))
    && (f.source === 'all' || entry.source === f.source)
    && tests.every((test) => test(entry.record, entry))
  ));
  const compare = definition.sorts.find((sort) => sort.key === f.sort)?.compare;
  return list.sort(compare ? (a, b) => compare(a, b) || byName(a, b) : byName);
}
