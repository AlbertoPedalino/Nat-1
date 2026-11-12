import { normalizeSpellRecord } from '../shared/character/spells/spellNormalization.js';
import { isAmmo, isBodyArmor, isMeleeWeapon, isRangedWeapon, isShield, isWeaponItem } from '../shared/character/inventory/itemKinds.js';
import { matchKey, stripSource } from '../shared/content/nameKeys.js';
import { asArray, byName } from '../shared/lists.js';
import { stripMarkup } from '../shared/content/markupText.js';


function runAdapters(record, adapters, label, context) {
  return asArray(adapters).reduce((acc, fn) => {
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
  return asArray(refs).map(parseFeatureRef).filter((ref) => ref?.name);
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
    savingThrowProfs: asArray(raw.proficiency).map((save) => String(save || '').toLowerCase()),
    _featureRefs: normalizeFeatureRefs(raw.classFeatures),
    _meta: {
      ...(raw._meta && typeof raw._meta === 'object' ? raw._meta : {}),
      classKey: `${matchKey(name)}_${matchKey(source)}`,
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
      subclassKey: `${matchKey(className)}_${matchKey(shortName)}_${matchKey(source)}`,
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
      speciesKey: `${matchKey(name)}_${matchKey(source)}`,
      isAdapted: true,
    },
  };
  return runAdapters(species, registry.getGlobalSpeciesAdapters(), 'SpeciesAdapter', context);
}

function featCategoryCodes(rawCategory) {
  const map = { origin: 'O', general: 'G', 'fighting style': 'FS', fightingstyle: 'FS', 'epic boon': 'EB', epicboon: 'EB', druidic: 'D', origins: 'O' };
  const out = [];
  asArray(rawCategory).flat(Infinity).forEach((cat) => {
    const raw = String(cat || '').trim();
    if (!raw) return;
    const value = map[raw.toLowerCase()] || raw;
    if (!out.some((item) => item.toLowerCase() === value.toLowerCase())) out.push(value);
  });
  return out;
}

function cleanTag(value) {
  return stripSource(stripMarkup(value));
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
  return asArray(Object.values(prerequisite).flat()).map(cleanTag).find(Boolean) || '';
}

function normalizeFeatRecord(rawFeat, context = {}) {
  const raw = rawFeat && typeof rawFeat === 'object' ? rawFeat : {};
  const name = String(raw.name || '').trim();
  const source = String(raw.source || context.defaultSource || '').trim();
  const categories = featCategoryCodes(raw.categories || raw.category);
  const prerequisite = asArray(raw.prerequisite).filter(Boolean);
  const minLevel = extractNumericLevel(prerequisite);
  return {
    ...raw,
    name: name || 'Unnamed Feat',
    source: source || 'UNKNOWN',
    category: categories[0] || '',
    categories,
    prerequisite,
    prerequisiteText: prerequisite.map(formatPrerequisitePart).filter(Boolean).join(' - '),
    additionalSpells: asArray(raw.additionalSpells),
    skillProficiencies: asArray(raw.skillProficiencies),
    toolProficiencies: asArray(raw.toolProficiencies),
    languageProficiencies: asArray(raw.languageProficiencies),
    skillToolLanguageProficiencies: asArray(raw.skillToolLanguageProficiencies),
    weaponProficiencies: asArray(raw.weaponProficiencies),
    armorProficiencies: asArray(raw.armorProficiencies),
    resist: asArray(raw.resist),
    immune: asArray(raw.immune),
    entries: asArray(raw.entries),
    _meta: {
      ...(raw._meta && typeof raw._meta === 'object' ? raw._meta : {}),
      featKey: `${matchKey(name)}_${matchKey(source)}`,
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
      spellKey: `${matchKey(name)}_${matchKey(raw.source)}`,
      isCantrip: level === 0,
      isAdapted: true,
    },
  });
  return runAdapters(spell, registry.getGlobalSpellAdapters(), 'SpellAdapter', context);
}

function resolveItemType(raw) {
  let type = raw.type ? stripSource(raw.type) : null;
  if (!type || type === 'G' || type === 'OTH') {
    if (raw.weapon) type = 'M';
    else if (raw.ammo) type = 'A';
    else if (raw.armor) type = 'MA';
    else if (raw.shield) type = 'S';
    else type = type || 'OTH';
  }
  return type;
}

// Shared by the catalog loader and the builder. Keep catalog field shapes
// intact here; builder-only presentation normalization happens below.
export function applyItemAdapters(item, registry, context = {}) {
  return runAdapters(item, registry.getGlobalItemAdapters(), 'ItemAdapter', context);
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
    property: asArray(raw.property).map((property) => stripSource(property)),
    dmgType: raw.dmgType ? String(raw.dmgType).toLowerCase() : raw.dmgType || null,
    mastery: raw.mastery ? stripSource(asArray(raw.mastery)[0]) : null,
    weight: Number(raw.weight || 0),
    value: Number(raw.value || 0),
    _meta: {
      ...(raw._meta && typeof raw._meta === 'object' ? raw._meta : {}),
      itemKey: `${matchKey(name)}_${matchKey(source)}`,
      isWeapon: isWeaponItem(raw),
      isMeleeWeapon: isMeleeWeapon(raw),
      isRangedWeapon: isRangedWeapon(raw),
      isArmor: isBodyArmor(raw),
      isShield: isShield(raw),
      isAmmo: isAmmo(raw),
      isMagic: !!(raw.rarity && raw.rarity !== 'none'),
      isVariant: !!raw._variant,
      isAdapted: true,
    },
  };
  return context.itemsAlreadyAdapted ? item : applyItemAdapters(item, registry, context);
}

export function adaptBuilderData(data, registry, context = {}) {
  return {
    ...data,
    classes: asArray(data.classes).map((item) => adaptClassRecord(item, registry, context)).sort(byName),
    subclasses: asArray(data.subclasses).map((item) => adaptSubclassRecord(item, registry, context)),
    species: asArray(data.species).map((item) => adaptSpeciesRecord(item, registry, context)).sort(byName),
    feats: asArray(data.feats).map((item) => adaptFeatRecord(item, registry, context)).sort(byName),
    spells: asArray(data.spells).map((item) => adaptSpellRecord(item, registry, context)).sort((a, b) => (a.level - b.level) || byName(a, b)),
    items: asArray(data.items).map((item) => adaptItemRecord(item, registry, context)).sort(byName),
  };
}
