import { itemIdentityKey } from '../../../shared/character/inventory/itemIdentity.js';
import { ITEM_SOURCE_PRIORITY } from '../../../shared/content/sourcePriority.js';

// Identity and source of a raw 5etools item record, shared by the item load,
// the magic-variant expansion and inventory reconciliation.

// "+1 Longsword" -> "Longsword +1", the name form the app keys items by.
export function formatLeadingBonusName(name) {
  return String(name || '').replace(/^(\+\d+)\s+(.+)$/i, '$2 $1').trim();
}

export function itemSource(item) {
  return String(item?.source || '').trim();
}

export function itemKey(name, source) {
  return itemIdentityKey(formatLeadingBonusName(name), source);
}

export function itemRecordKey(item, source = itemSource(item)) {
  return itemKey(item?.name || '', source);
}

// The record's source when it is one of the supported item manuals, else ''.
export function canonicalItemSource(item) {
  const source = itemSource(item);
  if (ITEM_SOURCE_PRIORITY.includes(source)) return source;
  return '';
}

export function isItem2024(item) {
  return ITEM_SOURCE_PRIORITY.includes(itemSource(item));
}

export function itemRef(item) {
  const source = canonicalItemSource(item) || itemSource(item);
  return `${formatLeadingBonusName(item?.name || '')}|${source}`;
}

export function withCanonicalSource(item) {
  const canonical = canonicalItemSource(item);
  if (!canonical) return item;
  const source = itemSource(item);
  return {
    ...item,
    source: canonical,
    sourceAlias: source && source !== canonical ? source : item.sourceAlias || null,
  };
}
