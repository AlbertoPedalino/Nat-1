import { adapterRegistry } from '../../../adapters/registry.js';
import { getFinal as getFinalScore, getMod as getAbilityMod } from '../../../shared/character/sheet/sheetStats.js';
import { primaryClassLevel } from '../../../shared/character/progression/classLevel.js';
import { withModifier } from '../../../shared/ui/numberFormat.js';
import { matchKey } from '../../../shared/content/nameKeys.js';
import { ABILITIES, SPELL_SCHOOL_NAMES } from '../../../shared/content/rulesVocabulary.js';

// What the character's features change on a spell row, registered by the
// adapters: riders (extra rollers, tags, text), spell modifiers (flat damage or
// healing bonuses, by owner / school / spell), and cantrip data overrides.

/**
 * Spell riders — conditional, character-driven extras attached to a spell row
 * that aren't part of the spell's own data: an extra roller button, a coloured
 * tag, and a description block (e.g. Stars Druid Chalice extra healing).
 *
 * Riders are registered by adapters (class/subclass/species/feat) as factories
 * `(ctx) => rider | null`, so the feature logic lives in the adapter layer and
 * adding a new rider never touches this collector or `SpellEntry`. The ctx
 * carries the character, the spell-shape flags, and the granting entity's level.
 *
 * @param {object} C    character
 * @param {object} opts { hasHeal, hasDamage, entry } spell-shape context
 * @returns {Array<{ id, tag?: {label,color}, rollers?: Array, modifierDetails?: Array }>}
 */
export function collectSpellRiders(C, { hasHeal = false, hasDamage = false, entry = null } = {}) {
  if (!C) return [];
  const out = [];
  const seen = new Set();

  const run = (factories, ctx) => {
    (factories || []).forEach((factory) => {
      if (typeof factory !== 'function') return;
      let rider = null;
      try { rider = factory(ctx); } catch { rider = null; }
      if (!rider || !rider.id || seen.has(rider.id)) return;
      seen.add(rider.id);
      out.push(rider);
    });
  };

  spellModifierEntities(C).forEach((entity) => {
    const ctx = {
      character: C,
      hasHeal,
      hasDamage,
      entry,
      ownerLevel: entity.level,
      ownerClassName: entity.className,
      ownerSubclassShortName: entity.subclassShortName,
    };
    run(adapterRegistry.getClassSpellRiders(entity.className), ctx);
    if (entity.subclassShortName) {
      run(adapterRegistry.getSubclassSpellRiders(entity.className, entity.subclassShortName), ctx);
    }
  });

  const baseCtx = { character: C, hasHeal, hasDamage, entry, ownerLevel: Number(C?.level || 1) };
  run(adapterRegistry.getSpeciesSpellRiders(C?.speciesName, C?.speciesSource), baseCtx);
  (C?.allFeatSnapshots || []).forEach((feat) => {
    if (feat?.name) run(adapterRegistry.getFeatSpellRiders(feat.name), baseCtx);
  });

  return out;
}

export function getResolvedCantripData(C, name) {
  if (!name) return null;
  const base = typeof adapterRegistry.getCantripData === 'function'
    ? adapterRegistry.getCantripData(name)
    : null;
  const modifiers = typeof adapterRegistry.getCantripDataModifiers === 'function'
    ? (adapterRegistry.getCantripDataModifiers(name) || [])
    : [];
  if (!base && !modifiers.length) return null;
  return modifiers.reduce((data, fn) => {
    if (typeof fn !== 'function') return data;
    try { return fn(data, C) || data; } catch { return data; }
  }, base ? { ...base } : {});
}

export function resolveDmgBonusValue(C, dmgBonus, getModFn, getFinalFn) {
  if (dmgBonus == null || dmgBonus === '' || dmgBonus === 0) return 0;
  if (typeof dmgBonus === 'number') return dmgBonus;
  if (typeof dmgBonus === 'function') {
    try { return Number(dmgBonus({ character: C }) || 0); } catch { return 0; }
  }
  const key = String(dmgBonus).toLowerCase();
  if (ABILITIES.includes(key) && typeof getModFn === 'function' && typeof getFinalFn === 'function') {
    return Number(getModFn(getFinalFn(C, key)) || 0);
  }
  const n = Number(dmgBonus);
  return Number.isFinite(n) ? n : 0;
}

export function spellModifierEntities(C) {
  if (!C) return [];
  const out = [{ className: C.className, subclassShortName: C.subclassShortName, level: primaryClassLevel(C) }];
  (C.extraClasses || []).forEach((ec) => out.push({ className: ec.name, subclassShortName: ec.subclassShortName, level: ec.level || 1 }));
  return out.filter((entry) => entry.className);
}

function normalizeSpellSchool(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const upper = raw.toUpperCase();
  return (SPELL_SCHOOL_NAMES[upper] || raw).toLowerCase();
}

function schoolMatches(spellSchool, modifierSchool) {
  return normalizeSpellSchool(spellSchool) === normalizeSpellSchool(modifierSchool);
}

function collectSpellModifiers(C, ctx = {}) {
  const out = [];
  spellModifierEntities(C).forEach((entity) => {
    out.push(...((adapterRegistry.getClassSheetSpellModifiers(entity.className) || []).map((mod) => ({
      mod,
      modifierOwnerType: 'class',
      ownerLevel: entity.level,
      ownerClassName: entity.className,
      ownerSubclassShortName: null,
    }))));
    out.push(...((adapterRegistry.getSubclassSheetSpellModifiers(entity.className, entity.subclassShortName) || []).map((mod) => ({
      mod,
      modifierOwnerType: 'subclass',
      ownerLevel: entity.level,
      ownerClassName: entity.className,
      ownerSubclassShortName: entity.subclassShortName,
    }))));
  });
  if (C?.speciesName) {
    out.push(...((adapterRegistry.getSpeciesSheetSpellModifiers(C.speciesName, C.speciesSource) || []).map((mod) => ({
      mod,
      modifierOwnerType: 'species',
      ownerLevel: C.level || 1,
      ownerClassName: null,
      ownerSubclassShortName: null,
    }))));
  }
  return out;
}

export function applySpellModifiers(C, ctx) {
  if (!ctx || !C) return ctx?.formula;
  const spellOwnerClass = ctx.ownerClassName || ctx.spell?.ownerClassName || null;
  const spellOwnerSubclass = ctx.ownerSubclassShortName || ctx.spell?.ownerSubclassShortName || null;
  let formula = ctx.formula;

  collectSpellModifiers(C, ctx).forEach(({ mod, modifierOwnerType, ownerLevel, ownerClassName, ownerSubclassShortName }) => {
    if (!mod) return;

    if (modifierOwnerType === 'class' && spellOwnerClass && matchKey(ownerClassName) !== matchKey(spellOwnerClass)) return;
    if (
      modifierOwnerType === 'subclass' &&
      spellOwnerClass &&
      (matchKey(ownerClassName) !== matchKey(spellOwnerClass) || (spellOwnerSubclass && matchKey(ownerSubclassShortName) !== matchKey(spellOwnerSubclass)))
    ) return;

    const modifierContext = {
      ...ctx,
      formula,
      character: C,
      choices: C?.choices || {},
      ownerLevel,
      ownerClassName,
      ownerSubclassShortName,
    };

    if (typeof mod === 'function') {
      try {
        const next = mod(modifierContext);
        if (typeof next === 'string' && next) formula = next;
      } catch {}
      return;
    }
    if (typeof mod === 'object') {
      if (mod.minLevel && Number(ownerLevel || 1) < Number(mod.minLevel)) return;
      if (mod.kind && mod.kind !== ctx.kind) return;
      if (mod.school && !schoolMatches(ctx?.spell?.school, mod.school)) return;
      if (mod.minSpellLevel != null && Number(ctx?.level ?? ctx?.castLevel ?? 0) < Number(mod.minSpellLevel)) return;
      if (typeof mod.condition === 'function' && !mod.condition(modifierContext)) return;
      let amount = 0;
      if (typeof mod.amount === 'function') amount = Number(mod.amount(modifierContext) || 0);
      else if (typeof mod.amount === 'string') amount = resolveDmgBonusValue(C, mod.amount, getAbilityMod, getFinalScore);
      else amount = Number(mod.amount || 0);
      if (!amount) return;
      formula = applyFlatBonus(formula, amount);
    }
  });
  return formula;
}

function applyFlatBonus(formula, amount) {
  if (!formula) return formula;
  const text = String(formula).replace(/\s+/g, '');
  const match = text.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (!match) return formula;
  const count = Number(match[1]);
  const faces = Number(match[2]);
  const flat = Number(match[3] || 0) + amount;
  return withModifier(`${count}d${faces}`, flat);
}
