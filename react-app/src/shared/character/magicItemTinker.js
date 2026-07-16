import { isReplicateArmorItem } from './replicateMagicItem.js';

export const MAGIC_ITEM_TINKER_DRAIN_RESOURCE = 'artificer_magic_item_tinker_drain';
export const MAGIC_ITEM_TINKER_TRANSMUTE_RESOURCE = 'artificer_magic_item_tinker_transmute';

export function isReplicatedItem(item) {
  return Array.isArray(item?.flags) && item.flags.includes('replicated');
}

export function pruneReplicatedItemsForPlans(inventory, plans) {
  const current = inventory || [];
  const known = new Set((plans || []).map((plan) => String(plan || '')).filter(Boolean));
  const next = current.filter((item) => (
    !isReplicatedItem(item)
    || !item.craftedFrom
    || known.has(String(item.craftedFrom))
  ));
  return next.length === current.length ? current : next;
}

export function replicatedNonArmorCount(inventory) {
  return (inventory || []).reduce((sum, item) => (
    isReplicatedItem(item) && !isReplicateArmorItem(item)
      ? sum + Math.max(1, Number(item.qty || 1))
      : sum
  ), 0);
}

export function itemChargeMaximum(item) {
  const max = Number(item?.charges);
  return Number.isFinite(max) && max > 0 ? Math.floor(max) : 0;
}

export function itemChargeCurrent(item) {
  const max = itemChargeMaximum(item);
  if (!max) return 0;
  const current = item?.chargesCurrent == null ? max : Number(item.chargesCurrent);
  return Math.max(0, Math.min(max, Number.isFinite(current) ? Math.floor(current) : max));
}

export function setReplicatedItemCharges(inventory, craftedFrom, value) {
  const source = String(craftedFrom || '');
  return (inventory || []).map((item) => {
    if (!isReplicatedItem(item) || String(item.craftedFrom || '') !== source) return item;
    const max = itemChargeMaximum(item);
    if (!max) return item;
    return { ...item, chargesCurrent: Math.max(0, Math.min(max, Math.floor(Number(value) || 0))) };
  });
}

export function rechargeReplicatedItem(inventory, craftedFrom, amount) {
  const source = String(craftedFrom || '');
  return (inventory || []).map((item) => {
    if (!isReplicatedItem(item) || String(item.craftedFrom || '') !== source) return item;
    const max = itemChargeMaximum(item);
    if (!max) return item;
    const next = Math.min(max, itemChargeCurrent(item) + Math.max(0, Math.floor(Number(amount) || 0)));
    return { ...item, chargesCurrent: next };
  });
}

export function drainSpellSlotLevel(item) {
  const rarity = String(item?.rarity || '').toLowerCase();
  if (rarity === 'common') return 1;
  if (rarity === 'uncommon' || rarity === 'rare') return 2;
  return 0;
}

export function replaceReplicatedItem(inventory, craftedFrom, targetPlan, targetItem) {
  const source = String(craftedFrom || '');
  if (!source || !targetPlan || !targetItem?.name) return inventory || [];
  const index = (inventory || []).findIndex((item) => (
    isReplicatedItem(item) && String(item.craftedFrom || '') === source
  ));
  if (index < 0) return inventory || [];

  const previous = inventory[index];
  const flags = [...new Set([...(Array.isArray(targetItem.flags) ? targetItem.flags : []), 'replicated'])];
  const replacement = {
    ...targetItem,
    name: targetItem.name,
    source: targetItem.source || 'Crafted',
    type: targetItem.type || 'gear',
    rarity: targetItem.rarity || 'none',
    weight: Number(targetItem.weight || 0),
    value: Number(targetItem.value || 0),
    qty: 1,
    carried: previous.carried ?? true,
    equipped: false,
    attuned: false,
    flags,
    craftedFrom: String(targetPlan),
    craftedLabel: previous.craftedLabel || 'Replicate Magic Item',
  };
  if (itemChargeMaximum(replacement)) replacement.chargesCurrent = itemChargeMaximum(replacement);

  const next = [...inventory];
  next[index] = replacement;
  return next;
}
