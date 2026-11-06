import {
  isAllowedSource,
  isSupportedEdition,
  ITEM_SOURCE_PRIORITY,
} from '../../content/sourcePriority.js';
import { itemHasProperty } from '../inventory/weaponProperties.js';
import { compareText, flattenList } from '../../lists.js';
import { matchKey, stripSource } from '../../content/nameKeys.js';
import { loadGameData } from '../../content/gameData.js';
import { titleCase } from '../../ui/textCase.js';

const _masteries = new Map();
let _masteryLoadPromise = null;

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
  const primary = flattenList(items).filter((item) => item && typeof item === 'object');
  const fallback = flattenList(fallbackItems).filter((item) => item && typeof item === 'object');
  const itemDb = primary.length ? primary : fallback;
  const activeRules = Array.isArray(rules) && rules.length ? rules : ALL_WEAPON_MASTERY_RULES;
  const names = itemDb
    .filter(isSupportedMasteryItem)
    .filter(isMundaneWeapon)
    .filter((item) => activeRules.some((rule) => weaponMatchesRule(item, rule)))
    .map((item) => String(item.name).trim())
    .filter(Boolean);
  return [...new Set(names)].sort(compareText);
}

export function getWeaponMasteryChoiceCount(className, level) {
  const progression = WEAPON_MASTERY_PROGRESSIONS[matchKey(className)] || [];
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
      const data = await loadGameData('items-base.json');
      (data?.itemMastery || []).forEach((entry) => {
        if (!entry?.name || !Array.isArray(entry.entries)) return;
        _masteries.set(matchKey(entry.name), { name: entry.name, entries: entry.entries });
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
  // Mastery values may carry a source suffix ("Graze|XPHB"); matchKey would
  // fold that into "grazexphb" and miss the record, so strip the source first.
  const name = stripSource(value);
  return _masteries.get(matchKey(name)) || null;
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

function canonicalMasteryName(value) {
  return getMasteryRecord(value)?.name || null;
}

function normalizeExplicitMasteryName(value) {
  const raw = stripSource(cleanTagText(value));
  if (!raw) return null;
  return canonicalMasteryName(raw) || titleCase(String(raw || '').toLowerCase());
}

function getExplicitItemMastery(item) {
  const direct = item?.mastery ?? item?.weaponMastery ?? item?.masteryProperty ?? item?.masteryName;
  return flattenList(direct)
    .map(normalizeExplicitMasteryName)
    .find(Boolean) || null;
}

function itemMasteryFromProperties(item) {
  const properties = [...flattenList(item?.property), ...flattenList(item?.properties)].map((prop) => String(prop).trim());
  for (const prop of properties) {
    const canonical = canonicalMasteryName(prop);
    if (canonical) return canonical;
  }
  return null;
}

function itemMasteryFromEntries(item) {
  const entriesText = flattenList(item?.entries).join(' ').toLowerCase();
  if (!entriesText) return null;
  for (const record of _masteries.values()) {
    if (entriesText.includes(record.name.toLowerCase())) return record.name;
  }
  return null;
}

export function normalizeWeaponName(value) {
  const { name } = splitNameAndSource(typeof value === 'object' ? (value?.name ?? value?.label ?? value?.value ?? '') : value);
  if (!name) return '';
  return titleCase(name.replace(/,\s*\+\d+$/i, '').replace(/\s*\+\d+$/i, '').trim().toLowerCase());
}

export function collectWeaponMasteryChoiceEntries(character) {
  const choices = character?.choices && typeof character.choices === 'object' ? character.choices : {};
  const out = [];

  Object.entries(choices).forEach(([key, rawValue]) => {
    const keyNorm = matchKey(key);
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
    const dedupeKey = `${matchKey(entry.key)}|${matchKey(entry.weaponName)}|${matchKey(entry.source)}`;
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
  const targetName = matchKey(normalizeWeaponName(weaponName));
  const targetSource = matchKey(source);
  if (!targetName) return null;

  const weaponItems = flattenList(items).filter((item) => item && typeof item === 'object');
  const matchingItems = weaponItems.filter((item) => {
    if (supportedOnly && !isSupportedMasteryItem(item)) return false;
    const itemName = matchKey(normalizeWeaponName(item.name));
    return itemName === targetName;
  });
  if (!matchingItems.length) return null;

  if (targetSource) {
    const sourceMatch = matchingItems.find((item) => matchKey(item.source) === targetSource);
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
    const dedupeKey = matchKey(entry.weaponName);
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    out.push({
      key: entry.key,
      weaponName: entry.weaponName,
      source: entry.source || '',
      mastery: mastery || null,
    });
  });

  return out.sort((a, b) => compareText(a.weaponName, b.weaponName));
}
