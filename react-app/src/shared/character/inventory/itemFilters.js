import {
  decodeDamageType,
  decodeItemTypeLabel,
  itemMasteryLabels,
  itemPropertyLabels,
} from './itemCodes.js';
import { compareText } from '../../lists.js';
import {
  countChosenValues, fieldDefaults, fieldsKey, matchesFields, optionsFromValues,
} from '../../content/filterFields.js';
import { itemWeight } from './weight.js';
import { copperToGp } from './currency.js';
import { RARITY_OPTIONS, rarityLabel } from './itemRarity.js';
import { requiresAttunement } from './itemAttunement.js';

// The item filters (the sheet's inventory and add-item search, the builder's
// equipment), described for the app's one filter engine
// (shared/content/filterFields.js): the empty state, the count, the options,
// the test and the controls all come from ITEM_FILTER_FIELDS, so a new filter
// is one entry.
//
// Filter values mirror the labels on the expanded item card, so what you read
// on a row is exactly what you can filter by. Several values of a field keep
// an item carrying any of them (a Shield or a Light Armor); Properties keep
// only items carrying all of them (Thrown and Light), which is what stacking
// properties is for. Each field's options come from the pool being filtered
// (buildItemFilterOptions), so a choice never yields nothing.

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

const choice = (key, label, valueOf, compare) => ({ kind: 'select', key, label, valueOf, compare });

export const ITEM_FILTER_FIELDS = Object.freeze([
  choice('type', 'Type', (item) => [decodeItemTypeLabel(item)]),
  // A mundane item has none, so it never matches a chosen rarity.
  choice('rarity', 'Rarity', (item) => [rarityLabel(item)], compareRarity),
  choice('attunement', 'Attunement', (item) => [requiresAttunement(item) ? 'Requires Attunement' : 'No Attunement']),
  choice('damage', 'Damage', (item) => [String(item?.dmg1 || '').trim()], compareDamageDice),
  choice('damageType', 'Damage Type', (item) => [item?.dmgType ? decodeDamageType(item.dmgType) : '']),
  { ...choice('properties', 'Properties', itemPropertyLabels), matchAll: true },
  choice('mastery', 'Mastery', itemMasteryLabels),
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

export function emptyItemFilters() {
  return fieldDefaults(ITEM_FILTER_FIELDS);
}

export function countActiveFilterValues(filters) {
  return countChosenValues(ITEM_FILTER_FIELDS, filters);
}

export function hasActiveItemFilters(filters) {
  return countActiveFilterValues(filters) > 0;
}

export function itemFiltersKey(filters) {
  return fieldsKey(ITEM_FILTER_FIELDS, filters);
}

// Each dropdown's options ({ key, label }) from the pool being filtered.
export function buildItemFilterOptions(items) {
  const list = (Array.isArray(items) ? items : []).filter(Boolean);
  return Object.fromEntries(ITEM_FILTER_CHOICE_FIELDS.map((field) => [
    field.key, optionsFromValues(field, list, field.compare || compareText),
  ]));
}

export function itemMatchesFilters(item, filters) {
  if (!filters || !item) return true;
  return matchesFields(ITEM_FILTER_FIELDS, filters, item);
}
