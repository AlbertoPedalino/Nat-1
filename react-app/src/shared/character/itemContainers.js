import { craftedFlagOf } from './craftedItems.js';

export function parseInventoryItemRef(ref) {
  const [name, source] = String(ref || '').split('|');
  return {
    name: cleanItemName(name),
    source: String(source || '').trim().toUpperCase(),
  };
}

export function cleanItemName(name) {
  return String(name || '')
    .replace(/\{@(?:item|filter|book|dice|damage|dc)\s+([^}|]+)(?:\|[^}]*)?\}/gi, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function norm(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function matchSource(item, source) {
  return !source || String(item?.source || '').toUpperCase() === String(source || '').toUpperCase();
}

function inventoryQty(item) {
  return Math.max(1, Number(item?.qty ?? 1) || 1);
}

export function findInventoryItem(itemDb, name, source = '') {
  const targetName = norm(name);
  if (!targetName) return null;

  const exact = (itemDb || []).find((item) => norm(item?.name) === targetName && matchSource(item, source));
  if (exact) return exact;

  const groupMatch = (itemDb || []).find((item) => (
    Array.isArray(item?.group)
    && item.group.some((groupName) => norm(groupName) === targetName)
    && matchSource(item, source)
  ));
  if (groupMatch) return groupMatch;

  if (source) return findInventoryItem(itemDb, name, '');
  return null;
}

export function shouldExpandItemContents(item) {
  return Array.isArray(item?.packContents) && item.packContents.length > 0;
}

function specialItem(entry, qty, parent) {
  const name = cleanItemName(entry?.special || entry?.name);
  if (!name) return null;
  return {
    name,
    source: parent?.source || 'Custom',
    type: 'gear',
    rarity: 'none',
    weight: 0,
    value: 0,
    qty,
    custom: true,
  };
}

export function expandInventoryItem(item, itemDb, qty = 1, visited = new Set()) {
  if (!item?.name) return [];

  const itemQty = Math.max(1, Number(qty ?? 1) || 1);
  const key = `${norm(item.name)}|${String(item.source || '').toUpperCase()}`;
  if (visited.has(key) || !shouldExpandItemContents(item)) {
    return [{ ...item, qty: itemQty }];
  }

  const nextVisited = new Set(visited);
  nextVisited.add(key);

  const expanded = item.packContents.flatMap((entry) => {
    if (!entry) return [];

    if (typeof entry === 'string') {
      const ref = parseInventoryItemRef(entry);
      const child = findInventoryItem(itemDb, ref.name, ref.source);
      return child ? expandInventoryItem(child, itemDb, itemQty, nextVisited) : [];
    }

    if (entry.item) {
      const ref = parseInventoryItemRef(entry.item);
      const childQty = Math.max(1, Number(entry.quantity || 1)) * itemQty;
      const child = findInventoryItem(itemDb, ref.name, ref.source);
      return child ? expandInventoryItem(child, itemDb, childQty, nextVisited) : [];
    }

    if (entry.special) {
      const custom = specialItem(entry, Math.max(1, Number(entry.quantity || 1)) * itemQty, item);
      return custom ? [custom] : [];
    }

    return [];
  });
  return expanded.length ? expanded : [{ ...item, qty: itemQty }];
}

export function addInventoryEntries(inventory, entries, itemDb = null, normalizeEntry = null) {
  const next = [...(inventory || [])];
  const normalize = typeof normalizeEntry === 'function' ? normalizeEntry : (entry) => entry;
  const additions = (entries || []).flatMap((item) => {
    if (!item?.name) return [];
    const qty = inventoryQty(item);
    const expanded = itemDb ? expandInventoryItem(item, itemDb, qty) : [{ ...item, qty }];
    return expanded.map(normalize).filter((entry) => entry?.name);
  });

  additions.forEach((item) => {
    const idx = next.findIndex((entry) => entry.name === item.name && entry.source === item.source && craftedFlagOf(entry) === craftedFlagOf(item));
    const qty = inventoryQty(item);
    if (idx === -1) next.push({ ...item, qty });
    else next[idx] = { ...next[idx], qty: inventoryQty(next[idx]) + qty };
  });
  return next;
}
