// The magic item and equipment catalogs: the compendium's items, split into
// magic and mundane, with the filters a shop or a loot table needs (type,
// rarity, attunement, magic bonus, charges, cost, weight, source).
//
// Pure, testable in node; the pages are MagicItemCatalog/EquipmentCatalog.

import { normalizeSearchText } from '../../shared/content/searchText.js';
import { decodeDamageType, decodeProperty, itemMasteryLabels } from '../../shared/character/inventory/itemCodes.js';

const typeCode = (item) => String(item?.type || '').toUpperCase().split('|')[0].trim();
const rarityOf = (item) => String(item?.rarity || 'none').toLowerCase();

// "none" is a mundane item; "unknown" an object of no set worth (not magic).
export function isMagicItem(item) {
  const rarity = rarityOf(item);
  return rarity !== 'none' && rarity !== 'unknown';
}

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
  return MAGIC_TYPE_BY_CODE[typeCode(item)] || 'other';
}

export const RARITIES = Object.freeze([
  { key: 'common', label: 'Common' },
  { key: 'uncommon', label: 'Uncommon' },
  { key: 'rare', label: 'Rare' },
  { key: 'very rare', label: 'Very Rare' },
  { key: 'legendary', label: 'Legendary' },
  { key: 'artifact', label: 'Artifact' },
  { key: 'varies', label: 'Varies' },
  { key: 'unknown (magic)', label: 'Unknown Rarity' },
]);

const RARITY_RANK = Object.fromEntries(RARITIES.map(({ key }, index) => [key, index]));

export function rarityLabel(item) {
  return RARITIES.find(({ key }) => key === rarityOf(item))?.label || '';
}

// The highest +N an item grants, to a weapon, armor, spells or saves.
const BONUS_KEYS = ['bonusWeapon', 'bonusWeaponAttack', 'bonusAc', 'bonusSpellAttack', 'bonusSpellSaveDc', 'bonusSavingThrow'];
export function magicBonus(item) {
  const values = BONUS_KEYS.map((key) => Number.parseInt(String(item?.[key] ?? '').replace('+', ''), 10))
    .filter(Number.isFinite);
  return values.length ? Math.max(...values) : null;
}

export function attunementText(item) {
  const value = item?.reqAttune;
  if (!value) return '';
  return typeof value === 'string' ? `Required ${value.startsWith('by') ? value : `(${value})`}` : 'Required';
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
  const code = typeCode(item);
  return EQUIPMENT_CATEGORIES.find((category) => category.codes.includes(code))?.key || 'other';
}

export const COST_RANGES = Object.freeze([
  { key: 'free', label: 'No cost', test: (cp) => !cp },
  { key: 'under1', label: 'Under 1 gp', test: (cp) => cp > 0 && cp < 100 },
  { key: '1to10', label: '1–10 gp', test: (cp) => cp >= 100 && cp <= 1000 },
  { key: '10to100', label: '10–100 gp', test: (cp) => cp > 1000 && cp <= 10000 },
  { key: '100to1000', label: '100–1,000 gp', test: (cp) => cp > 10000 && cp <= 100000 },
  { key: 'over1000', label: 'Over 1,000 gp', test: (cp) => cp > 100000 },
]);

export const WEIGHT_RANGES = Object.freeze([
  { key: 'none', label: 'Weightless', test: (lb) => !lb },
  { key: 'under1', label: 'Under 1 lb.', test: (lb) => lb > 0 && lb < 1 },
  { key: '1to5', label: '1–5 lb.', test: (lb) => lb >= 1 && lb <= 5 },
  { key: '5to20', label: '5–20 lb.', test: (lb) => lb > 5 && lb <= 20 },
  { key: 'over20', label: 'Over 20 lb.', test: (lb) => lb > 20 },
]);

// 5etools values are in copper pieces.
export function formatCost(copper) {
  const cp = Number(copper) || 0;
  if (!cp) return '—';
  if (cp >= 100 && cp % 100 === 0) return `${(cp / 100).toLocaleString('en-US')} gp`;
  if (cp >= 10 && cp % 10 === 0) return `${cp / 10} sp`;
  return `${cp} cp`;
}

export function formatWeight(pounds) {
  const lb = Number(pounds) || 0;
  return lb ? `${lb} lb.` : '—';
}

const capitalize = (text) => String(text || '').replace(/^\w/, (c) => c.toUpperCase());

// Damage, AC, properties (with their details: Versatile (1d10), range) and
// mastery, the row's "Attributes".
export function itemAttributes(item) {
  return [
    item?.dmg1 ? `${item.dmg1}${item.dmgType ? ` ${capitalize(decodeDamageType(item.dmgType))}` : ''}` : '',
    item?.ac ? `AC ${item.ac}` : '',
    ...(Array.isArray(item?.property) ? item.property : []).map((code) => decodeProperty(code, item)?.label).filter(Boolean),
    ...itemMasteryLabels(item).map((mastery) => `Mastery: ${mastery}`),
  ].filter(Boolean);
}

// The compendium index's item entries, split.
export function catalogEntries(index, magic) {
  return (index || []).filter((entry) => entry.kind === 'item' && isMagicItem(entry.record) === magic);
}

export function catalogSources(entries) {
  return [...new Set(entries.map((entry) => entry.source))].sort();
}

const matchesSearch = (entry, query) => {
  const terms = normalizeSearchText(query).split(' ').filter(Boolean);
  return terms.every((term) => entry.nameText.includes(term));
};

export const MAGIC_FILTERS = Object.freeze({
  search: '', type: 'all', rarity: 'all', attunement: 'any', bonus: 'any', charges: 'any', source: 'all', sort: 'name',
});

export function filterMagicItems(entries, filters = MAGIC_FILTERS) {
  const f = { ...MAGIC_FILTERS, ...filters };
  const list = entries.filter((entry) => {
    const item = entry.record;
    if (f.search && !matchesSearch(entry, f.search)) return false;
    if (f.type !== 'all' && magicItemType(item) !== f.type) return false;
    if (f.rarity !== 'all' && rarityOf(item) !== f.rarity) return false;
    if (f.attunement !== 'any' && Boolean(item.reqAttune) !== (f.attunement === 'yes')) return false;
    if (f.bonus !== 'any' && magicBonus(item) !== Number(f.bonus)) return false;
    if (f.charges !== 'any' && (item.charges != null) !== (f.charges === 'yes')) return false;
    if (f.source !== 'all' && entry.source !== f.source) return false;
    return true;
  });
  if (f.sort === 'rarity') {
    return list.sort((a, b) => (RARITY_RANK[rarityOf(a.record)] ?? 99) - (RARITY_RANK[rarityOf(b.record)] ?? 99)
      || a.name.localeCompare(b.name));
  }
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

export const EQUIPMENT_FILTERS = Object.freeze({
  search: '', category: 'all', cost: 'all', weight: 'all', source: 'all', sort: 'name',
});

export function filterEquipment(entries, filters = EQUIPMENT_FILTERS) {
  const f = { ...EQUIPMENT_FILTERS, ...filters };
  const costTest = COST_RANGES.find((range) => range.key === f.cost)?.test;
  const weightTest = WEIGHT_RANGES.find((range) => range.key === f.weight)?.test;
  const list = entries.filter((entry) => {
    const item = entry.record;
    if (f.search && !matchesSearch(entry, f.search)) return false;
    if (f.category !== 'all' && equipmentCategory(item) !== f.category) return false;
    if (costTest && !costTest(Number(item.value) || 0)) return false;
    if (weightTest && !weightTest(Number(item.weight) || 0)) return false;
    if (f.source !== 'all' && entry.source !== f.source) return false;
    return true;
  });
  const byName = (a, b) => a.name.localeCompare(b.name);
  if (f.sort === 'cost') return list.sort((a, b) => (Number(a.record.value) || 0) - (Number(b.record.value) || 0) || byName(a, b));
  if (f.sort === 'weight') return list.sort((a, b) => (Number(a.record.weight) || 0) - (Number(b.record.weight) || 0) || byName(a, b));
  return list.sort(byName);
}

// Item pictures from fluff-items.json: name|source -> address of the first
// image, following an entry that copies another's ({_copy: {name, source}}).
export function itemImageMap(fluffJson, imageBase) {
  const key = (name, source) => `${String(name || '').toLowerCase()}|${String(source || '').toLowerCase()}`;
  const records = new Map((fluffJson?.itemFluff || []).map((record) => [key(record.name, record.source), record]));
  const pathOf = (record, depth = 0) => {
    const path = record?.images?.find((image) => image?.href?.path)?.href?.path;
    if (path) return path;
    const copy = record?._copy;
    return copy && depth < 3 ? pathOf(records.get(key(copy.name, copy.source)), depth + 1) : null;
  };
  const images = new Map();
  for (const [entryKey, record] of records) {
    const path = pathOf(record);
    if (path) images.set(entryKey, `${imageBase}${encodeURI(path.replace(/^\/+/, ''))}`);
  }
  return {
    get: (name, source) => images.get(key(name, source)) || null,
    size: images.size,
  };
}

// The picture an item shows: its own; else its group's (5etools draws one belt
// for all six Belts of Giant Strength); else, for a magic variant of a base
// item (Longsword +1), the base item's. `groupOf(name, source)` names the
// group an item belongs to.
export function itemPicture(item, images, groupOf = () => null) {
  if (!images || !item?.name) return null;
  const own = images.get(item.name, item.source);
  if (own) return own;
  const group = groupOf(item.name, item.source);
  const fromGroup = group ? images.get(group.name, group.source) : null;
  if (fromGroup) return fromGroup;
  const [baseName, baseSource] = String(item.baseItem || '').split('|');
  return baseName ? images.get(baseName, baseSource || 'XPHB') : null;
}

// Member name|source -> its group, from the items file's itemGroup list.
export function itemGroupLookup(groups) {
  const key = (name, source) => `${String(name || '').toLowerCase()}|${String(source || '').toLowerCase()}`;
  const byMember = new Map();
  (groups || []).forEach((group) => {
    (group.items || []).forEach((ref) => {
      const [name, source] = String(ref).split('|');
      byMember.set(key(name, source || group.source), { name: group.name, source: group.source });
    });
  });
  return (name, source) => byMember.get(key(name, source)) || null;
}
