// The magic item and equipment catalogs: the compendium's items, split into
// magic and mundane, with the filters a shop or a loot table needs. Pure,
// testable in node; their columns are in catalogColumns.jsx.

import { buildItemPropertySegments } from '../../../shared/character/inventory/itemCodes.js';
import { parseSignedBonus } from '../../../shared/character/inventory/itemBonus.js';
import { requiresAttunement } from '../../../shared/character/inventory/itemAttunement.js';
import { ITEM_RANGE_FIELDS } from '../../../shared/character/inventory/itemFilters.js';
import {
  RARITY_OPTIONS, isMagicItem, rarityKey, rarityRank,
} from '../../../shared/character/inventory/itemRarity.js';
import { formatCopper } from '../../../shared/character/inventory/currency.js';
import { formatPounds } from '../../../shared/character/inventory/weight.js';
import { itemBaseType } from '../../../shared/character/inventory/itemKinds.js';

export const MAGIC_TYPES = Object.freeze([
  { key: 'armor', label: 'Armor' },
  { key: 'potion', label: 'Potion' },
  { key: 'ring', label: 'Ring' },
  { key: 'rod', label: 'Rod' },
  { key: 'scroll', label: 'Scroll' },
  { key: 'staff', label: 'Staff' },
  { key: 'wand', label: 'Wand' },
  { key: 'weapon', label: 'Weapon' },
  { key: 'wondrous', label: 'Wondrous Item' },
  { key: 'other', label: 'Other' },
]);

const MAGIC_TYPE_BY_CODE = {
  LA: 'armor', MA: 'armor', HA: 'armor', S: 'armor',
  P: 'potion', RG: 'ring', RD: 'rod', SC: 'scroll', ST: 'staff', WD: 'wand',
  M: 'weapon', R: 'weapon', A: 'weapon', AF: 'weapon',
  WI: 'wondrous',
};

export function magicItemType(item) {
  if (item?.wondrous) return 'wondrous';
  return MAGIC_TYPE_BY_CODE[itemBaseType(item)] || 'other';
}

// The highest +N an item grants, to a weapon, armor, spells or saves.
const BONUS_KEYS = ['bonusWeapon', 'bonusWeaponAttack', 'bonusAc', 'bonusSpellAttack', 'bonusSpellSaveDc', 'bonusSavingThrow'];
export function magicBonus(item) {
  const values = BONUS_KEYS.filter((key) => item?.[key] != null).map((key) => parseSignedBonus(item[key]));
  return values.length ? Math.max(...values) : null;
}

export const EQUIPMENT_CATEGORIES = Object.freeze([
  { key: 'weapon', label: 'Weapons', codes: ['M', 'R'] },
  { key: 'armor', label: 'Armor & Shields', codes: ['LA', 'MA', 'HA', 'S'] },
  { key: 'ammunition', label: 'Ammunition', codes: ['A', 'AF'] },
  { key: 'gear', label: 'Adventuring Gear', codes: ['G', 'EXP'] },
  { key: 'tools', label: 'Tools & Instruments', codes: ['T', 'AT', 'INS', 'GS'] },
  { key: 'focus', label: 'Spellcasting Focus', codes: ['SCF'] },
  { key: 'mounts', label: 'Mounts & Vehicles', codes: ['MNT', 'VEH', 'TAH', 'SHP', 'AIR', 'SPC'] },
  { key: 'goods', label: 'Trade Goods & Food', codes: ['TG', 'FD'] },
  { key: 'treasure', label: 'Treasure', codes: ['$', 'TB', '$G', '$A', '$C'] },
  { key: 'other', label: 'Other', codes: [] },
]);

export function equipmentCategory(item) {
  const code = itemBaseType(item);
  return EQUIPMENT_CATEGORIES.find((category) => category.codes.includes(code))?.key || 'other';
}

// The catalog's Value and Weight cells: the shared formats, a dash for none.
export function formatCostCell(copper) {
  return formatCopper(copper) || '—';
}

export function formatWeightCell(pounds) {
  const lb = Number(pounds) || 0;
  return lb ? formatPounds(lb) : '—';
}

// Damage, AC, properties and mastery — the row's "Attributes" — said as the
// item card says them (buildItemPropertySegments), shortened for one line.
const ATTRIBUTE_KINDS = ['damage', 'ac', 'properties', 'mastery'];
export function itemAttributes(item) {
  const segments = buildItemPropertySegments(item, { kinds: ATTRIBUTE_KINDS });
  const damageType = segments.find((segment) => segment.kind === 'damageType')?.value;
  return segments.flatMap((segment) => {
    if (segment.kind === 'damage') return [damageType ? `${segment.value} ${damageType}` : segment.value];
    if (segment.kind === 'ac') return [`AC ${segment.value}`];
    if (segment.kind === 'properties') return [segment.value];
    if (segment.kind === 'mastery') return [`Mastery: ${segment.value}`];
    return [];
  });
}

const isItem = (entry) => entry.kind === 'item';

export const MAGIC_ITEM_CATALOG = Object.freeze({
  key: 'magic',
  label: 'magic items',
  select: (entry) => isItem(entry) && isMagicItem(entry.record),
  fields: [
    { kind: 'select', key: 'type', label: 'Type', options: MAGIC_TYPES, valueOf: magicItemType },
    { kind: 'select', key: 'rarity', label: 'Rarity', options: RARITY_OPTIONS, valueOf: rarityKey },
    { kind: 'yesNo', key: 'attunement', label: 'Attunement', test: requiresAttunement },
    {
      kind: 'select',
      key: 'bonus',
      label: 'Magic Bonus',
      options: [1, 2, 3].map((n) => ({ key: String(n), label: `+${n}` })),
      valueOf: (item) => String(magicBonus(item)),
    },
    { kind: 'yesNo', key: 'charges', label: 'Has Charges', test: (item) => item.charges != null },
  ],
  sorts: [
    { key: 'name', label: 'Name' },
    { key: 'rarity', label: 'Rarity', compare: (a, b) => rarityRank(a.record) - rarityRank(b.record) },
  ],
});

const byNumber = (field) => (a, b) => (Number(a.record[field]) || 0) - (Number(b.record[field]) || 0);

export const EQUIPMENT_CATALOG = Object.freeze({
  key: 'equipment',
  label: 'items',
  select: (entry) => isItem(entry) && !isMagicItem(entry.record),
  // Value and weight as typed ranges, the same fields as the sheet's and the
  // builder's item filters.
  fields: [
    { kind: 'select', key: 'category', label: 'Type', options: EQUIPMENT_CATEGORIES, valueOf: equipmentCategory },
    ...ITEM_RANGE_FIELDS,
  ],
  sorts: [
    { key: 'name', label: 'Name' },
    { key: 'value', label: 'Value', compare: byNumber('value') },
    { key: 'weight', label: 'Weight', compare: byNumber('weight') },
  ],
});
