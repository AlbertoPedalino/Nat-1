// The monster catalog: the compendium's creatures with the filters of a
// bestiary (challenge rating range, type, size, source).
//
// Pure; the page is MonsterCatalog.jsx.

import { normalizeSearchText } from '../../shared/content/searchText.js';
import { parseCr } from '../../shared/character/forms/beasts.js';
import { getCR, getHP, getAC, getType, getSizeLabel } from '../encounterbuilder/bestiary/monsterUtils.js';
import { CR_ORDER } from '../encounterbuilder/state/constants.js';

export const CHALLENGE_RATINGS = Object.freeze(CR_ORDER.map((cr) => ({ key: cr, label: `CR ${cr}` })));

export const MONSTER_TYPES = Object.freeze(
  ['Aberration', 'Beast', 'Celestial', 'Construct', 'Dragon', 'Elemental', 'Fey', 'Fiend', 'Giant', 'Humanoid', 'Monstrosity', 'Ooze', 'Plant', 'Undead']
    .map((type) => ({ key: type.toLowerCase(), label: type })),
);

export const MONSTER_SIZES = Object.freeze([
  { key: 'T', label: 'Tiny' },
  { key: 'S', label: 'Small' },
  { key: 'M', label: 'Medium' },
  { key: 'L', label: 'Large' },
  { key: 'H', label: 'Huge' },
  { key: 'G', label: 'Gargantuan' },
]);

export function crValue(monster) {
  return parseCr(getCR(monster?.cr)) ?? 0;
}

export function monsterType(monster) {
  return String(getType(monster?.type) || '').toLowerCase();
}

export function monsterSizes(monster) {
  return Array.isArray(monster?.size) ? monster.size : [monster?.size].filter(Boolean);
}

export function monsterStats(monster) {
  return { cr: getCR(monster?.cr), size: getSizeLabel(monster), ac: getAC(monster?.ac), hp: getHP(monster?.hp) };
}

export const MONSTER_FILTERS = Object.freeze({
  search: '', crFrom: 'all', crTo: 'all', type: 'all', size: 'all', source: 'all', sort: 'name',
});

export function filterMonsters(entries, filters = MONSTER_FILTERS) {
  const f = { ...MONSTER_FILTERS, ...filters };
  const terms = normalizeSearchText(f.search).split(' ').filter(Boolean);
  const from = f.crFrom === 'all' ? -Infinity : parseCr(f.crFrom);
  const to = f.crTo === 'all' ? Infinity : parseCr(f.crTo);
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
