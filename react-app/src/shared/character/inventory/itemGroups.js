import { isMagicItem } from './itemRarity.js';
import { ANY_ARMOR_CODES, ANY_WEAPON_CODES, itemBaseType } from './itemKinds.js';
// The filter-chip taxonomy for item lists: which shelf an item sits on, the
// chip set itself, and the test a chip applies. Shared so the builder and the
// sheet cannot disagree — they used to classify independently, and a ring with
// no rarity landed in "Magic" on one screen and "Gear" on the other.

const MAGIC_TYPES = new Set(['RG']);

export const ITEM_GROUP_KEYS = Object.freeze(['weapon', 'armor', 'magic', 'gear']);

// Order matters: an item is classified by what it *is* before what it costs, so
// a Flame Tongue is a Weapon, not Magic.
export function itemGroupKey(item) {
  const type = itemBaseType(item);
  if (ANY_WEAPON_CODES.has(type)) return 'weapon';
  if (ANY_ARMOR_CODES.has(type)) return 'armor';
  if (MAGIC_TYPES.has(type)) return 'magic';
  if (isMagicItem(item)) return 'magic';
  return 'gear';
}

// Worn or held. Weapons assigned to a hand slot carry `equipped` too, but the
// flag alone is not enough for stacks split across slots, so check both.
export function isItemEquipped(item) {
  return Boolean(item?.equipped || item?.equippedSlot);
}

const ALL_ITEMS_CHIP = Object.freeze({ key: 'all', label: 'All' });
const EQUIPPED_CHIP = Object.freeze({ key: 'equipped', label: 'Equipped' });

// Chip set for a list of items you can only browse (an item database).
export const ITEM_GROUP_CHIPS = Object.freeze([
  ALL_ITEMS_CHIP,
  { key: 'weapon', label: 'Weapons' },
  { key: 'armor', label: 'Armor' },
  { key: 'gear', label: 'Gear' },
  { key: 'magic', label: 'Magic' },
].map(Object.freeze));

// Chip set for a list of items you own. "Equipped" is meaningless against a
// database, so it only exists here.
export const OWNED_ITEM_CHIPS = Object.freeze([...ITEM_GROUP_CHIPS, EQUIPPED_CHIP]);

export function matchesItemGroupChip(item, chipKey) {
  if (!chipKey || chipKey === ALL_ITEMS_CHIP.key) return true;
  if (chipKey === EQUIPPED_CHIP.key) return isItemEquipped(item);
  return itemGroupKey(item) === chipKey;
}
