import { loadItems } from '../../charbuilder/data/itemData.js';
import { INVENTORY_SOURCE_PRIORITY, sourceRank } from '../../../shared/content/sourcePriority.js';
import { itemDisplayName } from '../../../shared/character/inventory/itemIdentity.js';
import { itemGroupKey as itemType } from '../../../shared/character/inventory/itemGroups.js';
import { stripSource } from '../../../shared/content/nameKeys.js';

// Searching the item database from the inventory's add panel: normalized
// search text per item (name, type, rarity, properties), relevance order (name
// match, then rarity and preferred source), and the items DB loaded once per tab
// with every record prepared for search.

function normalizeSearch(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9+ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function itemSearchText(item) {
  return normalizeSearch([
    itemDisplayName(item),
    item?.name,
    item?.source,
    item?.sourceAlias,
    item?.type,
    item?.rarity,
    item?.scfType,
    item?.weaponCategory,
    item?.dmgType,
    Array.isArray(item?.property) ? item.property.join(' ') : '',
    Array.isArray(item?.properties) ? item.properties.join(' ') : '',
    Array.isArray(item?.mastery) ? item.mastery.join(' ') : '',
    Array.isArray(item?.focus) ? item.focus.join(' ') : '',
    Array.isArray(item?.group) ? item.group.join(' ') : '',
    Array.isArray(item?.items) ? item.items.map((ref) => stripSource(ref)).join(' ') : '',
  ].filter(Boolean).join(' '));
}

export function itemMatchesSearch(item, query) {
  const q = normalizeSearch(query);
  if (!q) return true;
  const haystack = itemSearchText(item);
  return q.split(' ').every((part) => haystack.includes(part));
}

function sourcePriority(source) {
  return sourceRank(source, INVENTORY_SOURCE_PRIORITY);
}

function rarityPriority(rarity) {
  const order = ['none', 'common', 'uncommon', 'rare', 'very rare', 'legendary', 'artifact'];
  const idx = order.indexOf(String(rarity || 'none').toLowerCase());
  return idx === -1 ? 999 : idx;
}

export function compareItemsBySearch(query) {
  const q = normalizeSearch(query);
  return (a, b) => {
    if (q) {
      const an = a._searchName || normalizeSearch(a?.name);
      const bn = b._searchName || normalizeSearch(b?.name);
      const score = (name) => {
        if (name === q) return 0;
        if (name.startsWith(`${q} `) || name.startsWith(`${q},`) || name.startsWith(`${q}+`)) return 1;
        if (name.startsWith(q)) return 2;
        if (name.split(' ').some((part) => part.startsWith(q))) return 3;
        if (name.includes(q)) return 4;
        return 5;
      };
      const as = score(an);
      const bs = score(bn);
      if (as !== bs) return as - bs;
    }

    const ap = a._sourcePriority ?? sourcePriority(a?.source);
    const bp = b._sourcePriority ?? sourcePriority(b?.source);
    if (ap !== bp) return ap - bp;

    const ar = a._rarityPriority ?? rarityPriority(a?.rarity);
    const br = b._rarityPriority ?? rarityPriority(b?.rarity);
    if (ar !== br) return ar - br;

    return String(a?.name || '').localeCompare(String(b?.name || ''));
  };
}

function prepareSearchItem(item) {
  return {
    ...item,
    _itemType: itemType(item),
    _searchName: normalizeSearch(itemDisplayName(item)),
    _searchText: itemSearchText(item),
    _sourcePriority: sourcePriority(item?.source),
    _rarityPriority: rarityPriority(item?.rarity),
  };
}

export function itemMatchesPreparedSearch(item, query) {
  const q = normalizeSearch(query);
  if (!q) return true;
  const haystack = item._searchText || itemSearchText(item);
  return q.split(' ').every((part) => haystack.includes(part));
}

// Entries keep their original inventory index, so qty/equip/remove keep
// targeting the right item no matter how the list is grouped or sliced.
export function byItemName(a, b) {
  return String(a.item?.name || '').localeCompare(String(b.item?.name || ''), undefined, { sensitivity: 'base' });
}

let itemsCachePromise = null;

export function loadItemsCached() {
  if (!itemsCachePromise) {
    itemsCachePromise = loadItems().then((items) => (items || []).map(prepareSearchItem));
  }
  return itemsCachePromise;
}
