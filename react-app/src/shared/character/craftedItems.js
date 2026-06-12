import { ENTITY_COLORS } from '../entityColors.js';
import { featOriginKind } from './selectedFeats.js';

// Crafted/created inventory items shared infra (Artificer Replicate Magic Item,
// Tinker's Magic, Crafter feat Fast Crafting, ...).
//
// A crafted item lives in the normal inventory but carries one crafted flag plus
// a `craftedFrom` link to the plan/recipe that produced it. Items with different
// crafted flags — or a crafted item vs an identically-named mundane item — never
// merge into the same stack. Each feature passes its own flag, so adding a new
// "create item from a list" feature is just a new flag + config, no new logic.

// Single source of truth for every crafted flag: the entity that grants the
// crafting feature (for provenance-coloured tags) and whether its items vanish
// at a Long Rest. Adding a "create from a list" feature = one entry here (+ a
// detail config on the action). The derived constants below are computed from
// this map. The tag label is not stored here: each crafted item carries its own
// `craftedLabel`, stamped at creation from the granting feature's real name
// (see `addCraftedItem` / CreatedItemsPanel).
//
// Provenance follows the app-wide entity-colour rules (see `craftedTagColor`):
// - `originKind`: a fixed entity kind (e.g. Artificer class features).
// - `originFeat`: a feat name whose granting entity is resolved per character
//   (background origin feat → background tone, free slot → feat tone, ...).
export const CRAFTED_FLAG_META = {
  replicated: { originKind: 'class', vanishesOnLongRest: false },
  tinker: { originKind: 'class', vanishesOnLongRest: true },
  fastcraft: { originFeat: 'Crafter', vanishesOnLongRest: true },
};

// Entity-colour for a crafted flag's tag, by provenance. Class-granted features
// use the class tone; feat-granted ones inherit the colour of whatever granted
// the feat for this character. Returns null for unknown flags.
export function craftedTagColor(flag, character) {
  const meta = CRAFTED_FLAG_META[flag];
  if (!meta) return null;
  if (meta.originKind) return ENTITY_COLORS[meta.originKind] || ENTITY_COLORS.class;
  if (meta.originFeat) {
    const kind = featOriginKind(character, meta.originFeat);
    return ENTITY_COLORS[kind] || ENTITY_COLORS.feat;
  }
  return ENTITY_COLORS.class;
}

export const CRAFTED_FLAGS = Object.keys(CRAFTED_FLAG_META);

// Flags whose items vanish when the character finishes a Long Rest.
export const VANISH_ON_LONG_REST_FLAGS = CRAFTED_FLAGS.filter(
  (flag) => CRAFTED_FLAG_META[flag].vanishesOnLongRest,
);

function itemQty(item) {
  return Math.max(1, Number(item?.qty ?? 1) || 1);
}

// The crafted flag an item carries ('' if it is a normal item).
export function craftedFlagOf(item) {
  if (!Array.isArray(item?.flags)) return '';
  return CRAFTED_FLAGS.find((flag) => item.flags.includes(flag)) || '';
}

export function isCraftedItem(item) {
  return craftedFlagOf(item) !== '';
}

// The plan/recipe an item was crafted from.
function craftedSourceOf(item) {
  return String(item?.craftedFrom ?? '');
}

// Total crafted items for a flag across every source (counts quantities).
export function craftedCount(inventory, flag) {
  return (inventory || []).reduce(
    (sum, item) => (craftedFlagOf(item) === flag ? sum + itemQty(item) : sum),
    0,
  );
}

// Crafted items for a flag from a specific source/plan (counts quantities).
export function craftedCountFor(inventory, flag, source) {
  const src = String(source || '');
  return (inventory || []).reduce(
    (sum, item) => (craftedFlagOf(item) === flag && craftedSourceOf(item) === src ? sum + itemQty(item) : sum),
    0,
  );
}

// Append one crafted item, stacking with an existing crafted entry of the same
// flag/source/name/source-book. `max` caps the total active items for the flag
// (defence-in-depth against rapid clicks).
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
  const idx = next.findIndex((it) => (
    craftedFlagOf(it) === flag
    && craftedSourceOf(it) === src
    && it.name === entry.name
    && it.source === entry.source
  ));
  if (idx === -1) next.push(entry);
  else next[idx] = { ...next[idx], qty: itemQty(next[idx]) + 1 };
  return next;
}

// Remove a single crafted item for flag/source (decrement, then drop at 0).
export function removeOneCrafted(inventory, flag, source) {
  const src = String(source || '');
  const next = [...(inventory || [])];
  let idx = -1;
  for (let i = next.length - 1; i >= 0; i -= 1) {
    if (craftedFlagOf(next[i]) === flag && craftedSourceOf(next[i]) === src) { idx = i; break; }
  }
  if (idx === -1) return next;
  const nextQty = itemQty(next[idx]) - 1;
  if (nextQty > 0) next[idx] = { ...next[idx], qty: nextQty };
  else next.splice(idx, 1);
  return next;
}

// Long-rest vanish: drop every item carrying one of the given crafted flags.
export function clearCraftedByFlag(inventory, flags = VANISH_ON_LONG_REST_FLAGS) {
  const set = new Set(flags);
  return (inventory || []).filter((item) => !set.has(craftedFlagOf(item)));
}
