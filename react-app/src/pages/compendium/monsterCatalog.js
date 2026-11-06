// The monster catalog: the compendium's creatures with the filters of a
// bestiary (challenge rating range, type, size, source).
//
// Pure; the page is MonsterCatalog.jsx.

import { normalizeSearchText } from '../../shared/content/searchText.js';
import { getHP, getAC, getType, getSizeLabel } from '../../shared/bestiary/monsterUtils.js';
import { CR_ORDER } from '../../shared/bestiary/bestiaryConstants.js';
import { CREATURE_TYPES, SIZE_NAMES } from '../../shared/content/rulesVocabulary.js';
import { crKey, crNumber } from '../../shared/bestiary/challengeRating.js';

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

export function filterMonsters(entries, filters = MONSTER_FILTERS) {
  const f = { ...MONSTER_FILTERS, ...filters };
  const terms = normalizeSearchText(f.search).split(' ').filter(Boolean);
  const from = f.crFrom === 'all' ? -Infinity : crNumber(f.crFrom);
  const to = f.crTo === 'all' ? Infinity : crNumber(f.crTo);
  const list = entries.filter((entry) => {
    const monster = entry.record;
    if (terms.length && !terms.every((term) => entry.nameText.includes(term))) return false;
    const cr = crValue(monster);
    if (cr < from || cr > to) return false;
    if (f.type !== 'all' && monsterType(monster) !== f.type) return false;
    if (f.size !== 'all' && !monsterSizes(monster).includes(f.size)) return false;
    if (f.source !== 'all' && entry.source !== f.source) return false;
    return true;
  });
  const byName = (a, b) => a.name.localeCompare(b.name);
  if (f.sort === 'cr') return list.sort((a, b) => crValue(a.record) - crValue(b.record) || byName(a, b));
  return list.sort(byName);
}
