import { canStackInventoryItems, itemIdentityKey } from './itemIdentity.js';
import { itemChargeMaximum } from './itemCharges.js';
import { isItemCarried, itemQty } from './weight.js';
import { matchKey, splitNameSource } from '../../content/nameKeys.js';
import { stripMarkup } from '../../content/markupText.js';

// The equipped slot of a stack readied to throw (Thrown weapons).
export const THROWN_SLOT = 'thrown';

export function parseInventoryItemRef(ref) {
  const { name, source } = splitNameSource(ref);
  return {
    name: cleanItemName(name),
    source: String(source || '').trim().toUpperCase(),
  };
}

function cleanItemName(name) {
  return stripMarkup(name)
    .replace(/\s+/g, ' ')
    .trim();
}

function matchSource(item, source) {
  return !source || String(item?.source || '').toUpperCase() === String(source || '').toUpperCase();
}


export function findInventoryItem(itemDb, name, source = '') {
  const targetName = matchKey(name);
  if (!targetName) return null;

  const exact = (itemDb || []).find((item) => matchKey(item?.name) === targetName && matchSource(item, source));
  if (exact) return exact;

  const groupMatch = (itemDb || []).find((item) => (
    Array.isArray(item?.group)
    && item.group.some((groupName) => matchKey(groupName) === targetName)
    && matchSource(item, source)
  ));
  if (groupMatch) return groupMatch;

  if (source) return findInventoryItem(itemDb, name, '');
  return null;
}

function shouldExpandItemContents(item) {
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

function expandInventoryItem(item, itemDb, qty = 1, visited = new Set()) {
  if (!item?.name) return [];

  const count = itemQty({ qty });
  const key = itemIdentityKey(item);
  if (visited.has(key) || !shouldExpandItemContents(item)) {
    return [{ ...item, qty: count }];
  }

  const nextVisited = new Set(visited);
  nextVisited.add(key);

  const expanded = item.packContents.flatMap((entry) => {
    if (!entry) return [];

    if (typeof entry === 'string') {
      const ref = parseInventoryItemRef(entry);
      const child = findInventoryItem(itemDb, ref.name, ref.source);
      return child ? expandInventoryItem(child, itemDb, count, nextVisited) : [];
    }

    if (entry.item) {
      const ref = parseInventoryItemRef(entry.item);
      const childQty = Math.max(1, Number(entry.quantity || 1)) * count;
      const child = findInventoryItem(itemDb, ref.name, ref.source);
      return child ? expandInventoryItem(child, itemDb, childQty, nextVisited) : [];
    }

    if (entry.special) {
      const custom = specialItem(entry, Math.max(1, Number(entry.quantity || 1)) * count, item);
      return custom ? [custom] : [];
    }

    return [];
  });
  return expanded.length ? expanded : [{ ...item, qty: count }];
}

export function addInventoryEntries(inventory, entries, itemDb = null, normalizeEntry = null) {
  const next = [...(inventory || [])];
  const normalize = typeof normalizeEntry === 'function' ? normalizeEntry : (entry) => entry;
  const additions = (entries || []).flatMap((item) => {
    if (!item?.name) return [];
    const qty = itemQty(item);
    const expanded = itemDb ? expandInventoryItem(item, itemDb, qty) : [{ ...item, qty }];
    return expanded
      .map(normalize)
      .filter((entry) => entry?.name)
      .flatMap((entry) => {
        const entryQty = itemQty(entry);
        if (!itemChargeMaximum(entry) || entryQty <= 1) return [entry];
        return Array.from({ length: entryQty }, () => ({ ...entry, qty: 1 }));
      });
  });

  additions.forEach((item) => {
    const idx = next.findIndex((entry) => canStackInventoryItems(entry, item));
    const qty = itemQty(item);
    if (idx === -1) next.push({ ...item, qty });
    else next[idx] = { ...next[idx], qty: itemQty(next[idx]) + qty };
  });
  return next;
}

// One more or one fewer of an inventory row, the same on the sheet and in the
// builder. A row at zero goes. Adding to a row that must stay a single unit —
// something equipped (a stack readied to throw excepted) or an item with its
// own charges — adds an unequipped copy instead, without the charges or the
// attunement of the original.
export function stepInventoryQty(inventory, index, delta) {
  const current = inventory || [];
  const target = current[index];
  if (!target) return current;
  const singleUnit = (target.equipped || target.equippedSlot) && target.equippedSlot !== THROWN_SLOT;
  const charged = itemChargeMaximum(target) > 0;
  if (delta > 0 && (singleUnit || charged)) {
    const copy = { ...target, qty: delta, equipped: false };
    delete copy.equippedSlot;
    if (charged) {
      delete copy.attuned;
      delete copy.chargesCurrent;
    }
    return addInventoryEntries(current, [copy]);
  }
  return current.flatMap((item, idx) => {
    if (idx !== index) return [item];
    const qty = Math.max(0, itemQty(item) + delta);
    return qty > 0 ? [{ ...item, qty }] : [];
  });
}

function setInventoryItemCarried(item, carried) {
  const wasCarried = isItemCarried(item);
  const next = {
    ...item,
    equipped: carried && wasCarried ? item.equipped : false,
    attuned: carried && wasCarried ? item.attuned : false,
  };
  if (carried) delete next.carried;
  else next.carried = false;
  if (!carried) delete next.equippedSlot;
  if (!next.attuned) delete next.attuned;
  return next;
}

export function setOneInventoryUnitCarried(inventory, index, carried) {
  const current = Array.isArray(inventory) ? inventory : [];
  const target = current[index];
  if (!target || isItemCarried(target) === carried) return current;

  const count = itemQty(target);
  if (count <= 1) {
    return addInventoryEntries(
      current.filter((_, idx) => idx !== index),
      [setInventoryItemCarried(target, carried)],
    );
  }

  const remaining = { ...target, qty: count - 1 };
  const moved = setInventoryItemCarried({ ...target, qty: 1 }, carried);
  const base = current.map((item, idx) => (idx === index ? remaining : item));
  return addInventoryEntries(base, [moved]);
}
