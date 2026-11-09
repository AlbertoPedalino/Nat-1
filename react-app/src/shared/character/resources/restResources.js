import { adapterRegistry } from '../../../adapters/registry.js';
import { getFinal, getMod, getPB } from '../sheet/sheetStats.js';
import {
  classEntities,
  primaryClassLevel,
} from '../progression/classLevel.js';
import { resolveScalingFormula } from '../dice/scalingFormula.js';
import {
  rechargesOnRest,
  isKnownRecharge,
} from './rechargeRules.js';
import { adapterEntryApplies } from '../progression/choiceUtils.js';
import { ownedFeatNames } from '../progression/selectedFeats.js';
import { hitDieFaces } from '../combat/hp.js';
import { clamp } from '../../numbers.js';
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
  if (!adapterEntryApplies(def, character)) return;
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

function restBlockedByLevel(def, character, type) {
  const minLevel = type === 'short' ? def?.srMinLevel : def?.lrMinLevel;
  if (!minLevel) return false;
  const ownerLevel = Number(def?.ownerLevel ?? primaryClassLevel(character));
  return ownerLevel < Number(minLevel);
}

export function getAllResourceDefs(character) {
  const out = [];

  classEntities(character).forEach((entity) => {
    (adapterRegistry.getClassSheetResources(entity.className) || [])
      .forEach((def) => pushResource(out, def, character, entity.ownerName, entity.level));
    if (entity.subclassShortName) {
      (adapterRegistry.getSubclassSheetResources(entity.className, entity.subclassShortName) || [])
        .forEach((def) => pushResource(out, def, character, `${entity.subclassShortName} (${entity.className})`, entity.level));
    }
  });

  if (character?.speciesName) {
    (adapterRegistry.getSpeciesSheetResources(character.speciesName, character.speciesSource) || [])
      .forEach((def) => pushResource(out, def, character, character.speciesName, character.level || 1));
  }

  ownedFeatNames(character).forEach((featName) => {
    (adapterRegistry.getFeatSheetResources(featName) || [])
      .forEach((def) => pushResource(out, def, character, featName, character?.level || 1));
  });

  return uniqResources(out);
}

export function getHitDicePools(character, usedPools = {}, legacyUsed = 0) {
  if (!character) return [];
  const pools = [];
  pools.push({
    key: 'primary',
    label: character.className || 'Class',
    faces: hitDieFaces(character.cls || character.clsSnapshot),
    total: Math.max(0, primaryClassLevel(character)),
  });
  (character.extraClasses || []).forEach((ec, index) => {
    pools.push({
      key: `extra_${index}`,
      label: ec.name || 'Class',
      faces: hitDieFaces(ec.cls || ec.clsSnapshot),
      total: Math.max(0, Number(ec.level || 1)),
    });
  });

  const hasPoolState = usedPools && typeof usedPools === 'object' && Object.keys(usedPools).length > 0;
  let remainingLegacy = Math.max(0, Math.floor(Number(legacyUsed) || 0));
  return pools.map((pool) => {
    const rawUsed = hasPoolState ? Number(usedPools[pool.key] || 0) : Math.min(pool.total, remainingLegacy);
    if (!hasPoolState) remainingLegacy -= rawUsed;
    const used = clamp(Math.floor(rawUsed), 0, pool.total);
    return { ...pool, used, remaining: Math.max(0, pool.total - used) };
  });
}

export function getUsedHitDiceTotal(usedPools = {}) {
  return Object.values(usedPools || {}).reduce((sum, value) => sum + Math.max(0, Math.floor(Number(value) || 0)), 0);
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
    if (rechargesOnRest(def.recharge, type) && !restBlockedByLevel(def, character, type)) {
      next[def.key] = rechargedValue;
      return;
    }
    if (type === 'short' && def.srRecover) {
      const gain = Number(def.srRecover) || 0;
      next[def.key] = Math.min((Number(next[def.key]) || 0) + gain, max);
    }
  });
  return next;
}
