// Artificer "Replicate Magic Item" (EFA) — inventory helpers.
//
// Replicated items live in the normal inventory but carry the `replicated`
// flag plus a `replicatedFrom` link to the plan that produced them. They never
// merge with an identically-named non-replicated item: a replicated "Shield +1"
// and a mundane "Shield +1" are two separate inventory entries.

export const REPLICATED_FLAG = 'replicated';

function itemQty(item) {
  return Math.max(1, Number(item?.qty ?? 1) || 1);
}

export function isReplicatedItem(item) {
  return Array.isArray(item?.flags) && item.flags.includes(REPLICATED_FLAG);
}

// Total replicated items across every plan (counts quantities).
export function replicatedCount(inventory) {
  return (inventory || []).reduce(
    (sum, item) => (isReplicatedItem(item) ? sum + itemQty(item) : sum),
    0,
  );
}

// Replicated items created from a specific plan (counts quantities).
export function replicatedCountFor(inventory, planName) {
  const plan = String(planName || '');
  return (inventory || []).reduce(
    (sum, item) => (isReplicatedItem(item) && item.replicatedFrom === plan ? sum + itemQty(item) : sum),
    0,
  );
}

// Append one replicated item for `planName`, stacking with an existing
// replicated entry of the same plan/name/source. `itemData` carries the
// resolved item fields (rarity, type, entries, ...) and is normalised here.
// `maxActive` (optional) caps the total active items — when reached the
// inventory is returned unchanged (defence-in-depth against rapid clicks).
export function addReplicatedItem(inventory, itemData, planName, maxActive = Infinity) {
  if (replicatedCount(inventory) >= maxActive) return inventory || [];
  const plan = String(planName || '');
  const base = itemData && itemData.name ? itemData : { name: plan };
  const flags = [...new Set([...(Array.isArray(base.flags) ? base.flags : []), REPLICATED_FLAG])];
  const entry = {
    ...base,
    name: base.name || plan,
    source: base.source || 'EFA',
    type: base.type || 'gear',
    rarity: base.rarity || 'none',
    weight: Number(base.weight ?? 0),
    value: Number(base.value || 0),
    equipped: false,
    qty: 1,
    flags,
    replicatedFrom: plan,
  };

  const next = [...(inventory || [])];
  const idx = next.findIndex((it) => (
    isReplicatedItem(it)
    && it.replicatedFrom === plan
    && it.name === entry.name
    && it.source === entry.source
  ));
  if (idx === -1) next.push(entry);
  else next[idx] = { ...next[idx], qty: itemQty(next[idx]) + 1 };
  return next;
}

// Remove a single replicated item for `planName` (decrement, then drop at 0).
export function removeOneReplicated(inventory, planName) {
  const plan = String(planName || '');
  const next = [...(inventory || [])];
  let idx = -1;
  for (let i = next.length - 1; i >= 0; i -= 1) {
    if (isReplicatedItem(next[i]) && next[i].replicatedFrom === plan) { idx = i; break; }
  }
  if (idx === -1) return next;
  const nextQty = itemQty(next[idx]) - 1;
  if (nextQty > 0) next[idx] = { ...next[idx], qty: nextQty };
  else next.splice(idx, 1);
  return next;
}
