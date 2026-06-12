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
  const direct = item.mastery ?? item.weaponMastery ?? item.masteryProperty ?? item.masteryName;
  if (typeof direct === 'string' && direct.trim()) {
    const canonical = canonicalMasteryName(direct);
    if (canonical) return canonical;
  }
  if (Array.isArray(direct)) {
    const first = direct.map((value) => String(value || '').trim()).find(Boolean);
    const canonical = canonicalMasteryName(first);
    if (canonical) return canonical;
  }
  return itemMasteryFromProperties(item) || itemMasteryFromEntries(item);
}

export function findWeaponItemByName(items, weaponName, source = '') {
  const targetName = compactKey(normalizeWeaponName(weaponName));
  const targetSource = compactKey(source);
  if (!targetName) return null;

  const weaponItems = asArray(items).filter((item) => item && typeof item === 'object');
  const direct = weaponItems.find((item) => {
    const itemName = compactKey(normalizeWeaponName(item.name));
    if (itemName !== targetName) return false;
    if (!targetSource) return true;
    return compactKey(item.source) === targetSource;
  });
  if (direct) return direct;

  return weaponItems.find((item) => compactKey(normalizeWeaponName(item.name)) === targetName) || null;
}

export function collectResolvedWeaponMasteries(character, items = []) {
  const entries = collectWeaponMasteryChoiceEntries(character);
  const out = [];
  const seen = new Set();

  entries.forEach((entry) => {
    const item = findWeaponItemByName(items, entry.weaponName, entry.source);
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
