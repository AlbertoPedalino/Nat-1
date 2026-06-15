/**
 * Spell free-cast metadata helpers.
 *
 * A "free cast" is a use-limited slot-free casting of a spell that is granted
 * by a species, feat, class, subclass, or invocation. The spell can usually
 * also be cast with normal spell slots. The free-cast counter is per-spell
 * and per-grant-source, never an action.
 *
 * Adapters attach `freeCast` (single object) or `freeCasts` (array) to a
 * granted spell entry. The spell pipeline runs entries through
 * `normalizeFreeCast` to produce the rendered shape consumed by `SpellEntry`.
 */
import { getProficiencyBonus } from './proficiency.js';
import { resolveScalingFormula } from './scalingFormula.js';
import { normalizeRecharge, rechargeLabel, rechargesOnRest } from './rechargeRules.js';

function resolveMaxUses(raw, character, context = {}) {
  const formula = raw?.usesFormula;
  if (typeof formula === 'function') {
    try {
      const value = formula({ ...context, character, pb: getProficiencyBonus(character) });
      const n = Number(value);
      if (Number.isFinite(n)) return Math.max(1, Math.floor(n));
    } catch { /* ignore */ }
  }
  const resolved = resolveScalingFormula(formula, character);
  if (resolved != null) return Math.max(1, Math.floor(resolved));
  const n = Number(raw?.maxUses ?? 1);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

export function formatRechargeLabel(recharge, max) {
  const suffix = rechargeLabel(recharge);
  if (!max || max === 1) return `1/${suffix}`;
  return `${max}/${suffix}`;
}

export function makeFreeCastId({ sourceType, source, spellName }) {
  return [sourceType || 'auto', source || 'auto', spellName || '']
    .map((part) => String(part).trim())
    .join('|')
    .toLowerCase()
    .replace(/[^a-z0-9|]+/g, '-');
}

export function normalizeFreeCast(rawDef, ctx = {}) {
  if (!rawDef || typeof rawDef !== 'object') return null;
  const character = ctx.character || null;
  const sourceType = rawDef.sourceType || ctx.sourceType || 'auto';
  const source = rawDef.source || ctx.source || 'Auto';
  const spellName = ctx.spellName || rawDef.spellName || '';
  if (!spellName) return null;

  const recharge = normalizeRecharge(rawDef.recharge);
  const max = resolveMaxUses(rawDef, character, ctx);
  const label = rawDef.label || source;
  const id = rawDef.id || makeFreeCastId({ sourceType, source, spellName });

  return {
    id,
    label,
    max,
    recharge,
    rechargeLabel: formatRechargeLabel(recharge, max),
    consumesSlot: rawDef.consumesSlot === true,
    canAlsoUseSlots: rawDef.canAlsoUseSlots !== false,
    sourceType,
    source,
    spellName,
  };
}

export function collectFreeCastsForGrant(grant, ctx = {}) {
  if (!grant || typeof grant !== 'object') return [];
  const list = Array.isArray(grant.freeCasts) ? grant.freeCasts : (grant.freeCast ? [grant.freeCast] : []);
  if (!list.length) return [];
  const spellName = ctx.spellName || grant.name;
  const source = ctx.source || grant.source;
  const sourceType = ctx.sourceType || grant.sourceType;
  return list
    .map((entry) => normalizeFreeCast(entry, { ...ctx, spellName, source, sourceType }))
    .filter(Boolean);
}

export function mergeFreeCastsById(...lists) {
  const byId = new Map();
  lists.flat().forEach((entry) => {
    if (!entry?.id) return;
    if (!byId.has(entry.id)) byId.set(entry.id, entry);
  });
  return [...byId.values()];
}

export function applyFreeCastRest(uses = {}, defs = [], restType = 'long') {
  const defById = new Map();
  (defs || []).forEach((def) => {
    if (def?.id) defById.set(def.id, def);
  });
  const next = {};
  Object.entries(uses || {}).forEach(([id, used]) => {
    const def = defById.get(id);
    if (!def) return;
    if (rechargesOnRest(def.recharge, restType)) return;
    next[id] = used;
  });
  return next;
}

export function getFreeCastRemaining(freeCast, uses = {}) {
  if (!freeCast?.id) return 0;
  const used = Math.max(0, Number(uses[freeCast.id] || 0));
  const max = Math.max(0, Number(freeCast.max || 0));
  return Math.max(0, max - used);
}

export function toggleFreeCastUse(uses = {}, freeCast) {
  if (!freeCast?.id) return uses;
  const used = Math.max(0, Number(uses[freeCast.id] || 0));
  const max = Math.max(1, Number(freeCast.max || 1));
  const next = { ...uses };
  if (used >= max) delete next[freeCast.id];
  else next[freeCast.id] = used + 1;
  return next;
}

const FEAT_FREE_CAST_TEMPLATES = new Map();

function normFeatKey(featName) {
  return String(featName || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function registerFeatFreeCastTemplate(featName, { template, appliesToCantrips = false } = {}) {
  const key = normFeatKey(featName);
  if (!key || !template || typeof template !== 'object') return;
  FEAT_FREE_CAST_TEMPLATES.set(key, { template, appliesToCantrips });
}

export function getFeatFreeCastTemplate(featName, { isCantrip = false } = {}) {
  const entry = FEAT_FREE_CAST_TEMPLATES.get(normFeatKey(featName));
  if (!entry) return null;
  if (isCantrip && !entry.appliesToCantrips) return null;
  return entry.template;
}

// Seed with XPHB feats that have well-defined free-cast rules.
// Feat adapter modules can register additional templates via the same API.
registerFeatFreeCastTemplate('Magic Initiate', {
  template: { maxUses: 1, recharge: 'longRest', canAlsoUseSlots: true },
  appliesToCantrips: false,
});
registerFeatFreeCastTemplate('Fey Touched', {
  template: { maxUses: 1, recharge: 'longRest', canAlsoUseSlots: true },
  appliesToCantrips: false,
});
registerFeatFreeCastTemplate('Shadow Touched', {
  template: { maxUses: 1, recharge: 'longRest', canAlsoUseSlots: true },
  appliesToCantrips: false,
});
