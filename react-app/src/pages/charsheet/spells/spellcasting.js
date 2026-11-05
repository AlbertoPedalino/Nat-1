import { FULL_SLOTS, HALF_SLOTS, PACT_SLOTS, THIRD_SLOTS } from '../../charbuilder/constants.js';
import { adapterRegistry as installedRegistry } from '../../../adapters/registry.js';
import { getClassSpellLimits } from '../../../shared/character/spells/spellProgression.js';
import { primaryClassLevel } from '../../../shared/character/progression/classLevel.js';

// Spellcasting as the sheet sees it: the casting entities (primary class and
// multiclasses), their spellcasting profile from the adapters, the slot table
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

export function getSheetSlots(C) {
  const entities = getSpellEntities(C);
  const casterEntities = entities
    .map((entity) => ({ ...entity, profile: getSpellcastingProfile(entity) }))
    .filter((entity) => hasSpellcastingProfile(entity.profile));
  if (!casterEntities.length) return { regular: [], pact: null };

  const pactEntity = casterEntities.find((entity) => normalizeProgression(entity.profile.casterProgression) === 'pact');
  const pact = pactEntity ? pactSlots(clampLevel(pactEntity.level)) : null;

  const regularEntities = casterEntities.filter((entity) => normalizeProgression(entity.profile.casterProgression) !== 'pact');
  if (!regularEntities.length) return { regular: [], pact };

  if (regularEntities.length === 1) {
    const entity = regularEntities[0];
    const level = clampLevel(entity.level);
    const prog = normalizeProgression(entity.profile.casterProgression);
    if (prog === 'full') return { regular: FULL_SLOTS[level] || [], pact };
    if (prog === 'half') return { regular: HALF_SLOTS[level] || [], pact };
    if (prog === 'third') return { regular: THIRD_SLOTS[level] || [], pact };
    if (prog === 'artificer') return { regular: HALF_SLOTS[level] || [], pact };
  }

  const casterLevel = regularEntities.reduce((sum, entity) => (
    sum + casterContribution(normalizeProgression(entity.profile.casterProgression), clampLevel(entity.level))
  ), 0);
  return { regular: casterLevel > 0 ? FULL_SLOTS[Math.min(20, casterLevel)] || [] : [], pact };
}

function getMaxCastableSpellLevel(slots) {
  const regularMax = (slots?.regular || []).reduce((max, count, index) => (count ? index + 1 : max), 0);
  return Math.max(regularMax, Number(slots?.pact?.level || 0));
}

export function getMaxLearnableSpellLevel(C) {
  return getSpellEntities(C).reduce((max, entity) => {
    const profile = getSpellcastingProfile(entity);
    const level = clampLevel(entity.level);
    const prog = normalizeProgression(profile.casterProgression);
    if (prog === 'pact') return Math.max(max, Number(pactSlots(level).level || 0));
    if (prog === 'full') return Math.max(max, getMaxCastableSpellLevel({ regular: FULL_SLOTS[level] || [] }));
    if (prog === 'half') return Math.max(max, getMaxCastableSpellLevel({ regular: HALF_SLOTS[level] || [] }));
    if (prog === 'third') return Math.max(max, getMaxCastableSpellLevel({ regular: THIRD_SLOTS[level] || [] }));
    if (prog === 'artificer') return Math.max(max, getMaxCastableSpellLevel({ regular: HALF_SLOTS[level] || [] }));
    return max;
  }, 0);
}

export function canManageSpells(C, limits) {
  if (!C) return false;
  if ((limits.cantrips || 0) > 0 || (limits.spells || 0) > 0) return true;
  if ((C.selectedCantrips || []).length || Object.values(C.selectedSpells || {}).flat().length) return true;
  return getSpellEntities(C).some((entity) => hasSpellcastingProfile(getSpellcastingProfile(entity)));
}

export function getSpellEntities(C) {
  if (!C) return [];
  return [
    {
      className: C.className,
      subclassShortName: C.subclassShortName,
      level: primaryClassLevel(C),
      snapshot: C.clsSnapshot,
    },
    ...(C.extraClasses || []).map((extra) => ({
      className: extra.name,
      subclassShortName: extra.subclassShortName,
      level: extra.level || 1,
      snapshot: extra.clsSnapshot || extra.cls,
    })),
  ].filter((entity) => entity.className);
}

export function getSpellcastingProfile(entity) {
  const classCfg = installedRegistry.getClassRuntimeConfig(entity.className)?.spellcasting || {};
  const subCfg = installedRegistry.getSubclassRuntimeConfig(entity.className, entity.subclassShortName)?.spellcasting || {};
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
    normalizeProgression(profile?.casterProgression)
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

function casterContribution(prog, level) {
  if (prog === 'full') return level;
  if (prog === 'half') return Math.floor(level / 2);
  if (prog === 'artificer') return Math.ceil(level / 2);
  if (prog === 'third') return Math.floor(level / 3);
  return 0;
}

function pactSlots(level) {
  const row = PACT_SLOTS[Math.min(level, 20)] || {};
  return { count: row.slots || row.n || 0, level: row.level || row.l || 1 };
}

export function normalizeProgression(value) {
  const v = String(value || '').toLowerCase();
  if (v === '1/2') return 'half';
  if (v === '1/3') return 'third';
  return v;
}

export function getMaxLearnableSpellLevelForEntity(entity) {
  const profile = getSpellcastingProfile(entity);
  const level = clampLevel(entity?.level);
  const prog = normalizeProgression(profile.casterProgression);
  if (prog === 'pact') return Math.max(0, Number(pactSlots(level).level || 0));
  if (prog === 'full') return getMaxCastableSpellLevel({ regular: FULL_SLOTS[level] || [] });
  if (prog === 'half') return getMaxCastableSpellLevel({ regular: HALF_SLOTS[level] || [] });
  if (prog === 'third') return getMaxCastableSpellLevel({ regular: THIRD_SLOTS[level] || [] });
  if (prog === 'artificer') return getMaxCastableSpellLevel({ regular: HALF_SLOTS[level] || [] });
  return 0;
}
