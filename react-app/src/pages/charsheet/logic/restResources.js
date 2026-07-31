import { adapterRegistry as installedRegistry } from '../../../adapters/registry.js';
import { getFinal, getMod, getPB } from './calculations.js';
import { primaryClassLevel } from '../../../shared/character/classLevel.js';
import { resolveScalingFormula } from '../../../shared/character/scalingFormula.js';
import { rechargesOnRest, isKnownRecharge } from '../../../shared/character/rechargeRules.js';
import { hasActionRequirement } from '../../../shared/character/choiceUtils.js';
function resourceOwnerLevel(def, character) {
  return Number(def?.ownerLevel ?? primaryClassLevel(character));
}

function resourceAbilityMods(character) {
  return {
    str: getMod(getFinal(character, 'str')),
    dex: getMod(getFinal(character, 'dex')),
    con: getMod(getFinal(character, 'con')),
    int: getMod(getFinal(character, 'int')),
    wis: getMod(getFinal(character, 'wis')),
    cha: getMod(getFinal(character, 'cha')),
  };
}

export function normalizeResourceMax(def, character = null) {
  const raw = def?.max ?? 1;
  if (typeof raw === 'string') {
    const resolved = resolveScalingFormula(raw, character);
    if (resolved != null) return Math.max(0, Math.floor(resolved));
  }
  if (typeof raw === 'function') {
    try {
      const value = raw(resourceOwnerLevel(def, character), resourceAbilityMods(character), { character, resource: def, pb: getPB(character) });
      const n = Number(value);
      if (!Number.isFinite(n)) return value === Infinity ? Infinity : 1;
      return Math.max(0, Math.floor(n));
    } catch {
      return 1;
    }
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw === Infinity ? Infinity : 1;
  return Math.max(0, Math.floor(n));
}

function hasCondition(def, character) {
  if (typeof def?.condition !== 'function' && !def?.requiresChoice && !(def?.choiceKey && def?.model) && !def?.requiresInventoryFlag) return true;
  try { return hasActionRequirement(def, character); } catch { return false; }
}

function getClassEntities(character) {
  if (!character) return [];
  const out = [];
  if (character.className) {
    out.push({
      className: character.className,
      subclassShortName: character.subclassShortName || '',
      level: primaryClassLevel(character),
      ownerName: character.className,
    });
  }
  (character.extraClasses || []).forEach((extra) => {
    if (!extra?.name) return;
    out.push({
      className: extra.name,
      subclassShortName: extra.subclassShortName || '',
      level: Number(extra.level || 1),
      ownerName: extra.name,
    });
  });
  return out;
}

function selectedFeatNames(character) {
  return (character?.allFeatSnapshots || []).map((feat) => feat?.name).filter(Boolean);
}

const KNOWN_TRACK = new Set(['used', 'remaining']);
const _badResourceDefWarned = typeof Set === 'function' ? new Set() : null;
function warnBadResourceDef(def, ownerName) {
  if (typeof import.meta === 'undefined' || !import.meta.env?.DEV || !_badResourceDefWarned) return;
  const owner = ownerName || def.ownerName || '?';
  if (def?.recharge && !isKnownRecharge(def.recharge)) {
    const cacheKey = `recharge|${owner}|${def.key}|${def.recharge}`;
    if (!_badResourceDefWarned.has(cacheKey)) {
      _badResourceDefWarned.add(cacheKey);
      // eslint-disable-next-line no-console
      console.warn(`[resources] Unknown recharge "${def.recharge}" on "${def.key}" (${owner}). Use LR / SR / SR+LR.`);
    }
  }
  if (def?.track && !KNOWN_TRACK.has(def.track)) {
    const cacheKey = `track|${owner}|${def.key}|${def.track}`;
    if (!_badResourceDefWarned.has(cacheKey)) {
      _badResourceDefWarned.add(cacheKey);
      // eslint-disable-next-line no-console
      console.warn(`[resources] Unknown track "${def.track}" on "${def.key}" (${owner}). Use 'used' or 'remaining'.`);
    }
  }
}

function pushResource(out, def, character, ownerName, ownerLevel) {
  if (!def?.key) return;
  const lv = Number(def.ownerLevel ?? ownerLevel ?? character?.level ?? 1);
  if (def.minLevel && lv < Number(def.minLevel)) return;
  if (!hasCondition(def, character)) return;
  warnBadResourceDef(def, ownerName);
  out.push({ ...def, ownerName: def.ownerName || ownerName, ownerLevel: lv });
}

function uniqResources(resources) {
  const out = [];
  const seen = new Set();
  resources.forEach((def) => {
    const key = `${def.key}|${def.ownerName || ''}|${def.minLevel || ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(def);
  });
  return out;
}

function srBlockedByLevel(def, character) {
  if (!def?.srMinLevel) return false;
  const ownerLevel = Number(def?.ownerLevel ?? primaryClassLevel(character));
  return ownerLevel < Number(def.srMinLevel);
}

export function getAllResourceDefs(character) {
  const out = [];

  getClassEntities(character).forEach((entity) => {
    (installedRegistry.getClassSheetResources(entity.className) || [])
      .forEach((def) => pushResource(out, def, character, entity.ownerName, entity.level));
    if (entity.subclassShortName) {
      (installedRegistry.getSubclassSheetResources(entity.className, entity.subclassShortName) || [])
        .forEach((def) => pushResource(out, def, character, `${entity.subclassShortName} (${entity.className})`, entity.level));
    }
  });

  if (character?.speciesName) {
    (installedRegistry.getSpeciesSheetResources(character.speciesName, character.speciesSource) || [])
      .forEach((def) => pushResource(out, def, character, character.speciesName, character.level || 1));
  }

  selectedFeatNames(character).forEach((featName) => {
    (installedRegistry.getFeatSheetResources(featName) || [])
      .forEach((def) => pushResource(out, def, character, featName, character?.level || 1));
  });

  return uniqResources(out);
}

export function getTotalHitDice(character) {
  return primaryClassLevel(character) + (character.extraClasses || []).reduce((sum, ec) => sum + (ec.level || 1), 0);
}

export function getHitDicePools(character, usedPools = {}, legacyUsed = 0) {
  if (!character) return [];
  const pools = [];
  pools.push({
    key: 'primary',
    label: character.className || 'Class',
    faces: getHitDieFaces(character.clsSnapshot?.hd),
    total: Math.max(0, primaryClassLevel(character)),
  });
  (character.extraClasses || []).forEach((ec, index) => {
    pools.push({
      key: `extra_${index}`,
      label: ec.name || 'Class',
      faces: getHitDieFaces(ec.clsSnapshot?.hd),
      total: Math.max(0, Number(ec.level || 1)),
    });
  });

  const hasPoolState = usedPools && typeof usedPools === 'object' && Object.keys(usedPools).length > 0;
  let remainingLegacy = Math.max(0, Math.floor(Number(legacyUsed) || 0));
  return pools.map((pool) => {
    const rawUsed = hasPoolState ? Number(usedPools[pool.key] || 0) : Math.min(pool.total, remainingLegacy);
    if (!hasPoolState) remainingLegacy -= rawUsed;
    const used = Math.max(0, Math.min(pool.total, Math.floor(rawUsed)));
    return { ...pool, used, remaining: Math.max(0, pool.total - used) };
  });
}

export function getUsedHitDiceTotal(usedPools = {}) {
  return Object.values(usedPools || {}).reduce((sum, value) => sum + Math.max(0, Math.floor(Number(value) || 0)), 0);
}

function getHitDieFaces(hd) {
  if (hd?.faces) return Number(hd.faces) || 8;
  if (Array.isArray(hd) && hd[0]?.faces) return Number(hd[0].faces) || 8;
  const parsed = String(hd || '').match(/d(\d+)/i);
  return parsed ? Number(parsed[1]) || 8 : 8;
}

// The value a resource holds when fully available: 0 for 'used'-tracked pools
// (they store amount spent), max for default 'remaining' resources. Single
// source of truth for both the rest recharge and the initial/clamp logic.
export function resourceFullValue(def, max) {
  return def?.track === 'used' ? 0 : max;
}

export function applyResourceRest(resources, defs, character, type) {
  const next = { ...resources };
  defs.forEach(def => {
    if (!def.key) return;
    const max = normalizeResourceMax(def, character);
    const rechargedValue = resourceFullValue(def, max);
    if (type === 'long') {
      next[def.key] = rechargedValue;
      return;
    }
    if (rechargesOnRest(def.recharge, 'short') && !srBlockedByLevel(def, character)) {
      next[def.key] = rechargedValue;
      return;
    }
    if (def.srRecover) {
      const gain = Number(def.srRecover) || 0;
      next[def.key] = Math.min((Number(next[def.key]) || 0) + gain, max);
    }
  });
  return next;
}
