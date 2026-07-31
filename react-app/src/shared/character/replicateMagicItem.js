// Artificer "Replicate Magic Item" (EFA) generic plan rows ("buckets").
//
// The official Magic Item Plans tables mix concrete named items with generic
// rows. Those generic rows are NOT all "wondrous items" — the rules differ:
//   - Lv 2+ : any Common magic item that isn't a Potion, a Scroll, or cursed
//   - Lv 10+: an Uncommon Wondrous Item that isn't cursed
//   - Lv 14+: a Rare Wondrous Item that isn't cursed
// (Lv 6+ has no generic row.)
// "Weapon +1" (Lv 2), "Weapon +2" (Lv 10), "Armor +1" (Lv 6), "Armor +2"
// (Lv 14), Repeating Shot and Returning Weapon are likewise generic plans:
// each must resolve to a compatible concrete base item. Shields stay concrete
// plans because they have only one possible base item.
//
// A bucket is not a real item: the builder must resolve it to a concrete item
// matching the filter, which is what gets stored as the plan. This module is
// the single source of truth for the bucket labels and their filter predicate,
// shared by the Artificer adapter (pool generation), the builder picker, and
// the sheet card.
//
// Every bucket exposes a single `match(item)` predicate. The declarative
// builders below (rarityFilter, plusVariant) compile common shapes into one, so
// the consumers never branch on bucket shape — adding a bucket is one entry,
// built from a helper or a bespoke predicate.

import { itemIdentityKey } from './itemIdentity.js';
import { primaryClassLevel } from './classLevel.js';

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
// The Armorer's level-9 Armor Replication benefit uses the broad magic-item
// Armor category, which includes shields as well as worn body armor.
export const isReplicateArmorItem = (item) => {
  const type = typeOf(item);
  if (['LA', 'MA', 'HA', 'S'].includes(type)) return true;
  // 5etools models a handful of concrete Armor plans (notably Armor of
  // Resistance) as generic-variant group records. They still belong to the
  // rules' Armor category even though their storage type is GV.
  return type === 'GV' && /^(?:\+\d+\s+)?armor\b/i.test(String(item?.name || ''));
};
// Standard fantasy weapon: drop modern/futuristic firearms (5etools tags them
// with `age` = "modern"/"futuristic"; renaissance Musket/Pistol carry none).
const isMundaneWeapon = (item) => isWeapon(item) && !item.age;
const isBaseWeapon = (item) => (
  isMundaneWeapon(item)
  && ['simple', 'martial'].includes(lc(item.weaponCategory))
  && ['none', ''].includes(lc(item.rarity))
  && !item.bonusVariant
);
const propertyCodes = (item) => new Set(
  (Array.isArray(item?.property) ? item.property : [])
    .map((value) => norm(value).toUpperCase()),
);
const hasAnyProperty = (...codes) => (item) => {
  const properties = propertyCodes(item);
  return codes.some((code) => properties.has(code));
};
const matchesAll = (...predicates) => (item) => predicates.every((predicate) => predicate(item));

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
    id: 'repeating-shot',
    label: 'Repeating Shot',
    pickLabel: 'Pick a weapon with the Ammunition property…',
    requirementLabel: 'Simple or martial weapon with Ammunition; requires attunement.',
    match: matchesAll(isBaseWeapon, hasAnyProperty('A', 'AF')),
    itemPlan: {
      nameSuffix: 'Repeating Shot',
      patch: {
        bonusWeaponAttack: '+1',
        bonusWeaponDamage: '+1',
        reqAttune: true,
        rarity: 'uncommon',
      },
      entries: [{
        type: 'entries',
        name: 'Repeating Shot',
        entries: [
          'This weapon grants a +1 bonus to attack and damage rolls made with it.',
          'It ignores the Loading property. If it has no ammunition loaded when you make a ranged attack with it, the weapon produces one piece of ammunition, which vanishes after the attack.',
        ],
      }],
    },
  },
  {
    id: 'returning-weapon',
    label: 'Returning Weapon',
    pickLabel: 'Pick a weapon with the Thrown property…',
    requirementLabel: 'Simple or martial weapon with Thrown.',
    match: matchesAll(isBaseWeapon, hasAnyProperty('T')),
    itemPlan: {
      nameSuffix: 'Returning Weapon',
      patch: {
        bonusWeaponAttack: '+1',
        bonusWeaponDamage: '+1',
        rarity: 'uncommon',
      },
      entries: [{
        type: 'entries',
        name: 'Returning Weapon',
        entries: [
          'This weapon grants a +1 bonus to attack and damage rolls made with it.',
          'Immediately after you make a ranged attack with this weapon, it returns to your hand.',
        ],
      }],
    },
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
const BY_ID = new Map(REPLICATE_BUCKETS.map((b) => [b.id, b]));
const CHOICE_PREFIX = 'replicate-choice:v1:';

export const REPLICATE_BUCKET_LABELS = REPLICATE_BUCKETS.map((b) => b.label);

export const REPLICATE_GENERAL_CHOICE_KEY = 'artificer_replicate_magic_item_plans';
export const REPLICATE_ARMORER_CHOICE_KEY = 'armorer_replicate_magic_item_armor_plan';

export function hasImprovedArmorer(character) {
  if (
    String(character?.className || '').toLowerCase() === 'artificer'
    && String(character?.subclassShortName || '').toLowerCase() === 'armorer'
    && primaryClassLevel(character) >= 9
  ) return true;
  return (character?.extraClasses || []).some((entry) => (
    String(entry?.name || '').toLowerCase() === 'artificer'
    && String(entry?.subclassShortName || '').toLowerCase() === 'armorer'
    && Number(entry?.level || 0) >= 9
  ));
}

export function isReplicatePlanChoiceKey(key, character = null) {
  const base = String(key || '').replace(/^mc\d+_/, '');
  if (base === REPLICATE_GENERAL_CHOICE_KEY) return true;
  if (base !== REPLICATE_ARMORER_CHOICE_KEY) return false;
  return character ? hasImprovedArmorer(character) : true;
}

// Gather every plan owned by the active Artificer, including the Armorer's
// additional Armor plan and multiclass-prefixed choice keys.
export function collectReplicatePlanChoices(character) {
  const out = [];
  Object.entries(character?.choices || {}).forEach(([key, raw]) => {
    if (!isReplicatePlanChoiceKey(key, character)) return;
    const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
    values.forEach((value) => {
      const normalized = String(value || '');
      if (normalized && !out.includes(normalized)) out.push(normalized);
    });
  });
  return out;
}

// Resolve a pool entry to its bucket descriptor, or null for a concrete item.
export function replicateBucketFromLabel(label) {
  return BY_LABEL.get(String(label || '').trim()) || null;
}

function itemReference(itemOrName, source = '') {
  if (itemOrName && typeof itemOrName === 'object') {
    return {
      itemName: String(itemOrName.name || ''),
      itemSource: String(itemOrName.source || ''),
    };
  }
  return {
    itemName: String(itemOrName || ''),
    itemSource: String(source || ''),
  };
}

function encodePart(value) {
  return encodeURIComponent(String(value || ''));
}

function decodePart(value) {
  return decodeURIComponent(String(value || ''));
}

// All newly-selected plans carry the concrete item source. This keeps choice
// identity stable when different books contain items with the same name.
export function replicateItemChoiceValue(itemOrName, source = '') {
  const ref = itemReference(itemOrName, source);
  if (!ref.itemName || !ref.itemSource) return '';
  return `${CHOICE_PREFIX}item:${encodePart(ref.itemName)}:${encodePart(ref.itemSource)}`;
}

export function replicateBucketChoiceValue(bucket, itemOrName, source = '') {
  if (!bucket?.itemPlan) return replicateItemChoiceValue(itemOrName, source);
  const ref = itemReference(itemOrName, source);
  if (!ref.itemName || !ref.itemSource) return '';
  return `${CHOICE_PREFIX}plan:${encodePart(bucket.id)}:${encodePart(ref.itemName)}:${encodePart(ref.itemSource)}`;
}

export function parseReplicateChoice(value) {
  const raw = String(value || '');
  if (!raw.startsWith(CHOICE_PREFIX)) return null;
  const parts = raw.slice(CHOICE_PREFIX.length).split(':');
  try {
    if (parts[0] === 'item' && parts.length === 3) {
      const itemName = decodePart(parts[1]);
      const itemSource = decodePart(parts[2]);
      return itemName && itemSource ? {
        kind: 'item',
        itemName,
        itemSource,
        version: 1,
      } : null;
    }
    if (parts[0] === 'plan' && parts.length === 4) {
      const bucket = BY_ID.get(decodePart(parts[1]));
      const itemName = decodePart(parts[2]);
      const itemSource = decodePart(parts[3]);
      return bucket?.itemPlan && itemName && itemSource ? {
        kind: 'plan',
        bucket,
        itemName,
        itemSource,
        version: 1,
      } : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function parseReplicateBucketChoice(value) {
  const parsed = parseReplicateChoice(value);
  return parsed?.kind === 'plan' ? parsed : null;
}

export function replicateChoiceLabel(value) {
  const parsed = parseReplicateChoice(value);
  if (!parsed) return String(value || '');
  if (parsed.kind === 'item') return parsed.itemName;
  return `${parsed.itemName} (${parsed.bucket.itemPlan.nameSuffix || parsed.bucket.label})`;
}

// Apply a plan to a real base item. This derives a transient reference record
// for the builder/sheet; it does not insert synthetic entries into the item DB.
export function applyReplicateItemPlan(item, bucket) {
  if (!item || !bucket?.itemPlan) return item || null;
  const plan = bucket.itemPlan;
  const entries = [
    ...(Array.isArray(item.entries) ? item.entries : []),
    ...(Array.isArray(plan.entries) ? plan.entries : []),
  ];
  return {
    ...item,
    ...(plan.patch || {}),
    displayName: `${item.name} (${plan.nameSuffix || bucket.label})`,
    entries,
  };
}

function findReferencedItem(items, itemName, itemSource) {
  if (!itemName || !itemSource) return null;
  const targetKey = itemIdentityKey(itemName, itemSource);
  return (items || []).find((candidate) => itemIdentityKey(candidate) === targetKey) || null;
}

export function resolveReplicateBucketChoice(value, items) {
  const parsed = parseReplicateBucketChoice(value);
  if (!parsed) return null;
  const item = findReferencedItem(items, parsed.itemName, parsed.itemSource);
  if (!item || !itemMatchesBucket(item, parsed.bucket)) return null;
  return {
    bucket: parsed.bucket,
    baseItem: item,
    item: applyReplicateItemPlan(item, parsed.bucket),
  };
}

export function resolveReplicateChoice(value, items) {
  const parsed = parseReplicateChoice(value);
  if (!parsed) return null;
  if (parsed.kind === 'plan') return resolveReplicateBucketChoice(value, items);
  const item = findReferencedItem(items, parsed.itemName, parsed.itemSource);
  return item ? { bucket: null, baseItem: item, item } : null;
}

// Rebuild a replicated inventory item from its current source-qualified plan.
// This keeps database reconciliation from replacing plan effects with the base
// item's fields.
export function resolveReplicateCraftedItem(item, items) {
  if (
    !Array.isArray(item?.flags)
    || !item.flags.includes('replicated')
    || !item.craftedFrom
  ) return null;
  return resolveReplicateChoice(item.craftedFrom, items)?.item || null;
}

// Whether a DB item satisfies a bucket's filter.
export function itemMatchesBucket(item, bucket) {
  if (!item || typeof bucket?.match !== 'function') return false;
  return bucket.match(item);
}

// Sorted, de-duplicated concrete items a bucket can resolve to. Returning the
// full records lets pickers show the same property/description reference used
// by inventory rows, including generated +N weapon and armor variants.
export function replicateBucketItems(items, bucket, excludeNames) {
  const exclude = new Set(
    [...(excludeNames instanceof Set ? excludeNames : new Set(excludeNames || []))]
      .map((value) => lc(value)),
  );
  const byIdentity = new Map();
  (items || []).forEach((it) => {
    if (!it?.name || !itemMatchesBucket(it, bucket)) return;
    const identity = itemIdentityKey(it);
    if (exclude.has(lc(it.name)) || exclude.has(lc(identity))) return;
    if (!byIdentity.has(identity)) byIdentity.set(identity, it);
  });
  return [...byIdentity.values()].sort(
    (a, b) => a.name.localeCompare(b.name) || String(a.source || '').localeCompare(String(b.source || '')),
  );
}
