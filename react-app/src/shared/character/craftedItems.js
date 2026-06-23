import { alpha } from '@mui/material';
import { ENTITY_COLORS } from '../entityColors.js';
import { featOriginKind } from './selectedFeats.js';
import { CRAFTED_FLAG_META, craftedFlagOf } from './craftedItemState.js';

// Public facade for crafted item state plus provenance-aware presentation.
// State transitions live in craftedItemState.js so they remain data-only and
// usable by non-UI consumers; colour resolution stays here because it depends
// on character feat provenance and the installed adapter registry.
export {
  CRAFTED_FLAG_META,
  CRAFTED_FLAGS,
  VANISH_ON_LONG_REST_FLAGS,
  addCraftedItem,
  clearCraftedByFlag,
  craftedCount,
  craftedCountFor,
  craftedFlagOf,
  isCraftedItem,
  removeOneCrafted,
} from './craftedItemState.js';

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

// MiniBadge descriptors ({ key, label, color, bg }) for an item's provenance
// tags, following the spell/action tab convention so badges read identically.
// Returns an array so new tag sources are a push, not another inline branch.
export function buildItemTags(item, character) {
  const tags = [];
  const flag = craftedFlagOf(item);
  if (flag && item?.craftedLabel) {
    const color = craftedTagColor(flag, character);
    if (color) tags.push({ key: flag, label: item.craftedLabel, color, bg: alpha(color, 0.16) });
  }
  return tags;
}
