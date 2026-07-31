import { adapterRegistry as installedRegistry } from '../../../adapters/registry.js';
import { FULL_SLOTS, HALF_SLOTS, PACT_SLOTS, THIRD_SLOTS } from '../constants.js';
import { getPrimaryClassLevel } from '../logic/calculations.js';
import { getClassSpellLimits } from '../../../shared/character/spellProgression.js';
import { enumerateEntityGrants, enumerateSpeciesGrants, grantSourceLabel } from '../../../shared/character/autoGrantedSpells.js';

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
  return Math.max(1, Math.min(20, getPrimaryClassLevel(character)));
}

export function collectAutoGrantedSpells(character) {
  const entity = {
    className: character?.className,
    subclassShortName: character?.subclassShortName,
    level: getClassSpellLevel(character),
    allSubFeatures: character?.allSubFeatures || [],
  };
  const out = [
    ...enumerateEntityGrants(entity, character).map((r) => ({
      name: r.name,
      minLevel: r.minLevel,
      level: r.level,
      mode: r.mode,
      source: grantSourceLabel(r, 'Class'),
      sourceType: r.sourceType || (r.subclassShortName ? 'subclass' : 'class'),
    })),
    ...enumerateSpeciesGrants(character).map((r) => ({
      name: r.name,
      minLevel: r.minLevel,
      level: r.level,
      mode: r.mode,
      source: grantSourceLabel(r, character?.speciesName || 'Species'),
      sourceType: r.sourceType || 'species',
      spellcastingAbility: r.ability,
    })),
  ];

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
