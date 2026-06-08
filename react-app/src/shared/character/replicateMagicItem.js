// Artificer "Replicate Magic Item" (EFA) generic plan rows ("buckets").
//
// The official Magic Item Plans tables mix concrete named items with generic
// rows. Those generic rows are NOT all "wondrous items" — the rules differ:
//   - Lv 2+ : any Common magic item that isn't a Potion, a Scroll, or cursed
//   - Lv 10+: an Uncommon Wondrous Item that isn't cursed
//   - Lv 14+: a Rare Wondrous Item that isn't cursed
// (Lv 6+ has no generic row.)
// "Weapon +1" (Lv 2), "Weapon +2" (Lv 10), "Armor +1" (Lv 6) and "Armor +2"
// (Lv 14) are likewise generic: a +N bonus applied to a base weapon/armor of
// the player's choice. They are modelled as buckets too, resolving to a
// concrete "<base item> +N" item. (Shields stay a concrete "Shield +N" plan —
// one base item, no choice.)
//
// A bucket is not a real item: the builder must resolve it to a concrete item
// matching the filter, which is what gets stored as the plan. This module is
// the single source of truth for the bucket labels and their filter predicate,
// shared by the Artificer adapter (pool generation), the builder picker, and
// the sheet card (legacy clean-up).
//
// Every bucket exposes a single `match(item)` predicate. The declarative
// builders below (rarityFilter, plusVariant) compile common shapes into one, so
// the consumers never branch on bucket shape — adding a bucket is one entry,
// built from a helper or a bespoke predicate.

const norm = (value) => String(value || '').split('|')[0];
const lc = (value) => String(value || '').toLowerCase();
const typeOf = (item) => norm(item?.type).toUpperCase();

// 5etools type codes excluded from the Common bucket.
const POTION = 'P';
const SCROLL = 'SC';

const isWeapon = (item) => ['M', 'R'].includes(typeOf(item)); // Melee / Ranged
// Body armor (Light / Medium / Heavy). Excludes shields (S): a shield is a
// single base item, so "Shield +N" stays a concrete plan with no choice.
const isBodyArmor = (item) => ['LA', 'MA', 'HA'].includes(typeOf(item));
// Standard fantasy weapon: drop modern/futuristic firearms (5etools tags them
// with `age` = "modern"/"futuristic"; renaissance Musket/Pistol carry none).
const isMundaneWeapon = (item) => isWeapon(item) && !item.age;

// Predicate for a rarity-class bucket (Common / Uncommon Wondrous / …). A
// common/uncommon/rare rarity already implies a magic item.
function rarityFilter({ rarity, wondrousOnly = false, excludeTypes = [], excludeCursed = true }) {
  const excluded = new Set(excludeTypes);
  return (item) => {
    if (lc(item.rarity) !== rarity) return false;
    if (wondrousOnly && !item.wondrous) return false;
    if (excluded.has(norm(item.type))) return false;
    if (excludeCursed && item.curse === true) return false;
    return true;
  };
}

// Predicate for a "+N applied to a base item" bucket. `bonusVariant` is tagged
// by the items loader on plain +N magic variants only, so named magic items
// that merely grant a bonus (Sun Blade, Dagger of Venom, …) are excluded.
function plusVariant(baseFilter, bonus) {
  return (item) => baseFilter(item) && item.bonusVariant === bonus;
}

export const REPLICATE_BUCKETS = [
  {
    id: 'common-any',
    label: 'Common magic item (not Potion, Scroll, or cursed)',
    match: rarityFilter({ rarity: 'common', excludeTypes: [POTION, SCROLL] }),
  },
  {
    id: 'uncommon-wondrous',
    label: 'Uncommon Wondrous Item (not cursed)',
    match: rarityFilter({ rarity: 'uncommon', wondrousOnly: true }),
  },
  {
    id: 'rare-wondrous',
    label: 'Rare Wondrous Item (not cursed)',
    match: rarityFilter({ rarity: 'rare', wondrousOnly: true }),
  },
  {
    id: 'weapon-plus-1',
    label: 'Weapon +1',
    pickLabel: 'Pick a weapon…',
    match: plusVariant(isMundaneWeapon, '+1'),
  },
  {
    id: 'weapon-plus-2',
    label: 'Weapon +2',
    pickLabel: 'Pick a weapon…',
    match: plusVariant(isMundaneWeapon, '+2'),
  },
  {
    id: 'armor-plus-1',
    label: 'Armor +1',
    pickLabel: 'Pick armor…',
    match: plusVariant(isBodyArmor, '+1'),
  },
  {
    id: 'armor-plus-2',
    label: 'Armor +2',
    pickLabel: 'Pick armor…',
    match: plusVariant(isBodyArmor, '+2'),
  },
];

const BY_LABEL = new Map(REPLICATE_BUCKETS.map((b) => [b.label, b]));

export const REPLICATE_BUCKET_LABELS = REPLICATE_BUCKETS.map((b) => b.label);

// Resolve a pool entry to its bucket descriptor, or null for a concrete item.
export function replicateBucketFromLabel(label) {
  return BY_LABEL.get(String(label || '').trim()) || null;
}

// True for a bucket label. Used by the card to drop unresolved buckets so a
// generic plan never shows as a fictitious inventory item.
export function isReplicateBucketLabel(label) {
  return BY_LABEL.has(String(label || '').trim());
}

// Whether a DB item satisfies a bucket's filter.
export function itemMatchesBucket(item, bucket) {
  if (!item || typeof bucket?.match !== 'function') return false;
  return bucket.match(item);
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
