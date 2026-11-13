import { rangeFilterKeys } from '../character/inventory/itemFilters.js';
import { asArray } from '../lists.js';
import { withinTypedRange } from '../numbers.js';

// A list's filters, each described once: its default, its test and its
// control (FilterFieldControls) all come from that description. The
// compendium's catalogs and the bestiary browser filter through here.
//
//   select — { kind: 'select', key, label, options (a list, or entries => list),
//              valueOf(record, entry) (one value or a list) or
//              match(record, chosen, entry) when "is one of" is not the test }
//   yesNo  — { kind: 'yesNo', key, label, test(record) }
//   range  — { kind: 'range', key, label, unit, step, valueOf(record) }, typed
//            as min and max (the item filters' own fields fit as they are)

export const YES_NO_OPTIONS = Object.freeze([{ key: 'yes', label: 'Yes' }, { key: 'no', label: 'No' }]);

// What "no choice" is for a field: 'all' for a select, 'any' for yes/no.
export function anyValue(field) {
  return field.kind === 'yesNo' ? 'any' : 'all';
}

// Every field at "no choice".
export function fieldDefaults(fields) {
  const out = {};
  fields.forEach((field) => {
    if (field.kind === 'range') rangeFilterKeys(field).forEach((key) => { out[key] = ''; });
    else out[field.key] = anyValue(field);
  });
  return out;
}

export function fieldOptions(field, entries) {
  return typeof field.options === 'function' ? field.options(entries) : field.options;
}

// The field's test for the chosen filters, or null when it is not filtering
// (an unset value counts as no choice).
function fieldTest(field, filters) {
  if (field.kind === 'range') {
    const [minKey, maxKey] = rangeFilterKeys(field);
    if (!String(filters[minKey] ?? '').trim() && !String(filters[maxKey] ?? '').trim()) return null;
    return (record) => withinTypedRange(field.valueOf(record), filters[minKey], filters[maxKey]);
  }
  const chosen = filters[field.key];
  if (chosen == null || chosen === '' || chosen === anyValue(field)) return null;
  if (field.kind === 'yesNo') return (record) => Boolean(field.test(record)) === (chosen === 'yes');
  if (field.match) return (record, entry) => field.match(record, chosen, entry);
  return (record, entry) => asArray(field.valueOf(record, entry)).includes(chosen);
}

// The tests of the fields that are filtering: `(record, entry) => boolean`.
export function fieldTests(fields, filters = {}) {
  return fields.map((field) => fieldTest(field, filters)).filter(Boolean);
}

// Whether any field is filtering.
export function fieldsFiltering(fields, filters = {}) {
  return fieldTests(fields, filters).length > 0;
}
