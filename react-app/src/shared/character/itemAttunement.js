import { itemIdentityKey } from './itemIdentity.js';

export const BASE_ATTUNEMENT_LIMIT = 3;

const HELD_OR_WORN_TYPES = new Set([
  'M', 'R', 'LA', 'MA', 'HA', 'S', 'WEAPON', 'ARMOR', 'WD', 'RD', 'ST', 'SCF',
]);
const SUPPORTED_REQUIREMENT_TAGS = new Set(['class', 'race', 'spellcasting']);

export function requiresAttunement(item) {
  return Boolean(item?.reqAttune);
}

export function requiresEquipmentForEffect(item) {
  return HELD_OR_WORN_TYPES.has(String(item?.type || '').toUpperCase());
}

export function isItemEffectActive(item) {
  if (!item) return false;
  if (requiresAttunement(item) && !item.attuned) return false;
  return requiresEquipmentForEffect(item) ? Boolean(item.equipped) : true;
}

export function countAttunedItems(inventory) {
  return (inventory || []).filter((item) => requiresAttunement(item) && item?.attuned).length;
}

export function resolveAttunementLimit(effects, baseLimit = BASE_ATTUNEMENT_LIMIT) {
  return (effects || []).reduce((limit, effect) => {
    if (String(effect?.type || '').toLowerCase() !== 'attunementslots') return limit;
    const value = Number(effect.value);
    return Number.isFinite(value) ? Math.max(limit, value) : limit;
  }, baseLimit);
}

function normalizeRequirementValue(value) {
  return String(value || '').split('|')[0].trim().toLowerCase();
}

function requirementTags(item) {
  if (!item?.reqAttuneTags) return [];
  return (Array.isArray(item.reqAttuneTags) ? item.reqAttuneTags : [item.reqAttuneTags])
    .filter((tag) => tag && typeof tag === 'object');
}

function hasUnmodeledAlternative(item) {
  const text = String(item?.reqAttune || '').toLowerCase();
  return text.includes('{@item ') || text.includes('attuned to ');
}

function evaluateRequirementTag(tag, character, context) {
  const unknownKeys = Object.keys(tag).filter((key) => !SUPPORTED_REQUIREMENT_TAGS.has(key));
  if (unknownKeys.length) {
    return { status: 'unknown', reason: 'Part of this requirement cannot be verified automatically' };
  }

  const checks = [];
  if (tag.class) {
    const requiredClass = normalizeRequirementValue(tag.class);
    const classes = [
      character?.className,
      ...((character?.extraClasses || []).map((entry) => entry?.name)),
    ].map(normalizeRequirementValue);
    checks.push({
      passed: classes.includes(requiredClass),
      reason: `Requires class: ${requiredClass}`,
    });
  }
  if (tag.race) {
    const requiredSpecies = normalizeRequirementValue(tag.race);
    checks.push({
      passed: normalizeRequirementValue(character?.speciesName) === requiredSpecies,
      reason: `Requires species: ${requiredSpecies}`,
    });
  }
  if (tag.spellcasting) {
    checks.push({
      passed: Boolean(context?.isSpellcaster),
      reason: 'Requires the ability to cast a spell from a trait or feature',
    });
  }

  if (!checks.length) return { status: 'unknown', reason: 'Requirement cannot be verified automatically' };
  const failed = checks.find((check) => !check.passed);
  return failed
    ? { status: 'ineligible', reason: failed.reason }
    : { status: 'eligible', reason: null };
}

export function getAttunementEligibility(item, character, context = {}) {
  if (!requiresAttunement(item)) return { status: 'not-required', reason: null };
  if (item.reqAttune === true) return { status: 'eligible', reason: null };

  const tags = requirementTags(item);
  if (!tags.length) {
    return { status: 'unknown', reason: 'Requirement cannot be verified automatically' };
  }

  const results = tags.map((tag) => evaluateRequirementTag(tag, character, context));
  if (results.some((result) => result.status === 'eligible')) {
    return results.find((result) => result.status === 'eligible');
  }
  if (hasUnmodeledAlternative(item) || results.some((result) => result.status === 'unknown')) {
    return {
      status: 'unknown',
      reason: 'An alternative attunement requirement cannot be verified automatically',
    };
  }
  return results[0];
}

export function enforceAttunementRules(
  inventory,
  {
    limit = BASE_ATTUNEMENT_LIMIT,
    character = null,
    context = {},
  } = {},
) {
  if (!Array.isArray(inventory)) return [];

  let occupied = 0;
  let changed = false;
  const identities = new Set();
  const next = inventory.map((item) => {
    if (!item?.attuned) return item;

    const identity = item?.name && item?.source ? itemIdentityKey(item) : '';
    const eligibility = getAttunementEligibility(item, character, context);
    const invalid = !requiresAttunement(item)
      || eligibility.status === 'ineligible'
      || occupied >= limit
      || (identity && identities.has(identity));

    if (invalid) {
      changed = true;
      return { ...item, attuned: false };
    }

    occupied += 1;
    if (identity) identities.add(identity);
    return item;
  });

  return changed ? next : inventory;
}

export function toggleItemAttunement(
  inventory,
  index,
  {
    limit = BASE_ATTUNEMENT_LIMIT,
    character = null,
    context = {},
    curseBroken = false,
  } = {},
) {
  const current = Array.isArray(inventory) ? inventory : [];
  const target = current[index];
  if (!target) return { inventory: current, status: 'not-found' };
  if (!requiresAttunement(target)) return { inventory: current, status: 'not-required' };
  if (target.attuned && target.curse && !curseBroken) {
    return { inventory: current, status: 'cursed' };
  }

  if (!target.attuned) {
    const eligibility = getAttunementEligibility(target, character, context);
    if (eligibility.status === 'ineligible') {
      return { inventory: current, status: 'requirement', eligibility };
    }
    if (countAttunedItems(current) >= limit) {
      return { inventory: current, status: 'limit' };
    }

    const identity = target?.name && target?.source ? itemIdentityKey(target) : '';
    if (identity && current.some((item, itemIndex) => (
      itemIndex !== index && item?.attuned && itemIdentityKey(item) === identity
    ))) {
      return { inventory: current, status: 'duplicate' };
    }
  }

  return {
    inventory: current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, attuned: !item.attuned } : item
    )),
    status: 'updated',
  };
}

export function attunementRequirementText(item) {
  if (!requiresAttunement(item)) return null;
  if (item.reqAttune === true || typeof item.reqAttune !== 'string' || !item.reqAttune.trim()) {
    return 'Requires attunement';
  }
  const detail = item.reqAttune.trim();
  return detail.toLowerCase().startsWith('by ')
    ? `Requires attunement ${detail}`
    : `Requires attunement (${detail})`;
}
