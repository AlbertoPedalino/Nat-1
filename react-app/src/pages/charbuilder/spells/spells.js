import { adapterRegistry as installedRegistry } from '../../../adapters/registry.js';
import { FULL_SLOTS, HALF_SLOTS, PACT_SLOTS, THIRD_SLOTS } from '../../../shared/character/spells/spellTables.js';
import { getPrimaryClassLevel } from '../progression/calculations.js';
import { getClassSpellLimits } from '../../../shared/character/spells/spellProgression.js';
import { enumerateEntityGrants, enumerateSpeciesGrants, grantSourceLabel } from '../../../shared/character/spells/autoGrantedSpells.js';

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
