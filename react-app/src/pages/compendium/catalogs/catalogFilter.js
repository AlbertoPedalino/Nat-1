import { normalizeSearchText } from '../../../shared/content/searchText.js';
import { sourceLabel } from '../../../shared/content/sourcePriority.js';
import { rangeFilterKeys } from '../../../shared/character/inventory/itemFilters.js';
import { asArray, byName } from '../../../shared/lists.js';
import { withinTypedRange } from '../../../shared/numbers.js';

// A compendium catalog (spells, monsters, magic items, equipment) is one
// definition:
//
//   { key, label, select(entry) — the index entries it lists,
//     fields: [...] — its filters,
//     sorts: [{ key, label, compare? }] — the first is the default }
//
// Each filter is described once, and its default, its test and its control
// all come from that description:
//
//   select — { kind: 'select', key, label, options (a list, or entries => list),
//              valueOf(record, entry) (one value or a list) or
//              match(record, chosen, entry) when "is one of" is not the test }
//   yesNo  — { kind: 'yesNo', key, label, test(record) }
//   range  — { kind: 'range', key, label, unit, step, valueOf(record) }, typed
//            as min and max (the item filters' own fields fit as they are)
//
// The search (every word in the name) and the source are every catalog's.

export const YES_NO_OPTIONS = Object.freeze([{ key: 'yes', label: 'Yes' }, { key: 'no', label: 'No' }]);

// What "no choice" is for a field: 'all' for a select, 'any' for yes/no.
export function anyValue(field) {
  return field.kind === 'yesNo' ? 'any' : 'all';
}

export function catalogDefaults(definition) {
  const out = { search: '', source: 'all', sort: definition.sorts[0].key };
  definition.fields.forEach((field) => {
    if (field.kind === 'range') rangeFilterKeys(field).forEach((key) => { out[key] = ''; });
    else out[field.key] = anyValue(field);
  });
  return out;
}

export function catalogEntries(definition, index) {
  return (index || []).filter(definition.select);
}

export function sourceOptions(entries) {
  return [...new Set(entries.map((entry) => entry.source))].sort()
    .map((source) => ({ key: source, label: sourceLabel(source) }));
}

export function fieldOptions(field, entries) {
  return typeof field.options === 'function' ? field.options(entries) : field.options;
}

// The field's test for the chosen filters, or null when it is not filtering.
function fieldTest(field, filters) {
  if (field.kind === 'range') {
    const [minKey, maxKey] = rangeFilterKeys(field);
    if (!String(filters[minKey] ?? '').trim() && !String(filters[maxKey] ?? '').trim()) return null;
    return (record) => withinTypedRange(field.valueOf(record), filters[minKey], filters[maxKey]);
  }
  const chosen = filters[field.key];
  if (chosen === anyValue(field)) return null;
  if (field.kind === 'yesNo') return (record) => Boolean(field.test(record)) === (chosen === 'yes');
  if (field.match) return (record, entry) => field.match(record, chosen, entry);
  return (record, entry) => asArray(field.valueOf(record, entry)).includes(chosen);
}

// The entries the filters keep, in the chosen order (the name breaking ties,
// name order when the sort has no comparator).
export function runCatalog(definition, entries, filters = {}) {
  const f = { ...catalogDefaults(definition), ...filters };
  const terms = normalizeSearchText(f.search).split(' ').filter(Boolean);
  const tests = definition.fields.map((field) => fieldTest(field, f)).filter(Boolean);
  const list = (entries || []).filter((entry) => (
    terms.every((term) => entry.nameText.includes(term))
    && (f.source === 'all' || entry.source === f.source)
    && tests.every((test) => test(entry.record, entry))
  ));
  const compare = definition.sorts.find((sort) => sort.key === f.sort)?.compare;
  return list.sort(compare ? (a, b) => compare(a, b) || byName(a, b) : byName);
}
