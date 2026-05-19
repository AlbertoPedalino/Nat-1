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

const RECHARGE_LABELS = {
  longrest: 'LR',
  shortrest: 'SR',
  shortorlongrest: 'SR or LR',
  none: '—',
};

const RECHARGE_ALIASES = {
  lr: 'longRest',
  'long-rest': 'longRest',
  longrest: 'longRest',
  long: 'longRest',
  dawn: 'longRest',
  daily: 'longRest',
  perday: 'longRest',
  '1/day': 'longRest',
  sr: 'shortRest',
  'short-rest': 'shortRest',
  shortrest: 'shortRest',
  short: 'shortRest',
  'sr+lr': 'shortOrLongRest',
  'sr-lr': 'shortOrLongRest',
  shortorlongrest: 'shortOrLongRest',
  shortorlong: 'shortOrLongRest',
};

function normRecharge(value) {
  const key = String(value || '').toLowerCase().replace(/\s+/g, '');
  return RECHARGE_ALIASES[key] || (key ? value : 'longRest');
}

function proficiencyBonus(character) {
  const level = Number(character?.level || character?.classLevel || 1);
  return Math.floor((Math.max(1, level) - 1) / 4) + 2;
}

function abilityMod(character, ability) {
  const score = Number(character?.finalScores?.[ability] ?? 10);
  return Math.floor((score - 10) / 2);
}

function resolveMaxUses(raw, character) {
  const formula = raw?.usesFormula;
  if (typeof formula === 'function') {
    try {
      const value = formula({ character, pb: proficiencyBonus(character) });
      const n = Number(value);
      if (Number.isFinite(n)) return Math.max(1, Math.floor(n));
    } catch { /* ignore */ }
  }
  if (typeof formula === 'string') {
    const key = formula.toLowerCase();
    if (key === 'proficiencybonus' || key === 'pb') return Math.max(1, proficiencyBonus(character));
    if (key.startsWith('abilitymod:')) {
      const ability = key.split(':')[1];
      return Math.max(1, abilityMod(character, ability));
    }
  }
  const n = Number(raw?.maxUses ?? 1);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

export function formatRechargeLabel(recharge, max) {
  const key = String(recharge || '').toLowerCase().replace(/\s+/g, '');
  const suffix = RECHARGE_LABELS[key] || 'LR';
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

  const recharge = normRecharge(rawDef.recharge);
  const max = resolveMaxUses(rawDef, character);
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

function rechargeMatchesRest(recharge, restType) {
  const norm = String(recharge || '').toLowerCase();
  if (restType === 'long') return true;
  if (restType === 'short') return norm === 'shortrest' || norm === 'shortorlongrest';
  return false;
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
    if (rechargeMatchesRest(def.recharge, restType)) return;
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
