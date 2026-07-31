// Canonical weapon-scope filters for weapon-bound effects (Fighting Styles and
// any future weapon-scoped attack/damage bonus). Single source of truth shared
// by the effect producers (adapters) and the consumer
// (sheetEffects.getWeaponEffectBonuses), so a typo can't silently no-op:
// authors reference WEAPON_FILTERS.* (a ReferenceError if wrong) and the matcher
// dev-warns on any unknown value.

export const WEAPON_FILTERS = Object.freeze({
  ANY: 'any',
  RANGED: 'ranged',
  MELEE: 'melee',
  ONE_HANDED_MELEE: 'oneHandedMelee',
  TWO_HANDED_MELEE: 'twoHandedMelee',
  THROWN: 'thrown',
});

const VALID = new Set(Object.values(WEAPON_FILTERS).map((v) => v.toLowerCase()));

export function isValidWeaponFilter(filter) {
  return VALID.has(String(filter || '').toLowerCase());
}

const _warned = new Set();
function warnUnknownFilter(filter) {
  if (typeof import.meta === 'undefined' || !import.meta?.env?.DEV) return;
  if (_warned.has(filter)) return;
  _warned.add(filter);
  // eslint-disable-next-line no-console
  console.warn(`[weaponFilters] Unknown weaponFilter "${filter}". Valid: ${[...VALID].join(', ')}.`);
}

// Match a weapon filter (string or array → OR semantics) against precomputed
// weapon flags { ranged, melee, thrown, oneHanded, twoHanded }. An empty/absent
// filter matches any weapon. Unknown values dev-warn once and never match.
export function weaponFilterMatches(filter, info = {}) {
  const filters = (Array.isArray(filter) ? filter : (filter == null ? [] : [filter]))
    .map((f) => String(f || '').toLowerCase());
  if (!filters.length) return true;
  return filters.some((f) => {
    switch (f) {
      case 'any': return true;
      case 'ranged': return !!info.ranged;
      case 'melee': return !!info.melee;
      case 'thrown': return !!info.thrown;
      case 'onehandedmelee': return !!info.melee && !!info.oneHanded;
      case 'twohandedmelee': return !!info.melee && !!info.twoHanded;
      default: warnUnknownFilter(f); return false;
    }
  });
}
