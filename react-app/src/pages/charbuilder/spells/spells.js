import { getSpellcastingProfile } from '../../../shared/character/spells/spellcasting.js';
import { getClassSpellLimits } from '../../../shared/character/spells/spellProgression.js';
import {
  enumerateAutoGrantedSpells, enumerateEntityGrants, enumerateSpeciesGrants, grantSourceLabel,
} from '../../../shared/character/spells/autoGrantedSpells.js';
import { maxSpellLevelFor } from '../../../shared/character/spells/casterProgression.js';
import { primaryClassLevel } from '../../../shared/character/progression/classLevel.js';
import { clamp } from '../../../shared/numbers.js';

// The spellcasting profile of the class being edited (shared spellcasting.js).
function builderSpellcastingProfile(character) {
  return getSpellcastingProfile({
    className: character.className,
    subclassShortName: character.subclassShortName,
    snapshot: character.cls || character.clsSnapshot,
  });
}

function getClassSpellLevel(character) {
  return clamp(primaryClassLevel(character), 1, 20);
}

// A grant record as the builder lists it: name, levels, mode, and its source
// label and type.
function builderGrant(record, character) {
  if (record.origin === 'species') {
    return {
      name: record.name,
      minLevel: record.minLevel,
      level: record.level,
      mode: record.mode,
      source: grantSourceLabel(record, character?.speciesName || 'Species'),
      sourceType: record.sourceType || 'species',
      spellcastingAbility: record.ability,
    };
  }
  return {
    name: record.name,
    minLevel: record.minLevel,
    level: record.level,
    mode: record.mode,
    source: grantSourceLabel(record, 'Class'),
    sourceType: record.sourceType || (record.subclassShortName ? 'subclass' : 'class'),
  };
}

function uniqueBy(list, keyOf) {
  const seen = new Set();
  return list.filter((spell) => {
    const key = keyOf(spell);
    if (!spell.name || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// The spells the builder's spell panel shows as granted for the class being
// edited (its class and subclass) and the species.
export function collectAutoGrantedSpells(character) {
  const entity = {
    className: character?.className,
    subclassShortName: character?.subclassShortName,
    level: getClassSpellLevel(character),
    allSubFeatures: character?.allSubFeatures || [],
    // The class data (subclass records, the skin's spells) the grants read.
    entry: character,
  };
  return uniqueBy(
    [...enumerateEntityGrants(entity, character), ...enumerateSpeciesGrants(character)]
      .map((record) => builderGrant(record, character)),
    (spell) => `${String(spell.name || '').toLowerCase()}-${spell.mode || ''}`,
  );
}

// Every class's and the species' granted spells, as the saved character lists
// them (one per name and source).
export function collectCharacterAutoGrantedSpells(character) {
  return uniqueBy(
    enumerateAutoGrantedSpells(character).map((record) => builderGrant(record, character)),
    (spell) => `${String(spell.name || '').toLowerCase()}-${spell.source || ''}`,
  );
}

export function getSpellCounts(character) {
  const level = getClassSpellLevel(character);
  const profile = builderSpellcastingProfile(character);
  const { cantrips, spells } = getClassSpellLimits(profile, level);
  return { cantrips, spells, profile };
}

export function maxSpellLevel(character) {
  return maxSpellLevelFor(builderSpellcastingProfile(character).casterProgression, getClassSpellLevel(character));
}
