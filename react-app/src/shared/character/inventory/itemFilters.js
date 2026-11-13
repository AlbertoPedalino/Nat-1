import {
  decodeDamageType,
  decodeItemTypeLabel,
  itemMasteryLabels,
  itemPropertyLabels,
} from './itemCodes.js';
import { compareText } from '../../lists.js';
import { withinTypedRange } from '../../numbers.js';
import { itemWeight } from './weight.js';
import { copperToGp } from './currency.js';
import { RARITY_OPTIONS, rarityLabel } from './itemRarity.js';
import { requiresAttunement } from './itemAttunement.js';

// Single source of truth for the advanced item filters. The empty state, the
// active-value count, the dropdown options, the match test and the panel rows
// are all derived from ITEM_FILTER_FIELDS below, so a new filter is one entry
// and cannot end up half-wired (counted but not matched, or vice versa).
//
// Filter values mirror the labels on the expanded item card, so what you read
// on a row is exactly what you can filter by.
//
// `valuesOf` returns every value an item carries for that field — one for Type,
// several for Properties. That collapses "select" (item has this value) and
// "multiSelect" (item has all of these values) into the same containment test.

// Item weight/value are optional in the 5etools data; a missing one counts as 0
// so a "max 5 lb" filter still keeps weightless gear. `value` is stored in
// copper; the filter, like the item card, speaks gp.
const itemValueGp = (item) => copperToGp(item?.value);

// "1d6" sorts before "1d10" before "2d6" — numeric on both parts, not lexical.
function compareDamageDice(a, b) {
  const parse = (dice) => {
    const match = /^(\d*)d(\d+)$/i.exec(dice.trim());
    if (!match) return [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER];
    return [Number(match[1] || 1), Number(match[2])];
  };
  const [aCount, aFaces] = parse(a);
  const [bCount, bFaces] = parse(b);
  if (aCount !== bCount) return aCount - bCount;
  if (aFaces !== bFaces) return aFaces - bFaces;
  return compareText(a, b);
}

// Rarities in the books' order (Common … Artifact), not alphabetical.
const RARITY_ORDER = RARITY_OPTIONS.map(({ label }) => label);
function compareRarity(a, b) {
  return RARITY_ORDER.indexOf(a) - RARITY_ORDER.indexOf(b);
}

export const ITEM_FILTER_FIELDS = Object.freeze([
  {
    kind: 'select',
    key: 'type',
    label: 'Type',
    valuesOf: (item) => [decodeItemTypeLabel(item)],
  },
  {
    kind: 'select',
    key: 'rarity',
    label: 'Rarity',
    // A mundane item has none, so it never matches a chosen rarity.
    valuesOf: (item) => [rarityLabel(item)],
    compare: compareRarity,
  },
  {
    kind: 'select',
    key: 'attunement',
    label: 'Attunement',
    valuesOf: (item) => [requiresAttunement(item) ? 'Requires Attunement' : 'No Attunement'],
  },
  {
    kind: 'select',
    key: 'damage',
    label: 'Damage',
    valuesOf: (item) => [String(item?.dmg1 || '').trim()],
    compare: compareDamageDice,
  },
  {
    kind: 'select',
    key: 'damageType',
    label: 'Damage Type',
    valuesOf: (item) => [item?.dmgType ? decodeDamageType(item.dmgType) : ''],
  },
  {
    kind: 'multiSelect',
    key: 'properties',
    label: 'Properties',
    valuesOf: itemPropertyLabels,
  },
  {
    kind: 'select',
    key: 'mastery',
    label: 'Mastery',
    valuesOf: itemMasteryLabels,
  },
  {
    kind: 'range',
    key: 'weight',
    label: 'Weight',
    unit: 'lb',
    step: 0.1,
    valueOf: itemWeight,
  },
  {
    kind: 'range',
    key: 'value',
    label: 'Value',
    unit: 'gp',
    step: 0.01,
    valueOf: itemValueGp,
  },
].map(Object.freeze));

// The min–max fields (weight, value), which the compendium's equipment
// catalog filters by too.
export const ITEM_RANGE_FIELDS = Object.freeze(ITEM_FILTER_FIELDS.filter((field) => field.kind === 'range'));

// Fields backed by a dropdown, i.e. everything that contributes option lists.
export const ITEM_FILTER_CHOICE_FIELDS = Object.freeze(
  ITEM_FILTER_FIELDS.filter((field) => field.kind !== 'range'),
);

export function rangeFilterKeys(field) {
  return [`${field.key}Min`, `${field.key}Max`];
}

function selectedValues(filters, field) {
  const raw = filters?.[field.key];
  return Array.isArray(raw) ? raw : [];
}

// The only way to get an empty filter set — deliberately a factory, not a
// shared constant. A constant would hand the same `properties` array to every
// panel (Object.freeze is shallow), and one stray push would cross-contaminate
// filter panels that are supposed to be independent.
export function emptyItemFilters() {
  const out = {};
  ITEM_FILTER_FIELDS.forEach((field) => {
    if (field.kind === 'range') rangeFilterKeys(field).forEach((key) => { out[key] = ''; });
    else if (field.kind === 'multiSelect') out[field.key] = [];
    else out[field.key] = '';
  });
  return out;
}

// Counts selected *values*, not fields: three property chips read as three
// active filters, and a min+max pair reads as two. That is what the panel badge
// should show — each one is something the user has to clear.
export function countActiveFilterValues(filters) {
  if (!filters) return 0;
  return ITEM_FILTER_FIELDS.reduce((count, field) => {
    if (field.kind === 'range') {
      return count + rangeFilterKeys(field)
        .filter((key) => String(filters[key] ?? '').trim() !== '').length;
    }
    if (field.kind === 'multiSelect') return count + selectedValues(filters, field).length;
    return count + (String(filters[field.key] || '').trim() ? 1 : 0);
  }, 0);
}

export function hasActiveItemFilters(filters) {
  return countActiveFilterValues(filters) > 0;
}

// Stable string identity for a filter set. Filter state is a fresh object on
// every edit, so consumers that need to react to a *changed query* (rather than
// to a new object) key off this instead of the reference.
export function itemFiltersKey(filters) {
  return ITEM_FILTER_FIELDS.map((field) => {
    if (field.kind === 'range') return rangeFilterKeys(field).map((key) => filters?.[key] ?? '').join('~');
    if (field.kind === 'multiSelect') return selectedValues(filters, field).join('~');
    return String(filters?.[field.key] || '');
  }).join('|');
}

function sortedUnique(values, compare) {
  return [...new Set(values.filter((value) => String(value || '').trim()))].sort(
    compare || (compareText),
  );
}

export function buildItemFilterOptions(items) {
  const list = Array.isArray(items) ? items : [];
  const buckets = new Map(ITEM_FILTER_CHOICE_FIELDS.map((field) => [field.key, []]));

  list.forEach((item) => {
    if (!item) return;
    ITEM_FILTER_CHOICE_FIELDS.forEach((field) => {
      const bucket = buckets.get(field.key);
      field.valuesOf(item).forEach((value) => bucket.push(value));
    });
  });

  const options = {};
  ITEM_FILTER_CHOICE_FIELDS.forEach((field) => {
    options[field.key] = sortedUnique(buckets.get(field.key), field.compare);
  });
  return options;
}

// Fields combine as AND, and so do multiple values within one multiSelect:
// "Thrown + Light" keeps only items carrying both, which is what stacking
// filters is for.
export function itemMatchesFilters(item, filters) {
  if (!filters || !item) return true;
  return ITEM_FILTER_FIELDS.every((field) => {
    if (field.kind === 'range') {
      const [minKey, maxKey] = rangeFilterKeys(field);
      return withinTypedRange(field.valueOf(item), filters[minKey], filters[maxKey]);
    }
    const wanted = field.kind === 'multiSelect'
      ? selectedValues(filters, field)
      : [String(filters[field.key] || '').trim()].filter(Boolean);
    if (!wanted.length) return true;
    const own = field.valuesOf(item);
    return wanted.every((value) => own.includes(value));
  });
}
