export function exactCreatedItemKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function looseCreatedItemKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .sort()
    .join('');
}

export function buildCreatedItemLookup(items) {
  const exact = new Map();
  const loose = new Map();
  (items || []).forEach((item) => {
    const exactKey = exactCreatedItemKey(item?.name);
    const looseKey = looseCreatedItemKey(item?.name);
    if (exactKey && !exact.has(exactKey)) exact.set(exactKey, item);
    if (looseKey && !loose.has(looseKey)) loose.set(looseKey, item);
  });
  return { exactMap: exact, looseMap: loose };
}

export function resolveCreatedItemValue(
  value,
  {
    itemsDb = [],
    exactMap,
    looseMap,
    resolver,
    requireResolvedItem = false,
  } = {},
) {
  if (typeof resolver === 'function') {
    try {
      const resolved = resolver(value, itemsDb);
      if (resolved) return resolved;
    } catch {
      if (requireResolvedItem) return null;
    }
    if (requireResolvedItem) return null;
  }

  const lookup = exactMap && looseMap
    ? { exactMap, looseMap }
    : buildCreatedItemLookup(itemsDb);
  return lookup.exactMap.get(exactCreatedItemKey(value))
    || lookup.looseMap.get(looseCreatedItemKey(value))
    || null;
}

export function prepareCreatedItemData(resolvedItem, label) {
  const displayLabel = String(label || '').trim();
  if (!resolvedItem) return { name: displayLabel };
  const itemData = { ...resolvedItem };
  if (displayLabel && displayLabel !== itemData.name) itemData.displayName = displayLabel;
  return itemData;
}
