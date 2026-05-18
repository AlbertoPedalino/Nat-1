import { normalizeSpellRecord } from '../shared/character/spellNormalization.js';

const SCHOOL_FULL = {
  A: 'Abjuration',
  C: 'Conjuration',
  D: 'Divination',
  E: 'Enchantment',
  V: 'Evocation',
  I: 'Illusion',
  N: 'Necromancy',
  T: 'Transmutation',
};

const WEAPON_TYPES = new Set(['M', 'R']);
const ARMOR_TYPES = new Set(['LA', 'MA', 'HA']);
const AMMO_TYPES = new Set(['A', 'AF', 'AT']);

function arr(value) {
  return Array.isArray(value) ? value : value == null ? [] : [value];
}

function norm(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function runAdapters(record, adapters, label, context) {
  return arr(adapters).reduce((acc, fn) => {
    if (typeof fn !== 'function') return acc;
    try {
      const next = fn(acc, context);
      return next && typeof next === 'object' ? next : acc;
    } catch (error) {
      console.warn(`[${label}] adapter error for`, acc?.name, error);
      return acc;
    }
  }, record && typeof record === 'object' ? { ...record } : record);
}

function parseFeatureRef(ref) {
  if (typeof ref === 'string') {
    const parts = ref.split('|');
    return { name: parts[0] || '', level: Number(parts[3]) || 0 };
  }
  if (ref && typeof ref === 'object') {
    return { name: String(ref.name || ref.classFeature || ''), level: Number(ref.level || 0) };
  }
  return null;
}

function normalizeFeatureRefs(refs) {
  return arr(refs).map(parseFeatureRef).filter((ref) => ref?.name);
}

function hitDieText(hd) {
  if (!hd || typeof hd !== 'object') return '';
  return hd.faces ? `${hd.number ?? 1}d${hd.faces}` : '';
}

export function adaptClassRecord(rawClass, registry, context = {}) {
  const raw = rawClass && typeof rawClass === 'object' ? rawClass : {};
  const name = String(raw.name || '').trim();
  const source = String(raw.source || context.defaultSource || '').trim();
  const cls = {
    ...raw,
    name: name || 'Unknown Class',
    source,
    hdText: hitDieText(raw.hd),
    spellcastingAbility: raw.spellcastingAbility ? String(raw.spellcastingAbility).toLowerCase() : null,
    savingThrowProfs: arr(raw.proficiency).map((save) => String(save || '').toLowerCase()),
    _featureRefs: normalizeFeatureRefs(raw.classFeatures),
    _meta: {
      ...(raw._meta && typeof raw._meta === 'object' ? raw._meta : {}),
      classKey: `${norm(name)}_${norm(source)}`,
      isAdapted: true,
    },
  };
  return runAdapters(cls, registry.getGlobalClassAdapters(), 'ClassAdapter', context);
}

export function adaptSubclassRecord(rawSubclass, registry, context = {}) {
  const raw = rawSubclass && typeof rawSubclass === 'object' ? rawSubclass : {};
  const name = String(raw.name || '').trim();
  const source = String(raw.source || context.defaultSource || '').trim();
  const className = String(raw.className || '').trim();
  const shortName = String(raw.shortName || raw.name || '').trim();
  const subclass = {
    ...raw,
    name: name || 'Unknown Subclass',
    source,
    className,
    shortName,
    _featureRefs: normalizeFeatureRefs(raw.subclassFeatures),
    _meta: {
      ...(raw._meta && typeof raw._meta === 'object' ? raw._meta : {}),
      subclassKey: `${norm(className)}_${norm(shortName)}_${norm(source)}`,
      isAdapted: true,
    },
  };
  return runAdapters(subclass, registry.getGlobalSubclassAdapters(), 'SubclassAdapter', context);
}

export function adaptSpeciesRecord(rawSpecies, registry, context = {}) {
  const raw = rawSpecies && typeof rawSpecies === 'object' ? rawSpecies : {};
  const name = String(raw.name || '').trim();
  const source = String(raw.source || context.defaultSource || '').trim();
  let species = {
    ...raw,
    name: name || 'Unknown Species',
    source,
    size: Array.isArray(raw.size) ? raw.size : raw.size ? [raw.size] : ['M'],
    _meta: {
      ...(raw._meta && typeof raw._meta === 'object' ? raw._meta : {}),
      speciesKey: `${norm(name)}_${norm(source)}`,
      isAdapted: true,
    },
  };
  return runAdapters(species, registry.getGlobalSpeciesAdapters(), 'SpeciesAdapter', context);
}

function featCategoryCodes(rawCategory) {
  const map = { origin: 'O', general: 'G', 'fighting style': 'FS', fightingstyle: 'FS', 'epic boon': 'EB', epicboon: 'EB', druidic: 'D', origins: 'O' };
  const out = [];
  arr(rawCategory).flat(Infinity).forEach((cat) => {
    const raw = String(cat || '').trim();
    if (!raw) return;
    const value = map[raw.toLowerCase()] || raw;
    if (!out.some((item) => item.toLowerCase() === value.toLowerCase())) out.push(value);
  });
  return out;
}

function cleanTag(value) {
  return String(value || '').split('|')[0].replace(/\{@\w+\s+/g, '').replace(/\}/g, '').trim();
}

function extractNumericLevel(node, expectLevelValue = false) {
  if (node == null) return null;
  if (typeof node === 'number' && Number.isFinite(node)) return expectLevelValue ? node : null;
  if (typeof node === 'string') {
    const match = node.match(/\blevel\s*(\d+)\b/i);
    if (match) return Number(match[1]);
    const parsed = Number(node);
    return expectLevelValue && Number.isFinite(parsed) ? parsed : null;
  }
  if (Array.isArray(node)) {
    const values = node.map((item) => extractNumericLevel(item, expectLevelValue)).filter(Number.isFinite);
    return values.length ? Math.min(...values) : null;
  }
  if (typeof node === 'object') {
    const values = [];
    if (node.level != null) {
      const level = extractNumericLevel(node.level, true);
      if (Number.isFinite(level)) values.push(level);
    }
    Object.entries(node).forEach(([key, value]) => {
      if (key.toLowerCase() === 'level') return;
      const level = extractNumericLevel(value, /\blevel\b/i.test(key));
      if (Number.isFinite(level)) values.push(level);
    });
    return values.length ? Math.min(...values) : null;
  }
  return null;
}

function formatPrerequisitePart(prerequisite) {
  if (!prerequisite) return '';
  if (typeof prerequisite === 'string') return cleanTag(prerequisite);
  if (prerequisite.level != null) {
    const level = extractNumericLevel(prerequisite.level, true);
    if (Number.isFinite(level)) return `Lv.${level}`;
  }
  if (Array.isArray(prerequisite.ability)) {
    const labels = prerequisite.ability.flatMap((ability) => Object.entries(ability || {}).map(([key, value]) => `${key.toUpperCase()} ${value}`));
    if (labels.length) return labels.join(', ');
  }
  if (prerequisite.spellcasting) return 'Spellcasting';
  if (prerequisite.proficiency) return 'Proficiency';
  if (prerequisite.feat) return 'Feat';
  if (prerequisite.pact) return 'Pact';
  if (prerequisite.class) return 'Class';
  if (prerequisite.background) return 'Background';
  if (prerequisite.species) return 'Species';
  return arr(Object.values(prerequisite).flat()).map(cleanTag).find(Boolean) || '';
}

function normalizeFeatRecord(rawFeat, context = {}) {
  const raw = rawFeat && typeof rawFeat === 'object' ? rawFeat : {};
  const name = String(raw.name || '').trim();
  const source = String(raw.source || context.defaultSource || '').trim();
  const categories = featCategoryCodes(raw.categories || raw.category);
  const prerequisite = arr(raw.prerequisite).filter(Boolean);
  const minLevel = extractNumericLevel(prerequisite);
  return {
    ...raw,
    name: name || 'Unnamed Feat',
    source: source || 'UNKNOWN',
    category: categories[0] || '',
    categories,
    prerequisite,
    prerequisiteText: prerequisite.map(formatPrerequisitePart).filter(Boolean).join(' - '),
    additionalSpells: arr(raw.additionalSpells),
    skillProficiencies: arr(raw.skillProficiencies),
    toolProficiencies: arr(raw.toolProficiencies),
    languageProficiencies: arr(raw.languageProficiencies),
    skillToolLanguageProficiencies: arr(raw.skillToolLanguageProficiencies),
    weaponProficiencies: arr(raw.weaponProficiencies),
    armorProficiencies: arr(raw.armorProficiencies),
    resist: arr(raw.resist),
    immune: arr(raw.immune),
    entries: arr(raw.entries),
    _meta: {
      ...(raw._meta && typeof raw._meta === 'object' ? raw._meta : {}),
      featKey: `${norm(name)}_${norm(source)}`,
      minLevel: Number.isFinite(minLevel) ? minLevel : null,
      categoryCodes: categories,
      isFeatAdapted: true,
    },
  };
}

export function adaptFeatRecord(rawFeat, registry, context = {}) {
  let feat = runAdapters(normalizeFeatRecord(rawFeat, context), registry.getGlobalFeatAdapters(), 'FeatAdapter', context);
  const custom = registry.getFeatAdapter(feat.name);
  if (typeof custom === 'function') {
    try {
      const next = custom({ ...feat }, context);
      feat = normalizeFeatRecord(next && typeof next === 'object' ? next : feat, context);
    } catch (error) {
      console.warn('[FeatAdapter] adapter error for', feat.name, feat.source, error);
    }
  }
  return runAdapters(feat, registry.getGlobalFeatAdapters(), 'FeatAdapter', context);
}

function normalizeRange(range) {
  if (!range || typeof range !== 'object') return 'varies';
  const type = String(range.type || '').toLowerCase();
  if (type === 'self') return 'Self';
  if (type === 'touch') return 'Touch';
  if (type === 'sight') return 'Sight';
  if (type === 'unlimited') return 'Unlimited';
  if (type === 'special') return 'Special';
  if (!range.distance) return 'varies';
  const amount = range.distance.amount ?? '';
  const unit = String(range.distance.type || '').replace(/feet|foot/i, 'ft').replace(/miles?/i, 'mi');
  return amount !== '' ? `${amount} ${unit}`.trim() : unit || 'varies';
}

function castingTime(time) {
  const first = arr(time)[0];
  if (!first || typeof first !== 'object') return '';
  const number = first.number ?? 1;
  const unit = String(first.unit || '').toLowerCase();
  if (number === 1 && unit === 'action') return '1 Action';
  if (number === 1 && unit === 'bonus') return '1 Bonus Action';
  if (number === 1 && unit === 'reaction') return '1 Reaction';
  if (unit === 'minute') return `${number} Minute${number !== 1 ? 's' : ''}`;
  if (unit === 'hour') return `${number} Hour${number !== 1 ? 's' : ''}`;
  return `${number} ${unit}`.trim();
}

function durationText(duration) {
  const first = arr(duration)[0];
  if (!first || typeof first !== 'object') return '';
  const type = String(first.type || '').toLowerCase();
  if (type === 'instant') return 'Instantaneous';
  if (type === 'permanent') return 'Until dispelled';
  if (type === 'special') return 'Special';
  if (!first.duration) return type;
  const amount = first.duration.amount ?? '';
  const unit = String(first.duration.type || '');
  const concentration = first.concentration ? ' (C)' : '';
  return amount !== '' ? `${amount} ${unit}${concentration}` : `${unit}${concentration}`;
}

export function adaptSpellRecord(rawSpell, registry, context = {}) {
  const raw = rawSpell && typeof rawSpell === 'object' ? rawSpell : {};
  const name = String(raw.name || '').trim();
  const level = typeof raw.level === 'number' ? raw.level : 0;
  const adapterData = level === 0 ? registry.getCantripData(name) : registry.getSpellData(name);
  const spell = normalizeSpellRecord({
    ...raw,
    name: name || 'Unknown Spell',
    source: String(raw.source || context.defaultSource || '').trim(),
    level,
    isCantrip: level === 0,
    ...(adapterData && typeof adapterData === 'object' ? { _adapterData: adapterData } : {}),
    _meta: {
      ...(raw._meta && typeof raw._meta === 'object' ? raw._meta : {}),
      spellKey: `${norm(name)}_${norm(raw.source)}`,
      isCantrip: level === 0,
      isAdapted: true,
    },
  });
  return runAdapters(spell, registry.getGlobalSpellAdapters(), 'SpellAdapter', context);
}

function resolveItemType(raw) {
  let type = raw.type ? String(raw.type).split('|')[0] : null;
  if (!type || type === 'G' || type === 'OTH') {
    if (raw.weapon) type = 'M';
    else if (raw.ammo) type = 'A';
    else if (raw.armor) type = 'MA';
    else if (raw.shield) type = 'S';
    else type = type || 'OTH';
  }
  return type;
}

export function adaptItemRecord(rawItem, registry, context = {}) {
  const raw = rawItem && typeof rawItem === 'object' ? rawItem : {};
  const name = String(raw.name || '').trim();
  const source = String(raw.source || context.defaultSource || '').trim();
  const type = resolveItemType(raw);
  const item = {
    ...raw,
    name: name || 'Unknown Item',
    source,
    type,
    property: arr(raw.property).map((property) => String(property).split('|')[0]),
    dmgType: raw.dmgType ? String(raw.dmgType).toLowerCase() : raw.dmgType || null,
    mastery: raw.mastery ? String(arr(raw.mastery)[0] || '').split('|')[0].trim() : null,
    weight: Number(raw.weight || 0),
    value: Number(raw.value || 0),
    _meta: {
      ...(raw._meta && typeof raw._meta === 'object' ? raw._meta : {}),
      itemKey: `${norm(name)}_${norm(source)}`,
      isWeapon: WEAPON_TYPES.has(type),
      isMeleeWeapon: type === 'M',
      isRangedWeapon: type === 'R',
      isArmor: ARMOR_TYPES.has(type),
      isShield: type === 'S',
      isAmmo: AMMO_TYPES.has(type),
      isMagic: !!(raw.rarity && raw.rarity !== 'none'),
      isVariant: !!raw._variant,
      isAdapted: true,
    },
  };
  return runAdapters(item, registry.getGlobalItemAdapters(), 'ItemAdapter', context);
}

export function adaptBuilderData(data, registry, context = {}) {
  return {
    ...data,
    classes: arr(data.classes).map((item) => adaptClassRecord(item, registry, context)).sort((a, b) => a.name.localeCompare(b.name)),
    subclasses: arr(data.subclasses).map((item) => adaptSubclassRecord(item, registry, context)),
    species: arr(data.species).map((item) => adaptSpeciesRecord(item, registry, context)).sort((a, b) => a.name.localeCompare(b.name)),
    feats: arr(data.feats).map((item) => adaptFeatRecord(item, registry, context)).sort((a, b) => a.name.localeCompare(b.name)),
    spells: arr(data.spells).map((item) => adaptSpellRecord(item, registry, context)).sort((a, b) => (a.level - b.level) || a.name.localeCompare(b.name)),
    items: arr(data.items).map((item) => adaptItemRecord(item, registry, context)).sort((a, b) => a.name.localeCompare(b.name)),
  };
}
