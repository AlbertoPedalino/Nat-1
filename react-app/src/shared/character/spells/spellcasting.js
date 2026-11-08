import { adapterRegistry } from '../../../adapters/registry.js';
import { getClassSpellLimits } from './spellProgression.js';
import { classEntities } from '../progression/classLevel.js';
import { combinedSpellSlots, maxSpellLevelFor, normalizeCasterProgression } from './casterProgression.js';

// A character's spellcasting, for the sheet and the builder alike: the casting
// entities (primary class and multiclasses), their spellcasting profile from
// the adapters, the slot table
// (multiclass-combined, plus Pact Magic) and how many spells / which levels a
// character can know or prepare.

export function getSpellLimits(C) {
  const totals = getSpellEntities(C).reduce((sum, entity) => {
    const level = clampLevel(entity.level);
    const profile = getSpellcastingProfile(entity);
    if (!hasSpellcastingProfile(profile)) return sum;
    const { cantrips, spells } = getClassSpellLimits(profile, level);
    return {
      cantrips: addLimit(sum.cantrips, cantrips),
      spells: addLimit(sum.spells, spells),
    };
  }, { cantrips: null, spells: null });
  return totals;
}

export function getSpellSlots(C) {
  return combinedSpellSlots(getSpellEntities(C)
    .map((entity) => ({ entity, profile: getSpellcastingProfile(entity) }))
    .filter(({ profile }) => hasSpellcastingProfile(profile))
    .map(({ entity, profile }) => ({ progression: profile.casterProgression, level: entity.level })));
}

export function getMaxLearnableSpellLevel(C) {
  return getSpellEntities(C).reduce((max, entity) => (
    Math.max(max, maxSpellLevelFor(getSpellcastingProfile(entity).casterProgression, entity.level))
  ), 0);
}

export function canManageSpells(C, limits) {
  if (!C) return false;
  if ((limits.cantrips || 0) > 0 || (limits.spells || 0) > 0) return true;
  if ((C.selectedCantrips || []).length || Object.values(C.selectedSpells || {}).flat().length) return true;
  return getSpellEntities(C).some((entity) => hasSpellcastingProfile(getSpellcastingProfile(entity)));
}

// The casting entities: every class (classEntities) with the class data its
// profile falls back on.
export function getSpellEntities(C) {
  return classEntities(C).map(({ className, subclassShortName, level, entry }) => ({
    className,
    subclassShortName,
    level,
    snapshot: entry?.clsSnapshot || entry?.cls,
  }));
}

export function getSpellcastingProfile(entity) {
  const classCfg = adapterRegistry.getClassRuntimeConfig(entity.className)?.spellcasting || {};
  const subCfg = adapterRegistry.getSubclassRuntimeConfig(entity.className, entity.subclassShortName)?.spellcasting || {};
  return {
    ...classCfg,
    ...subCfg,
    casterProgression: subCfg.casterProgression || classCfg.casterProgression || entity.snapshot?.casterProgression,
    cantripProgression: entity.snapshot?.cantripProgression,
    preparedSpellsProgression: subCfg.preparedSpellsProgression || classCfg.preparedSpellsProgression || entity.snapshot?.preparedSpellsProgression,
    alwaysKnownSpells: [
      ...(classCfg.alwaysKnownSpells || []),
      ...(subCfg.alwaysKnownSpells || []),
    ],
    alwaysPreparedSpells: [
      ...(classCfg.alwaysPreparedSpells || []),
      ...(subCfg.alwaysPreparedSpells || []),
    ],
  };
}

export function hasSpellcastingProfile(profile) {
  return Boolean(
    normalizeCasterProgression(profile?.casterProgression)
    || profile?.cantripKnown
    || profile?.cantripProgression
    || profile?.spellsKnown
    || profile?.preparedSpellsProgression
    || profile?.alwaysKnownSpells?.length
    || profile?.alwaysPreparedSpells?.length
  );
}

function addLimit(a, b) {
  if (b == null) return a;
  return Number(a || 0) + Number(b || 0);
}

function clampLevel(level) {
  return Math.max(1, Math.min(20, Number(level || 1)));
}

export function getMaxLearnableSpellLevelForEntity(entity) {
  return maxSpellLevelFor(getSpellcastingProfile(entity).casterProgression, entity?.level);
}
