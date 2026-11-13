import { ITEM_TYPE_LABELS } from './itemCodes.js';
import { itemBaseType } from './itemKinds.js';
import { typedNumber } from '../../numbers.js';

// An item the player makes up (a gem, a potion, a bundle of silk, a trinket):
// written as a 5etools item record (type code, rarity, weight in lb, value in
// copper, entries), so every screen reads it as it reads an item of the books
// — its shelf, its filters, its card, its weight and its price. The sheet's
// CustomItemDialog creates and edits it through the draft below.

// The kinds a made-up item can be: things with a price, a weight and a rarity,
// not weapons or armor (those come from the books).
const CUSTOM_KIND_CODES = Object.freeze(['G', '$G', '$A', 'TG', 'P', 'FD', 'WI']);
export const CUSTOM_ITEM_KINDS = Object.freeze(
  CUSTOM_KIND_CODES.map((code) => Object.freeze({ key: code, label: ITEM_TYPE_LABELS[code] })),
);
const DEFAULT_KIND = 'G';

// The coins a price is typed in, each worth so many copper pieces.
export const VALUE_UNITS = Object.freeze([
  { key: 'cp', label: 'cp', copper: 1 },
  { key: 'sp', label: 'sp', copper: 10 },
  { key: 'gp', label: 'gp', copper: 100 },
  { key: 'pp', label: 'pp', copper: 1000 },
].map(Object.freeze));

// A price in copper as the largest coin that shows it whole (gp first; 1500 ->
// 15 gp, 50 -> 5 sp).
function valueInUnit(copper) {
  const cp = Math.max(0, Math.round(Number(copper) || 0));
  if (!cp) return { value: '', unit: 'gp' };
  const unit = ['gp', 'sp', 'cp'].find((key) => cp % VALUE_UNITS.find((u) => u.key === key).copper === 0);
  return { value: String(cp / VALUE_UNITS.find((u) => u.key === unit).copper), unit };
}

// An item's description as one text, its paragraphs apart by a blank line
// (only plain-text entries; anything richer is kept as it is on save).
function descriptionOf(item) {
  const entries = Array.isArray(item?.entries) ? item.entries : [];
  return entries.every((entry) => typeof entry === 'string') ? entries.join('\n\n') : '';
}

// The form's fields, empty or from an item to edit (an older custom item
// without a kind of its own reads as Adventuring Gear).
export function customItemDraft(item = null) {
  const kind = itemBaseType(item);
  return {
    name: item?.name || '',
    kind: CUSTOM_KIND_CODES.includes(kind) ? kind : DEFAULT_KIND,
    rarity: item?.rarity && item.rarity !== 'none' ? item.rarity : 'none',
    qty: 1,
    weight: item?.weight ? String(item.weight) : '',
    ...valueInUnit(item?.value),
    description: descriptionOf(item),
  };
}

// Whether the draft can be saved: it needs a name.
export function isCustomItemDraftReady(draft) {
  return Boolean(String(draft?.name || '').trim());
}

// The item the draft describes (no quantity: the inventory keeps that). An
// edit keeps a description richer than text (tables, lists) while the field is
// left empty; anything typed replaces it.
export function customItemRecord(draft, previous = null) {
  const copper = (VALUE_UNITS.find((unit) => unit.key === draft.unit) || VALUE_UNITS[2]).copper;
  const paragraphs = String(draft.description || '').split(/\n\s*\n/).map((text) => text.trim()).filter(Boolean);
  const rich = Array.isArray(previous?.entries) && previous.entries.some((entry) => typeof entry !== 'string');
  const entries = rich && !paragraphs.length ? previous.entries : paragraphs;
  return {
    name: String(draft.name || '').trim(),
    source: 'Custom',
    custom: true,
    type: CUSTOM_KIND_CODES.includes(draft.kind) ? draft.kind : DEFAULT_KIND,
    rarity: draft.rarity || 'none',
    weight: Math.max(0, typedNumber(draft.weight) ?? 0),
    value: Math.round(Math.max(0, typedNumber(draft.value) ?? 0) * copper),
    ...(entries.length ? { entries } : {}),
  };
}

// The inventory entry after its item is edited: what was made up replaced,
// where it is and how many kept (quantity, carried, equipped, attuned…).
export function withCustomItemEdited(entry, record) {
  const { entries: _entries, ...kept } = entry || {};
  return { ...kept, ...record };
}
