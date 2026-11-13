import { asArray, compareText } from '../lists.js';
import { withinTypedRange } from '../numbers.js';

// A list's filters, each described once: its default, its test, its count and
// its control (FilterFieldControls) all come from that description. Every
// filtered list of the app goes through here: the compendium's catalogs, the
// bestiary browser, the sheet's and the builder's item lists.
//
//   select — { kind: 'select', key, label, options, valueOf(record, entry) }
//            Several choices at once: the value is a list (empty: any), and a
//            record is kept when it carries ANY of them (Large or Huge) —
//            `matchAll` keeps only records carrying ALL of them (Thrown and
//            Light, for values a record has several of). `match(record,
//            chosen, entry)` replaces "carries" when that is not the test.
//            `single` makes it one choice, a string ('all': any) — a bound
//            (CR from, CR to), where several make no sense.
//            `options`: [{ key, label }], or (entries) => that list, from
//            what the list holds (`valueOf` may return one value or a list).
//   yesNo  — { kind: 'yesNo', key, label, test(record) }: 'any', 'yes', 'no'
//   range  — { kind: 'range', key, label, unit, step, valueOf(record) }, typed
//            as min and max (keys from rangeFilterKeys)

export const YES_NO_OPTIONS = Object.freeze([{ key: 'yes', label: 'Yes' }, { key: 'no', label: 'No' }]);

export function rangeFilterKeys(field) {
  return [`${field.key}Min`, `${field.key}Max`];
}

// Whether the field takes one choice (a string) rather than several (a list).
export function isSingleChoice(field) {
  return field.kind === 'yesNo' || (field.kind === 'select' && field.single === true);
}

// What "no choice" is for a one-choice field: 'all' for a select, 'any' for
// yes/no.
export function anyValue(field) {
  return field.kind === 'yesNo' ? 'any' : 'all';
}

// Every field at "no choice". A factory, not a constant: each list gets its
// own arrays.
export function fieldDefaults(fields) {
  const out = {};
  fields.forEach((field) => {
    if (field.kind === 'range') rangeFilterKeys(field).forEach((key) => { out[key] = ''; });
    else out[field.key] = isSingleChoice(field) ? anyValue(field) : [];
  });
  return out;
}

// The values chosen in a field, as a list ('' / 'all' / 'any': none). A
// string saved by an older one-choice filter reads as a list of one.
export function chosenValues(field, filters) {
  const raw = filters?.[field.key];
  return asArray(raw).filter((value) => value != null && value !== '' && (!isSingleChoice(field) || value !== anyValue(field)));
}

export function fieldOptions(field, entries) {
  return (typeof field.options === 'function' ? field.options(entries || []) : field.options) || [];
}

// A field's options from what a list holds: every value its records carry,
// once, in `compare` order (text order without one), each its own label.
export function optionsFromValues(field, records, compare) {
  const values = new Set();
  (records || []).forEach((record) => asArray(field.valueOf(record)).forEach((value) => {
    if (String(value ?? '').trim()) values.add(value);
  }));
  return [...values].sort(compare || compareText)
    .map((value) => ({ key: value, label: String(value) }));
}

// The field's test for the chosen filters, or null when it is not filtering.
function fieldTest(field, filters) {
  if (field.kind === 'range') {
    const [minKey, maxKey] = rangeFilterKeys(field);
    if (!String(filters[minKey] ?? '').trim() && !String(filters[maxKey] ?? '').trim()) return null;
    return (record) => withinTypedRange(field.valueOf(record), filters[minKey], filters[maxKey]);
  }
  const chosen = chosenValues(field, filters);
  if (!chosen.length) return null;
  if (field.kind === 'yesNo') return (record) => Boolean(field.test(record)) === (chosen[0] === 'yes');
  const carries = field.match
    ? (record, entry) => (value) => field.match(record, value, entry)
    : (record, entry) => {
      const own = asArray(field.valueOf(record, entry));
      return (value) => own.includes(value);
    };
  return field.matchAll
    ? (record, entry) => chosen.every(carries(record, entry))
    : (record, entry) => chosen.some(carries(record, entry));
}

// The tests of the fields that are filtering: `(record, entry) => boolean`.
export function fieldTests(fields, filters = {}) {
  return fields.map((field) => fieldTest(field, filters || {})).filter(Boolean);
}

// Whether a record passes every field.
export function matchesFields(fields, filters, record, entry) {
  return fieldTests(fields, filters).every((test) => test(record, entry));
}

// How many values are chosen: three types read as three, a min and a max as
// two — each is something to clear.
export function countChosenValues(fields, filters) {
  if (!filters) return 0;
  return fields.reduce((count, field) => {
    if (field.kind === 'range') {
      return count + rangeFilterKeys(field).filter((key) => String(filters[key] ?? '').trim() !== '').length;
    }
    return count + chosenValues(field, filters).length;
  }, 0);
}

// A stable string for what is chosen: filter state is a fresh object on every
// edit, so a list that goes back to its top on a new query keys off this.
export function fieldsKey(fields, filters) {
  return fields.map((field) => {
    if (field.kind === 'range') return rangeFilterKeys(field).map((key) => filters?.[key] ?? '').join('~');
    return chosenValues(field, filters).join('~');
  }).join('|');
}
