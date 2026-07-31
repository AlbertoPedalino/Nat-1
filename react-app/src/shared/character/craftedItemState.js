// Data-only state helpers for crafted/created inventory items. This module is
// deliberately free of registry/UI imports so creation semantics are reusable
// and testable outside the Vite runtime.

export const CRAFTED_FLAG_META = {
  replicated: { originKind: 'class', vanishesOnLongRest: false },
  tinker: { originKind: 'class', vanishesOnLongRest: true },
  fastcraft: { originFeat: 'Crafter', vanishesOnLongRest: true },
};

export const CRAFTED_FLAGS = Object.keys(CRAFTED_FLAG_META);

export const VANISH_ON_LONG_REST_FLAGS = CRAFTED_FLAGS.filter(
  (flag) => CRAFTED_FLAG_META[flag].vanishesOnLongRest,
);

function itemQty(item) {
  return Math.max(1, Number(item?.qty ?? 1) || 1);
}

export function craftedFlagOf(item) {
  if (!Array.isArray(item?.flags)) return '';
  return CRAFTED_FLAGS.find((flag) => item.flags.includes(flag)) || '';
}

export function isCraftedItem(item) {
  return craftedFlagOf(item) !== '';
}

function craftedSourceOf(item) {
  return String(item?.craftedFrom ?? '');
}

export function craftedCount(inventory, flag) {
  return (inventory || []).reduce(
    (sum, item) => (craftedFlagOf(item) === flag ? sum + itemQty(item) : sum),
    0,
  );
}

export function craftedCountFor(inventory, flag, source) {
  const src = String(source || '');
  return (inventory || []).reduce(
    (sum, item) => (
      craftedFlagOf(item) === flag && craftedSourceOf(item) === src
        ? sum + itemQty(item)
        : sum
    ),
    0,
  );
}

export function addCraftedItem(inventory, itemData, flag, source, max = Infinity, label = '') {
  if (craftedCount(inventory, flag) >= max) return inventory || [];
  const src = String(source || '');
  const base = itemData && itemData.name ? itemData : { name: src };
  const flags = [...new Set([...(Array.isArray(base.flags) ? base.flags : []), flag])];
  const tagLabel = String(label || '').trim();
  const entry = {
    ...base,
    name: base.name || src,
    source: base.source || 'Crafted',
    type: base.type || 'gear',
    rarity: base.rarity || 'none',
    weight: Number(base.weight ?? 0),
    value: Number(base.value || 0),
    equipped: false,
    qty: 1,
    flags,
    craftedFrom: src,
    ...(tagLabel ? { craftedLabel: tagLabel } : {}),
  };

  const next = [...(inventory || [])];
  const index = next.findIndex((item) => (
    craftedFlagOf(item) === flag
    && craftedSourceOf(item) === src
    && item.name === entry.name
    && item.source === entry.source
  ));
  if (index === -1) next.push(entry);
  else next[index] = { ...next[index], qty: itemQty(next[index]) + 1 };
  return next;
}

export function removeOneCrafted(inventory, flag, source) {
  const src = String(source || '');
  const next = [...(inventory || [])];
  let index = -1;
  for (let i = next.length - 1; i >= 0; i -= 1) {
    if (craftedFlagOf(next[i]) === flag && craftedSourceOf(next[i]) === src) {
      index = i;
      break;
    }
  }
  if (index === -1) return next;
  const nextQty = itemQty(next[index]) - 1;
  if (nextQty > 0) next[index] = { ...next[index], qty: nextQty };
  else next.splice(index, 1);
  return next;
}

export function clearCraftedByFlag(inventory, flags = VANISH_ON_LONG_REST_FLAGS) {
  const set = new Set(flags);
  return (inventory || []).filter((item) => !set.has(craftedFlagOf(item)));
}
