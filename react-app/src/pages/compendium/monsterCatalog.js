// The monster catalog: the compendium's creatures with the filters of a
// bestiary (challenge rating range, type, size, source).
//
// Pure; the page is MonsterCatalog.jsx.

import { getHP, getAC, getType, getSizeLabel } from '../../shared/bestiary/monsterUtils.js';
import { CR_ORDER } from '../../shared/bestiary/bestiaryConstants.js';
import { CREATURE_TYPES, SIZE_NAMES } from '../../shared/content/rulesVocabulary.js';
import { crKey, crNumber } from '../../shared/bestiary/challengeRating.js';
import { runCatalogFilter } from './catalogFilter.js';

export const CHALLENGE_RATINGS = Object.freeze(CR_ORDER.map((cr) => ({ key: cr, label: `CR ${cr}` })));

export const MONSTER_TYPES = Object.freeze(CREATURE_TYPES.map((type) => ({ key: type.toLowerCase(), label: type })));

export const MONSTER_SIZES = Object.freeze(Object.entries(SIZE_NAMES).map(([key, label]) => ({ key, label })));

export function crValue(monster) {
  return crNumber(monster?.cr) ?? 0;
}

export function monsterType(monster) {
  return String(getType(monster?.type) || '').toLowerCase();
}

export function monsterSizes(monster) {
  return Array.isArray(monster?.size) ? monster.size : [monster?.size].filter(Boolean);
}

export function monsterStats(monster) {
  return { cr: crKey(monster?.cr), size: getSizeLabel(monster), ac: getAC(monster?.ac), hp: getHP(monster?.hp) };
}

export const MONSTER_FILTERS = Object.freeze({
  search: '', crFrom: 'all', crTo: 'all', type: 'all', size: 'all', source: 'all', sort: 'name',
});

export function filterCatalogMonsters(entries, filters = MONSTER_FILTERS) {
  return runCatalogFilter(entries, filters, MONSTER_FILTERS, {
    tests: (f) => {
      const from = f.crFrom === 'all' ? -Infinity : crNumber(f.crFrom);
      const to = f.crTo === 'all' ? Infinity : crNumber(f.crTo);
      return [
        (monster) => crValue(monster) >= from && crValue(monster) <= to,
        (monster) => f.type === 'all' || monsterType(monster) === f.type,
        (monster) => f.size === 'all' || monsterSizes(monster).includes(f.size),
      ];
    },
    sorts: { cr: (a, b) => crValue(a.record) - crValue(b.record) },
  });
}
