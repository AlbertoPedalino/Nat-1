import {
  isAllowedSource,
  isSupportedEdition,
  ITEM_SOURCE_PRIORITY,
} from './sourcePriority.js';

const MASTERY_DATA_URL = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/items-base.json';

const _masteries = new Map();
let _masteryLoadPromise = null;

function compactKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function asArray(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.flatMap(asArray);
  if (value instanceof Set) return Array.from(value).flatMap(asArray);
  return [value];
}

function isMundaneWeapon(item) {
  if (!item || typeof item !== 'object' || !item.name) return false;
  const type = String(item.type || '').toLowerCase();
  const isWeapon = type === 'm'
    || type === 'r'
    || type === 'weapon'
    || item?._meta?.isWeapon === true;
  const rarity = String(item.rarity || 'none').toLowerCase();
  return isWeapon && rarity === 'none';
}

function isSupportedMasteryItem(item) {
  return isAllowedSource(item?.source, ITEM_SOURCE_PRIORITY) && isSupportedEdition(item);
}

const ALL_WEAPON_MASTERY_RULES = Object.freeze([
  Object.freeze({}),
]);

export const WEAPON_MASTERY_RULES = Object.freeze({
  barbarian: Object.freeze([
    Object.freeze({ melee: true }),
  ]),
  fighter: ALL_WEAPON_MASTERY_RULES,
  paladin: ALL_WEAPON_MASTERY_RULES,
  ranger: ALL_WEAPON_MASTERY_RULES,
  rogue: Object.freeze([
    Object.freeze({ category: 'simple' }),
    Object.freeze({ category: 'martial', propertiesAny: Object.freeze(['F', 'L']) }),
  ]),
});

const WEAPON_MASTERY_PROGRESSIONS = Object.freeze({
  barbarian: Object.freeze([
    Object.freeze({ level: 1, count: 2 }),
    Object.freeze({ level: 4, count: 3 }),
    Object.freeze({ level: 10, count: 4 }),
  ]),
  fighter: Object.freeze([
    Object.freeze({ level: 1, count: 3 }),
    Object.freeze({ level: 4, count: 4 }),
    Object.freeze({ level: 10, count: 5 }),
    Object.freeze({ level: 16, count: 6 }),
  ]),
  paladin: Object.freeze([
    Object.freeze({ level: 1, count: 2 }),
  ]),
  ranger: Object.freeze([
    Object.freeze({ level: 1, count: 2 }),
  ]),
  rogue: Object.freeze([
    Object.freeze({ level: 1, count: 2 }),
  ]),
});

function canonicalWeaponProperty(value) {
  const key = compactKey(value);
  if (key === 'finesse') return 'f';
  if (key === 'light') return 'l';
  return key;
}

function itemHasProperty(item, property) {
  const target = canonicalWeaponProperty(property);
  return [...asArray(item?.property), ...asArray(item?.properties)]
    .some((value) => {
      const itemProperty = typeof value === 'object'
        ? (value?.name ?? value?.abbreviation ?? value?.id)
        : value;
      return canonicalWeaponProperty(itemProperty) === target;
    });
}

function weaponMatchesRule(item, rule) {
  if (rule?.melee === true) {
    const type = String(item?.type || '').toLowerCase();
    if (type !== 'm' && item?._meta?.isMeleeWeapon !== true) return false;
  }

  if (rule?.category) {
    const category = String(item?.weaponCategory || item?.category || '').toLowerCase();
    if (category !== String(rule.category).toLowerCase()) return false;
  }

  if (Array.isArray(rule?.propertiesAny) && rule.propertiesAny.length > 0) {
    if (!rule.propertiesAny.some((property) => itemHasProperty(item, property))) return false;
  }

  return true;
}

export function getWeaponMasteryChoiceNames(items, fallbackItems = [], rules = ALL_WEAPON_MASTERY_RULES) {
  const primary = asArray(items).filter((item) => item && typeof item === 'object');
  const fallback = asArray(fallbackItems).filter((item) => item && typeof item === 'object');
  const itemDb = primary.length ? primary : fallback;
  const activeRules = Array.isArray(rules) && rules.length ? rules : ALL_WEAPON_MASTERY_RULES;
  const names = itemDb
    .filter(isSupportedMasteryItem)
    .filter(isMundaneWeapon)
    .filter((item) => activeRules.some((rule) => weaponMatchesRule(item, rule)))
    .map((item) => String(item.name).trim())
    .filter(Boolean);
  return [...new Set(names)].sort((a, b) => a.localeCompare(b));
}

export function getWeaponMasteryChoiceCount(className, level) {
  const progression = WEAPON_MASTERY_PROGRESSIONS[compactKey(className)] || [];
  const currentLevel = Number(level) || 0;
  return progression.reduce(
    (count, step) => currentLevel >= step.level ? step.count : count,
    0,
  );
}

function cleanTagText(value) {
  return String(value || '')
    .replace(/\{@[a-z]+ ([^|}]+)(?:\|[^}]*)?\}/gi, '$1')
    .replace(/[{}]/g, '')
    .trim();
}

function splitNameAndSource(value) {
  const raw = cleanTagText(value);
  if (!raw) return { name: '', source: '' };
  const [namePart, sourcePart] = raw.split('|');
  return {
    name: String(namePart || '').trim(),
    source: String(sourcePart || '').trim(),
  };
}

function toTitleCase(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

function parseChoiceValue(value) {
  if (value == null) return [];
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return [splitNameAndSource(value)];
  }
  if (Array.isArray(value)) return value.flatMap(parseChoiceValue);
  if (typeof value === 'object') {
    const candidate = value.name ?? value.label ?? value.value ?? value.key ?? value.id ?? '';
    const parsed = splitNameAndSource(candidate);
    if (!parsed.name) {
      return Object.values(value).flatMap(parseChoiceValue);
    }
    return [parsed];
  }
  return [];
}

export async function loadMasteryEntries() {
  if (_masteries.size > 0) return _masteries;
  if (_masteryLoadPromise) return _masteryLoadPromise;
  _masteryLoadPromise = (async () => {
    try {
      const response = await fetch(MASTERY_DATA_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      (data?.itemMastery || []).forEach((entry) => {
        if (!entry?.name || !Array.isArray(entry.entries)) return;
        _masteries.set(compactKey(entry.name), { name: entry.name, entries: entry.entries });
      });
    } catch {
      _masteryLoadPromise = null;
    }
    return _masteries;
  })();
  return _masteryLoadPromise;
}

function getMasteryRecord(value) {
  if (!value) return null;
  // Mastery values may carry a source suffix ("Graze|XPHB"); compactKey would
  // fold that into "grazexphb" and miss the record, so strip the source first.
  const name = String(value).split('|')[0];
  return _masteries.get(compactKey(name)) || null;
}

export function areMasteriesLoaded() {
  return _masteries.size > 0;
}

export function getWeaponMasteryEntries(mastery) {
  return getMasteryRecord(mastery)?.entries || null;
}

export function getWeaponMasteryName(mastery) {
  return getMasteryRecord(mastery)?.name || null;
}

export function getWeaponMasteryReminderText(mastery) {
  const entries = getWeaponMasteryEntries(mastery);
  if (!entries?.length) return '';
  const first = entries.find((node) => typeof node === 'string');
  return first || '';
}

function canonicalMasteryName(value) {
  return getMasteryRecord(value)?.name || null;
}

function normalizeExplicitMasteryName(value) {
  const raw = cleanTagText(value).split('|')[0].trim();
  if (!raw) return null;
  return canonicalMasteryName(raw) || toTitleCase(raw);
}

function getExplicitItemMastery(item) {
  const direct = item?.mastery ?? item?.weaponMastery ?? item?.masteryProperty ?? item?.masteryName;
  return asArray(direct)
    .map(normalizeExplicitMasteryName)
    .find(Boolean) || null;
}

function itemMasteryFromProperties(item) {
  const properties = [...asArray(item?.property), ...asArray(item?.properties)].map((prop) => String(prop).trim());
  for (const prop of properties) {
    const canonical = canonicalMasteryName(prop);
    if (canonical) return canonical;
  }
  return null;
}

function itemMasteryFromEntries(item) {
  const entriesText = asArray(item?.entries).join(' ').toLowerCase();
  if (!entriesText) return null;
  for (const record of _masteries.values()) {
    if (entriesText.includes(record.name.toLowerCase())) return record.name;
  }
  return null;
}

export function normalizeWeaponName(value) {
  const { name } = splitNameAndSource(typeof value === 'object' ? (value?.name ?? value?.label ?? value?.value ?? '') : value);
  if (!name) return '';
  return toTitleCase(name.replace(/,\s*\+\d+$/i, '').replace(/\s*\+\d+$/i, '').trim());
}

export function collectWeaponMasteryChoiceEntries(character) {
  const choices = character?.choices && typeof character.choices === 'object' ? character.choices : {};
  const out = [];

  Object.entries(choices).forEach(([key, rawValue]) => {
    const keyNorm = compactKey(key);
    if (!(keyNorm.includes('weapon') && keyNorm.includes('mastery'))) return;
    parseChoiceValue(rawValue).forEach((parsed) => {
      const normalizedName = normalizeWeaponName(parsed.name);
      if (!normalizedName) return;
      out.push({
        key,
        weaponName: normalizedName,
        source: parsed.source || '',
      });
    });
  });

  const seen = new Set();
  return out.filter((entry) => {
    const dedupeKey = `${compactKey(entry.key)}|${compactKey(entry.weaponName)}|${compactKey(entry.source)}`;
    if (seen.has(dedupeKey)) return false;
    seen.add(dedupeKey);
    return true;
  });
}

export function resolveWeaponMasteryForItem(item) {
  if (!item || typeof item !== 'object') return null;
  return getExplicitItemMastery(item) || itemMasteryFromProperties(item) || itemMasteryFromEntries(item);
}

export function findWeaponItemByName(items, weaponName, source = '', { supportedOnly = false } = {}) {
  const targetName = compactKey(normalizeWeaponName(weaponName));
  const targetSource = compactKey(source);
  if (!targetName) return null;

  const weaponItems = asArray(items).filter((item) => item && typeof item === 'object');
  const matchingItems = weaponItems.filter((item) => {
    if (supportedOnly && !isSupportedMasteryItem(item)) return false;
    const itemName = compactKey(normalizeWeaponName(item.name));
    return itemName === targetName;
  });
  if (!matchingItems.length) return null;

  if (targetSource) {
    const sourceMatch = matchingItems.find((item) => compactKey(item.source) === targetSource);
    if (sourceMatch) return sourceMatch;
  }

  return matchingItems[0];
}

export function collectResolvedWeaponMasteries(character, items = []) {
  const entries = collectWeaponMasteryChoiceEntries(character);
  const out = [];
  const seen = new Set();

  entries.forEach((entry) => {
    const item = findWeaponItemByName(items, entry.weaponName, entry.source, { supportedOnly: true });
    if (!item) return;
    const mastery = resolveWeaponMasteryForItem(item);
    const dedupeKey = compactKey(entry.weaponName);
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    out.push({
      key: entry.key,
      weaponName: entry.weaponName,
      source: entry.source || '',
      mastery: mastery || null,
    });
  });

  return out.sort((a, b) => a.weaponName.localeCompare(b.weaponName));
}
