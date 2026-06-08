// Artificer "Replicate Magic Item" (EFA) generic plan rows ("buckets").
//
// The official Magic Item Plans tables mix concrete named items with generic
// {@filter ...} rows. Those generic rows are NOT all "wondrous items" — the
// rules differ per table:
//   - Lv 2+ : any Common magic item that isn't a Potion, a Scroll, or cursed
//   - Lv 10+: an Uncommon Wondrous Item that isn't cursed
//   - Lv 14+: a Rare Wondrous Item that isn't cursed
// (Lv 6+ has no generic row.)
//
// A bucket is not a real item: the builder must resolve it to a concrete item
// matching the filter, which is what gets stored as the plan. This module is
// the single source of truth for the bucket labels and their filter predicate,
// shared by the Artificer adapter (pool generation), the builder picker, and
// the sheet card (legacy clean-up).

const norm = (value) => String(value || '').split('|')[0];
const lc = (value) => String(value || '').toLowerCase();

// 5etools type codes excluded from the Common bucket.
const POTION = 'P';
const SCROLL = 'SC';

export const REPLICATE_BUCKETS = [
  {
    id: 'common-any',
    label: 'Common magic item (not Potion, Scroll, or cursed)',
    rarity: 'common',
    wondrousOnly: false,
    excludeTypes: [POTION, SCROLL],
    excludeCursed: true,
  },
  {
    id: 'uncommon-wondrous',
    label: 'Uncommon Wondrous Item (not cursed)',
    rarity: 'uncommon',
    wondrousOnly: true,
    excludeCursed: true,
  },
  {
    id: 'rare-wondrous',
    label: 'Rare Wondrous Item (not cursed)',
    rarity: 'rare',
    wondrousOnly: true,
    excludeCursed: true,
  },
];

const BY_LABEL = new Map(REPLICATE_BUCKETS.map((b) => [b.label, b]));

export const REPLICATE_BUCKET_LABELS = REPLICATE_BUCKETS.map((b) => b.label);

// Resolve a pool entry to its bucket descriptor, or null for a concrete item.
export function replicateBucketFromLabel(label) {
  return BY_LABEL.get(String(label || '').trim()) || null;
}

// True for any current bucket label or a legacy placeholder from older saves
// ("Common wondrous items", "Uncommon wondrous items", ...). Used by the card
// to drop unresolved buckets so they never show as a fictitious inventory item.
export function isReplicateBucketLabel(label) {
  const s = String(label || '').trim();
  if (BY_LABEL.has(s)) return true;
  return /\bwondrous items?$/i.test(s) || /^common magic item\b/i.test(s);
}

// Whether a DB item satisfies a bucket's filter.
export function itemMatchesBucket(item, bucket) {
  if (!item || !bucket) return false;
  if (lc(item.rarity) !== bucket.rarity) return false; // rarity==common/uncommon/rare ⇒ magic
  if (bucket.wondrousOnly && !item.wondrous) return false;
  if (bucket.excludeTypes && bucket.excludeTypes.includes(norm(item.type))) return false;
  if (bucket.excludeCursed && item.curse === true) return false;
  return true;
}

// Sorted, de-duplicated concrete item names a bucket can resolve to.
export function replicateBucketOptions(items, bucket, excludeNames) {
  const exclude = excludeNames instanceof Set ? excludeNames : new Set(excludeNames || []);
  const out = [];
  (items || []).forEach((it) => {
    if (!it?.name || !itemMatchesBucket(it, bucket)) return;
    if (exclude.has(lc(it.name))) return;
    out.push(it.name);
  });
  return [...new Set(out)].sort((a, b) => a.localeCompare(b));
}
