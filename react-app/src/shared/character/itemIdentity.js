export function normalizeItemIdentityName(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function normalizeItemIdentitySource(value) {
  return String(value || '').trim().toUpperCase();
}

export function itemIdentityKey(nameOrItem, source = '') {
  const item = nameOrItem && typeof nameOrItem === 'object' ? nameOrItem : null;
  const name = item ? item.name : nameOrItem;
  const itemSource = item ? item.source : source;
  return `${normalizeItemIdentityName(name)}|${normalizeItemIdentitySource(itemSource)}`;
}

function stableValue(value) {
  if (Array.isArray(value)) return `[${value.map(stableValue).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableValue(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function isInventoryItemStackable(item) {
  return !!item && !item.equipped && !item.equippedSlot;
}

export function inventoryStackKey(item) {
  if (!item) return '';
  const {
    qty: _qty,
    equipped: _equipped,
    equippedSlot: _equippedSlot,
    name: _name,
    source: _source,
    ...copyState
  } = item;
  return `${itemIdentityKey(item)}|${stableValue(copyState)}`;
}

export function canStackInventoryItems(a, b) {
  return (
    isInventoryItemStackable(a)
    && isInventoryItemStackable(b)
    && inventoryStackKey(a) === inventoryStackKey(b)
  );
}

export function itemDisplayName(item, fallback = '') {
  return String(item?.displayName || item?.name || fallback);
}

export function matchesItemReference(item, reference) {
  if (!item?.name || !item?.source || !reference?.name || !reference?.source) return false;
  return itemIdentityKey(item) === itemIdentityKey(reference);
}
