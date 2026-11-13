// An item's rarity, said one way everywhere: the compendium's filter and
// column, the item card's Rarity line, the inventory's magic group and the
// item search's order all read it from here.

// The rarities of magic items, in order.
export const RARITY_OPTIONS = Object.freeze([
  { key: 'common', label: 'Common' },
  { key: 'uncommon', label: 'Uncommon' },
  { key: 'rare', label: 'Rare' },
  { key: 'very rare', label: 'Very Rare' },
  { key: 'legendary', label: 'Legendary' },
  { key: 'artifact', label: 'Artifact' },
  { key: 'varies', label: 'Varies' },
  { key: 'unknown (magic)', label: 'Unknown Rarity' },
].map(Object.freeze));

// Mundane first, then the magic ones in order.
const RARITY_ORDER = ['none', ...RARITY_OPTIONS.map(({ key }) => key)];

// The raw rarity, lower-case; "none" when there is none.
export function rarityKey(item) {
  return String(item?.rarity || 'none').trim().toLowerCase() || 'none';
}

// "Very Rare", "Unknown Rarity"; '' for a mundane item.
export function rarityLabel(item) {
  return RARITY_OPTIONS.find(({ key }) => key === rarityKey(item))?.label || '';
}

// For sorting: mundane, common … artifact, varies, unknown; anything else last.
export function rarityRank(item) {
  const index = RARITY_ORDER.indexOf(rarityKey(item));
  return index === -1 ? RARITY_ORDER.length : index;
}

// "none" is a mundane item, "unknown" an object of no set worth: neither is
// magic.
export function isMagicItem(item) {
  const rarity = rarityKey(item);
  return rarity !== 'none' && rarity !== 'unknown';
}

// Each tier's colour, a looter's tiers bright enough to letter a name on the
// dark paper: white-ish, green, blue, purple, orange, pink. Game data, not
// interface style; the theme lays it out as gmboard.rarity.<Label> and '—'
// is the GM board's "no rarity".
export const RARITY_COLORS = Object.freeze({
  Artifact: '#ff6fb5',
  Legendary: '#ff9a3c',
  'Very Rare': '#c38cff',
  Rare: '#5aa9ff',
  Uncommon: '#5fd48a',
  Common: '#d6cdc1',
  '—': '#7a6040',
});

// The colour a magic item wears (its name, its bar, its card's wash), as a
// palette colour; null for a mundane item or one of no set tier.
export function rarityTone(item) {
  // "Varies" and "Unknown Rarity" have no tier, so no colour.
  return isMagicItem(item) ? RARITY_COLORS[rarityLabel(item)] || null : null;
}
