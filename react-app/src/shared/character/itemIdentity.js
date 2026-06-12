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

export function itemDisplayName(item, fallback = '') {
  return String(item?.displayName || item?.name || fallback);
}

export function matchesItemReference(item, reference) {
  if (!item?.name || !item?.source || !reference?.name || !reference?.source) return false;
  return itemIdentityKey(item) === itemIdentityKey(reference);
}
