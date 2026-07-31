const CANONICAL_DISPLAY_LABELS = {
  light: 'Light',
  medium: 'Medium',
  heavy: 'Heavy',
  shield: 'Shield',
  shields: 'Shield',
  simple: 'Simple',
  martial: 'Martial',
  common: 'Common',
  acid: 'Acid',
  bludgeoning: 'Bludgeoning',
  cold: 'Cold',
  fire: 'Fire',
  force: 'Force',
  lightning: 'Lightning',
  necrotic: 'Necrotic',
  piercing: 'Piercing',
  poison: 'Poison',
  psychic: 'Psychic',
  radiant: 'Radiant',
  slashing: 'Slashing',
  thunder: 'Thunder',
};

const SIMPLE_WEAPONS = new Set([
  'club',
  'dagger',
  'greatclub',
  'handaxe',
  'javelin',
  'lighthammer',
  'mace',
  'quarterstaff',
  'sickle',
  'spear',
  'lightcrossbow',
  'crossbowlight',
  'dart',
  'shortbow',
  'sling',
]);

const MARTIAL_WEAPONS = new Set([
  'battleaxe',
  'flail',
  'glaive',
  'greataxe',
  'greatsword',
  'halberd',
  'lance',
  'longsword',
  'maul',
  'morningstar',
  'pike',
  'rapier',
  'scimitar',
  'shortsword',
  'trident',
  'warpick',
  'warhammer',
  'whip',
  'blowgun',
  'handcrossbow',
  'crossbowhand',
  'heavycrossbow',
  'crossbowheavy',
  'longbow',
  'musket',
  'pistol',
]);

export function cleanProficiencyText(value) {
  return String(value ?? '')
    .replace(/\{@[a-z]+ ([^|}]+)(?:\|[^}]*)?\}/gi, '$1')
    .replace(/[{}]/g, '')
    .replace(/\.$/, '')
    .split('|')[0]
    .replace(/^(skill|tool|language|weapon):\s*/i, '')
    .trim();
}

export function labelKey(value) {
  return cleanProficiencyText(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function titleCase(value) {
  return String(value || '')
    .split(' ')
    .map((word) => word
      .split('-')
      .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part))
      .join('-'))
    .join(' ');
}

export function canonicalDisplayLabel(value) {
  const raw = cleanProficiencyText(value);
  if (!raw) return '';
  return CANONICAL_DISPLAY_LABELS[labelKey(raw)] || titleCase(raw);
}

export function canonicalProficiencyLabel(value) {
  return canonicalDisplayLabel(value);
}

export function canonicalDamageTypeLabel(value) {
  return canonicalDisplayLabel(value);
}

function splitSource(label) {
  const match = String(label || '').match(/^(.*?)\s*(\([^)]*\))\s*$/);
  if (!match) return { base: label, source: '' };
  return { base: match[1].trim(), source: match[2].trim() };
}

function itemNameKey(item) {
  return labelKey(String(item?.name || '').replace(/,\s*\+\d+$/i, '').replace(/\s*\+\d+$/i, ''));
}

function itemWeaponCategory(item) {
  const raw = item?.weaponCategory || item?.weaponType || item?.category || item?._weaponCategory || item?.weaponGroup || '';
  const categoryKey = labelKey(raw);
  if (categoryKey.includes('simple')) return 'simple';
  if (categoryKey.includes('martial')) return 'martial';

  const name = itemNameKey(item);
  if (SIMPLE_WEAPONS.has(name)) return 'simple';
  if (MARTIAL_WEAPONS.has(name)) return 'martial';
  return '';
}

function lookupWeaponCategory(label, allItemsDb) {
  const baseKey = labelKey(splitSource(label).base);
  const item = (allItemsDb || []).find((entry) => itemNameKey(entry) === baseKey);
  if (item) return itemWeaponCategory(item);
  if (SIMPLE_WEAPONS.has(baseKey)) return 'simple';
  if (MARTIAL_WEAPONS.has(baseKey)) return 'martial';
  return '';
}

export function uniqueDisplayLabels(values) {
  const seen = new Set();
  const out = [];
  (values || []).flat().forEach((value) => {
    const label = canonicalDisplayLabel(value);
    const key = label.toLowerCase();
    if (!label || seen.has(key)) return;
    seen.add(key);
    out.push(label);
  });
  return out.sort((a, b) => a.localeCompare(b));
}

export function collapseWeaponProficiencies(items, options = {}) {
  const labels = uniqueDisplayLabels(items);
  const hasSimple = labels.some((item) => labelKey(splitSource(item).base) === 'simple');
  const hasMartial = labels.some((item) => labelKey(splitSource(item).base) === 'martial');
  const out = [];
  const seen = new Set();

  labels.forEach((label) => {
    const { base } = splitSource(label);
    const baseKey = labelKey(base);
    const category = lookupWeaponCategory(label, options.allItemsDb);
    if (hasSimple && category === 'simple' && baseKey !== 'simple') return;
    if (hasMartial && category === 'martial' && baseKey !== 'martial') return;
    if (seen.has(label.toLowerCase())) return;
    seen.add(label.toLowerCase());
    out.push(label);
  });

  return out.sort((a, b) => a.localeCompare(b));
}
