import { installedRegistry } from '../../../adapters/index.js';
import { FULL_SLOTS, HALF_SLOTS, PACT_SLOTS, THIRD_SLOTS } from '../constants.js';
import { getPrimaryClassLevel } from '../logic/calculations.js';
import { getClassSpellLimits } from '../../../shared/character/spellProgression.js';

export function normClassKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function spellMatchesClass(spell, className, classSpellIndex) {
  const classKey = normClassKey(className);
  if (!classKey) return false;
  
  // 1. Check classSpellIndex first
  const indexed = classSpellIndex?.[classKey];
  if (Array.isArray(indexed) && indexed.includes(String(spell.name || '').toLowerCase())) return true;
  
  if (!spell.classes || typeof spell.classes !== 'object') return false;
  
  // 2. Check fromClassList format: { fromClassList: [{ name: "Cleric" }, ...] }
  const fromClassList = spell.classes.fromClassList || [];
  if (Array.isArray(fromClassList) && fromClassList.some((entry) => normClassKey(entry?.name) === classKey)) return true;
  
  // 3. Check fromSubclass format: { fromSubclass: [{ class: { name: "Cleric" } }, ...] }
  const fromSubclass = spell.classes.fromSubclass || [];
  if (Array.isArray(fromSubclass) && fromSubclass.some((entry) => normClassKey(entry?.class?.name) === classKey)) return true;
  
  // 4. Check classes.class format: { class: { "Cleric": {}, "Wizard": {} } } (5etools multi-source)
  const classObj = spell.classes.class || {};
  if (typeof classObj === 'object') {
    // classObj might have source as key: { "phb": { "Cleric": {}, "Wizard": {} } }
    const allClasses = Object.values(classObj).reduce((acc, obj) => {
      if (typeof obj === 'object') {
        return [...acc, ...Object.keys(obj || {})];
      }
      return acc;
    }, []);
    if (allClasses.some((clsName) => normClassKey(clsName) === classKey)) return true;
    
    // Or might be flat: { "Cleric": {}, "Wizard": {} }
    if (Object.keys(classObj).some((clsName) => normClassKey(clsName) === classKey)) return true;
  }
  
  // 5. Check direct classes array: { classes: ["Cleric", "Wizard"] }
  if (Array.isArray(spell.classes)) {
    if (spell.classes.some((entry) => {
      const entryName = typeof entry === 'string' ? entry : entry?.name || '';
      return normClassKey(entryName) === classKey;
    })) return true;
  }
  
  return false;
}

export function spellMatchesAnyClass(spell, classes, classSpellIndex) {
  // If no classes specified, allow all spells (fallback for backward compatibility)
  // but only in SpellSelectionPanel context where it's safe
  if (!classes?.length) return false;
  return classes.some((className) => spellMatchesClass(spell, className, classSpellIndex));
}

export function getSpellcastingProfile(character) {
  const classProfile = installedRegistry.getClassRuntimeConfig(character.className)?.spellcasting || {};
  const subclassProfile = character.subclassShortName
    ? installedRegistry.getSubclassRuntimeConfig(character.className, character.subclassShortName)?.spellcasting || {}
    : {};
  return {
    ...classProfile,
    ...subclassProfile,
    casterProgression: subclassProfile.casterProgression || classProfile.casterProgression || character.cls?.casterProgression || null,
    alwaysKnownSpells: [
      ...(classProfile.alwaysKnownSpells || []),
      ...(subclassProfile.alwaysKnownSpells || []),
    ],
    alwaysPreparedSpells: [
      ...(classProfile.alwaysPreparedSpells || []),
      ...(subclassProfile.alwaysPreparedSpells || []),
    ],
  };
}

function getClassSpellLevel(character) {
  return Math.max(1, Math.min(20, Number(character.classLevel || getPrimaryClassLevel(character) || character.level || 1)));
}

function getSpellTagName(value) {
  return String(value || '').split('|')[0].trim();
}

function pushSpellTags(text, out) {
  const regex = /\{@spell\s+([^}]+)\}/gi;
  let match = regex.exec(String(text || ''));
  while (match) {
    const name = getSpellTagName(match[1]);
    if (name) out.push(name);
    match = regex.exec(String(text || ''));
  }
}

function getRowMinLevel(row) {
  const first = Array.isArray(row) ? row[0] : row?.row?.[0];
  if (first == null) return null;
  const match = String(first).match(/\d+/);
  const level = match ? Number(match[0]) : null;
  return level && level >= 1 && level <= 20 ? level : null;
}

function collectSpellTags(node, classLevel, out = []) {
  if (!node) return out;
  if (typeof node === 'string') {
    pushSpellTags(node, out);
    return out;
  }
  if (Array.isArray(node)) {
    const rowLevel = getRowMinLevel(node);
    if (rowLevel && rowLevel > classLevel) return out;
    node.forEach((item) => collectSpellTags(item, classLevel, out));
    return out;
  }
  if (typeof node !== 'object') return out;

  if (node.type === 'table' && Array.isArray(node.rows)) {
    node.rows.forEach((row) => collectSpellTags(row, classLevel, out));
    return out;
  }

  ['entries', 'entry', 'items', 'rows', 'row'].forEach((key) => collectSpellTags(node[key], classLevel, out));
  return out;
}

function collectSubclassFeatureSpells(character) {
  const classLevel = getClassSpellLevel(character);
  const subclassShortName = String(character.subclassShortName || '');
  if (!subclassShortName) return [];

  const out = [];
  (character.allSubFeatures || [])
    .filter((feature) => !feature?.isReprinted)
    .filter((feature) => !feature?.subclassShortName || feature.subclassShortName === subclassShortName)
    .filter((feature) => Number(feature?.level || 1) <= classLevel)
    .filter((feature) => /spells?/i.test(String(feature?.name || '')))
    .forEach((feature) => {
      collectSpellTags(feature.entries, classLevel).forEach((name) => {
        out.push({
          name,
          minLevel: Number(feature.level || 1),
          level: null,
          mode: 'prepared',
          source: feature.name || subclassShortName,
          sourceType: 'subclass',
        });
      });
    });
  return out;
}

export function collectAutoGrantedSpells(character, profile = getSpellcastingProfile(character)) {
  const classLevel = getClassSpellLevel(character);
  const out = [
    ...(profile.alwaysKnownSpells || []).map((spell) => ({ spell, mode: 'known' })),
    ...(profile.alwaysPreparedSpells || []).map((spell) => ({ spell, mode: 'prepared' })),
  ]
    .map(({ spell, mode }) => ({
      name: typeof spell === 'string' ? spell : spell?.name,
      minLevel: Number(spell?.minLevel || 1),
      level: spell?.level ?? null,
      mode,
      source: spell?.source || (mode === 'known' ? 'Class' : 'Subclass'),
      sourceType: spell?.sourceType || mode,
    }))
    .filter((spell) => spell.name && classLevel >= spell.minLevel);

  const speciesSpellcasting = installedRegistry.getSpeciesRuntimeConfig(
    character?.speciesName,
    character?.speciesSource,
  )?.spellcasting || {};
  [
    ...(speciesSpellcasting.alwaysKnownSpells || []).map((spell) => ({ spell, mode: 'known' })),
    ...(speciesSpellcasting.alwaysPreparedSpells || []).map((spell) => ({ spell, mode: 'prepared' })),
  ]
    .map(({ spell, mode }) => ({
      name: typeof spell === 'string' ? spell : spell?.name,
      minLevel: Number(spell?.minLevel || 1),
      level: spell?.level ?? null,
      mode,
      source: spell?.source || character?.speciesName || 'Species',
      sourceType: spell?.sourceType || 'species',
      spellcastingAbility: spell?.ability || speciesSpellcasting.ability || null,
    }))
    .filter((spell) => spell.name && Number(character?.level || 1) >= spell.minLevel)
    .forEach((spell) => out.push(spell));

  collectSubclassFeatureSpells(character).forEach((spell) => out.push(spell));

  const seen = new Set();
  return out.filter((spell) => {
    const key = `${String(spell.name || '').toLowerCase()}-${spell.mode || ''}`;
    if (!spell.name || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeCasterProgression(value) {
  const progression = String(value || '').toLowerCase();
  if (progression === '1/3' || progression === 'third') return 'third';
  if (progression === 'half' || progression === 'artificer' || progression === 'full' || progression === 'pact') return progression;
  return null;
}

function slotsForProgression(progression, level) {
  const normalized = normalizeCasterProgression(progression);
  if (normalized === 'full') return FULL_SLOTS[level] || [];
  if (normalized === 'half' || normalized === 'artificer') return HALF_SLOTS[level] || [];
  if (normalized === 'third') return THIRD_SLOTS[level] || [];
  return [];
}

export function getSpellCounts(character) {
  const level = getClassSpellLevel(character);
  const profile = getSpellcastingProfile(character);
  const { cantrips, spells } = getClassSpellLimits(profile, level);
  return { cantrips, spells, profile };
}

export function maxSpellLevel(character) {
  const level = getClassSpellLevel(character);
  const profile = getSpellcastingProfile(character);
  const progression = normalizeCasterProgression(profile.casterProgression);
  if (progression === 'pact') return PACT_SLOTS[level]?.level || 0;
  return slotsForProgression(progression, level).reduce((max, count, index) => (count ? index + 1 : max), 0);
}
