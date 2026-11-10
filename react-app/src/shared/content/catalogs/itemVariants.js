import { matchKey, recordKey, stripSource } from '../nameKeys.js';
import { canonicalItemSource, formatLeadingBonusName, withCanonicalSource } from './itemRecords.js';
import { resolveVariantTemplate } from './entryTemplates.js';
import { asArray } from '../../lists.js';
import { resolveCopyRecords as resolveCopies } from '../copyRecords.js';

// 5etools item variants: `_copy` resolution, base-item requirement matching,
// and the expansion of magic variants into concrete items.

// Magic variants carry their source on `inherits`, not at the top level, so
// "+1 Weapon" (DMG) and "+1 Weapon" (XDMG) would otherwise share one key.
function recordSource(record) {
  return record?.source || record?.inherits?.source;
}

/** Resolve 5etools `_copy` chains of items (copyRecords.js). */
export function resolveCopyRecords(records) {
  return resolveCopies(records, {
    keyOf: (record) => recordKey(record?.name, recordSource(record)),
    copyKeyOf: (copy, record) => recordKey(copy.name, copy.source || recordSource(record)),
  });
}

function normalizeComparable(value) {
  return stripSource(value).toLowerCase();
}

function isWeaponType(type) {
  return ['M', 'R', 'WEAPON'].includes(type);
}

function isArmorType(type) {
  return ['LA', 'MA', 'HA', 'S', 'ARMOR'].includes(type);
}

function matchesProperty(item, required) {
  const properties = (Array.isArray(item?.property) ? item.property : [])
    .map(normalizeComparable);
  const requiredProperties = asArray(required)
    .map(normalizeComparable)
    .filter(Boolean);
  return requiredProperties.every((property) => properties.includes(property));
}

export function matchesItemRequirement(item, requirement) {
  if (!item || !requirement || typeof requirement !== 'object') return false;
  const type = stripSource(item.type).toUpperCase();

  if (requirement.name && matchKey(item.name) !== matchKey(requirement.name)) return false;
  if (requirement.source && String(item.source || '').toUpperCase() !== String(requirement.source).toUpperCase()) return false;
  if (requirement.type) {
    const requiredType = stripSource(requirement.type).toUpperCase();
    if (requiredType === 'WEAPON' && !isWeaponType(type)) return false;
    if (requiredType === 'ARMOR' && !isArmorType(type)) return false;
    if (!['WEAPON', 'ARMOR'].includes(requiredType) && requiredType !== type) return false;
  }
  if (requirement.weapon && !isWeaponType(type)) return false;
  if (requirement.weaponCategory && normalizeComparable(requirement.weaponCategory) !== normalizeComparable(item.weaponCategory)) return false;
  if (requirement.armor && !isArmorType(type)) return false;
  if (requirement.property && !matchesProperty(item, requirement.property)) return false;

  const known = new Set(['name', 'source', 'type', 'weapon', 'weaponCategory', 'armor', 'property']);
  return Object.keys(requirement).some((field) => known.has(field));
}

export function matchesItemRequirements(item, requirements) {
  const list = Array.isArray(requirements) ? requirements : [];
  return list.length === 0 || list.some((requirement) => matchesItemRequirement(item, requirement));
}

export function isExcludedByVariant(item, excludes) {
  const list = Array.isArray(excludes) ? excludes : [];
  return list.some((requirement) => matchesItemRequirement(item, requirement));
}

// A magic variant is kept when it, or what it grants, comes from a supported
// item manual.
export function isAllowedMagicVariant(variant) {
  if (!variant) return false;
  const inherited = variant.inherits || {};
  return Boolean(
    canonicalItemSource(variant)
    || canonicalItemSource(inherited)
  );
}

function formatVariantName(baseName, inherits) {
  const prefix = String(inherits.namePrefix || '').trim();
  const suffix = String(inherits.nameSuffix || '').trim();
  if (/^\+\d+$/.test(prefix)) return `${baseName} ${prefix}${suffix ? ` ${suffix}` : ''}`.trim();
  return `${prefix ? `${prefix} ` : ''}${baseName}${suffix ? ` ${suffix}` : ''}`.trim();
}

// Expands each magic variant ("+1 Weapon", "Flame Tongue"…) into one concrete
// item per base item it applies to; a variant without requirements is one item.
export function expandMagicVariants(variants, baseItems) {
  const expanded = [];
  variants.forEach((variant) => {
    const inherits = variant.inherits || {};
    const requires = variant.requires || [];
    const variantSource = canonicalItemSource(variant)
      || canonicalItemSource(inherits);

    if (!variantSource) return;

    if (!requires.length && variant.name) {
      expanded.push(withCanonicalSource({
        ...inherits,
        name: formatLeadingBonusName(variant.name),
        source: variantSource,
      }));
      return;
    }

    // A "+N" namePrefix marks a plain bonus variant (e.g. "+1 Weapon"), which we
    // tag so generic pickers (Artificer Replicate "Weapon +1/+2") can offer the
    // expanded base weapons without catching named magic weapons that merely
    // grant a +N bonus (Sun Blade, Dagger of Venom, …).
    const bonusPrefix = String(inherits.namePrefix || '').trim();
    const bonusVariant = /^\+\d+$/.test(bonusPrefix) ? bonusPrefix : null;

    baseItems.forEach((base) => {
      if (!matchesItemRequirements(base, requires)) return;
      if (isExcludedByVariant(base, variant.excludes)) return;
      const concrete = {
        ...base,
        ...inherits,
        name: formatVariantName(base.name, inherits),
        source: variantSource || base.source,
        baseItem: `${base.name}|${base.source}`,
        variantName: variant.name || null,
        variantSource: variantSource,
        ...(bonusVariant ? { bonusVariant } : {}),
      };
      concrete.entries = resolveVariantTemplate(concrete.entries, concrete, base.name);
      expanded.push(withCanonicalSource(concrete));
    });
  });
  return expanded;
}
