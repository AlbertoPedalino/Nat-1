import { findInventoryItem, parseInventoryItemRef } from '../../../shared/character/inventory/itemContainers.js';
import { strip5eMarkup } from '../../../shared/content/entryText.js';
import { stripSource } from '../../../shared/content/nameKeys.js';
import { formatCopper } from '../../../shared/character/inventory/currency.js';

// A class or background's starting equipment: choice blocks, the items and
// coins they grant, and the gear-type slots still to pick.

const CHOICE_KEYS = ['A', 'B', 'C', 'D', 'E', 'a', 'b', 'c', 'd', 'e'];

export function cpToCoins(cpValue) {
  let cp = Number(cpValue || 0);
  const gp = Math.floor(cp / 100);
  cp %= 100;
  const sp = Math.floor(cp / 10);
  cp %= 10;
  return { gp, sp, cp };
}


export function itemSearchText(item) {
  return [
    item?.name,
    item?.source,
    item?.sourceAlias,
    item?.type,
    item?.rarity,
    item?.scfType,
    Array.isArray(item?.focus) ? item.focus.join(' ') : '',
    Array.isArray(item?.group) ? item.group.join(' ') : '',
    Array.isArray(item?.items) ? item.items.map((ref) => parseInventoryItemRef(ref).name).join(' ') : '',
  ].filter(Boolean).join(' ').toLowerCase();
}

export function flattenEquip(node, items = []) {
  if (!node) return items;
  if (typeof node === 'string') {
    items.push(strip5eMarkup(node).replace(/\|[a-zA-Z0-9-]+/g, ''));
    return items;
  }
  if (typeof node === 'number') return items;
  if (Array.isArray(node)) {
    node.forEach((item) => flattenEquip(item, items));
    return items;
  }
  if (typeof node === 'object') {
    const choiceKeys = CHOICE_KEYS.filter((key) => Object.prototype.hasOwnProperty.call(node, key));
    const resolved = [...new Set(choiceKeys.map((key) => key.toUpperCase()))].map((key) => (node[key] !== undefined ? key : key.toLowerCase()));
    if (resolved.length > 1) {
      items.push(resolved.map((key) => flattenEquip(node[key], []).join(', ')).join(' or '));
      return items;
    }
    if (node.item) {
      const name = stripSource(node.item);
      const qty = node.quantity && node.quantity > 1 ? ` x${node.quantity}` : '';
      const value = node.containsValue || node.value || 0;
      items.push(`${strip5eMarkup(name)}${qty}${value ? ` (${formatCopper(value)})` : ''}`);
    } else if (node.special) items.push(strip5eMarkup(node.special));
    else if (node.equipmentType) items.push(strip5eMarkup(node.equipmentType));
    else if (node.containsValue || node.value) items.push(formatCopper(node.containsValue || node.value));
    else if (node.entries) flattenEquip(node.entries, items);
    else Object.entries(node).forEach(([key, value]) => {
      if (!['source', 'page', 'type'].includes(key)) flattenEquip(value, items);
    });
  }
  return items;
}

export function extractEquipItems(node, result = { items: [], cp: 0 }) {
  if (!node) return result;
  if (typeof node === 'string') {
    const gp = node.match(/(\d+)\s*gp/i);
    const sp = node.match(/(\d+)\s*sp/i);
    const cp = node.match(/(\d+)\s*cp/i);
    if (gp) result.cp += Number(gp[1]) * 100;
    else if (sp) result.cp += Number(sp[1]) * 10;
    else if (cp) result.cp += Number(cp[1]);
    else {
      const name = node.replace(/\|[a-zA-Z0-9-]+/g, '').trim();
      if (name) result.items.push({ name, qty: 1 });
    }
    return result;
  }
  if (Array.isArray(node)) {
    node.forEach((item) => extractEquipItems(item, result));
    return result;
  }
  if (typeof node === 'object') {
    if (node.value) result.cp += Number(node.value || 0);
    if (node.containsValue) result.cp += Number(node.containsValue || 0);
    if (node.item) result.items.push({ ...parseInventoryItemRef(node.item), qty: node.quantity || 1 });
    else if (node.equipmentType) result.items.push({ ...parseInventoryItemRef(node.equipmentType), qty: node.quantity || 1, equipmentType: true });
    else if (node.entries) extractEquipItems(node.entries, result);
    else Object.entries(node).forEach(([key, value]) => {
      if (!['source', 'page', 'type', 'displayName', 'quantity', 'value', 'containsValue'].includes(key)) extractEquipItems(value, result);
    });
  }
  return result;
}

export function collectChoiceBlocks(eq, prefix) {
  const blocks = [];
  if (eq?.defaultData?.[0]) {
    const choiceData = eq.defaultData[0];
    const keys = ['A', 'B', 'C', 'D', 'E'].filter((key) => key in choiceData);
    if (keys.length > 1) {
      blocks.push({
        key: `${prefix}_choice_0`,
        label: 'Choose option',
        options: keys.map((key) => ({ value: key, label: flattenEquip(choiceData[key], []).join(', ') || key, node: choiceData[key] })),
      });
      return blocks;
    }
  }

  let index = 0;
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    const keys = CHOICE_KEYS.filter((key) => Object.prototype.hasOwnProperty.call(node, key));
    const resolved = [...new Set(keys.map((key) => key.toUpperCase()))].map((key) => (node[key] !== undefined ? key : key.toLowerCase()));
    if (resolved.length > 1) {
      blocks.push({
        key: `${prefix}_choice_${index}`,
        label: 'Choose option',
        options: resolved.map((key) => ({ value: key, label: flattenEquip(node[key], []).join(', ') || key.toUpperCase(), node: node[key] })),
      });
      index += 1;
      return;
    }
    Object.entries(node).forEach(([key, value]) => {
      if (!['source', 'page', 'type'].includes(key)) visit(value);
    });
  };
  visit(eq);
  return blocks;
}

export function resolveEquipmentItems(extracted, itemDb) {
  const out = [];
  extracted.items.forEach((item) => {
    // equipmentType entries (gaming set, focus, …) are picked explicitly via the
    // per-slot picker, not auto-resolved to a generic placeholder.
    if (item.equipmentType) return;
    const dbItem = findInventoryItem(itemDb, item.name, item.source);
    if (dbItem) out.push({ ...dbItem, qty: item.qty ?? 1 });
  });
  return out;
}

// equipmentType slots that need an explicit item pick, derived from the currently
// selected option of each choice block (or the whole block when it has no choices).
export function collectEquipmentTypeSlots(eq, prefix, blocks, equipChoices) {
  const slots = [];
  const pushFrom = (node, keyBase) => {
    extractEquipItems(node).items
      .filter((entry) => entry.equipmentType)
      .forEach((entry, index) => slots.push({ slotKey: `${keyBase}__et${index}`, code: entry.name }));
  };
  if (blocks.length) {
    blocks.forEach((block) => {
      const selected = equipChoices[block.key];
      if (!selected) return;
      const option = block.options.find((opt) => opt.value === selected);
      if (option) pushFrom(option.node, `${block.key}_${selected}`);
    });
  } else {
    pushFrom(eq, prefix);
  }
  return slots;
}
