import { getType } from './monsterUtils.js';
import { crNumber } from './challengeRating.js';
import { CR_OPTIONS, CREATURE_TYPE_OPTIONS } from './bestiaryConstants.js';
import { matchesQuery } from '../content/searchText.js';
import { SIZE_NAMES } from '../content/rulesVocabulary.js';
import { countChosenValues, fieldDefaults, fieldTests } from '../content/filterFields.js';

// A creature's readings for a filter: its type lower-case ("dragon"), its
// sizes (["L"]), its challenge rating as a number (1/4 -> 0.25).
export function monsterTypeKey(monster) {
  return String(getType(monster?.type) || '').toLowerCase();
}

export function monsterSizes(monster) {
  return Array.isArray(monster?.size) ? monster.size : [monster?.size].filter(Boolean);
}

export function monsterCrValue(monster) {
  return crNumber(monster?.cr) ?? 0;
}

export function normalizeSourceFilter(sources) {
  return new Set((Array.isArray(sources) ? sources : []).map((source) => String(source || '').trim()).filter(Boolean));
}

export const MONSTER_SIZES = Object.freeze(Object.entries(SIZE_NAMES).map(([key, label]) => ({ key, label })));

// A creature's filters, once (shared/content/filterFields.js): the bestiary
// browser (encounter builder, reinforcements, the map's picker) and the
// compendium's monster catalog both filter and draw them from here.
export const MONSTER_FILTER_FIELDS = Object.freeze([
  {
    kind: 'select', key: 'crFrom', label: 'CR from', single: true, options: CR_OPTIONS,
    match: (monster, cr) => monsterCrValue(monster) >= crNumber(cr),
  },
  {
    kind: 'select', key: 'crTo', label: 'CR to', single: true, options: CR_OPTIONS,
    match: (monster, cr) => monsterCrValue(monster) <= crNumber(cr),
  },
  { kind: 'select', key: 'type', label: 'Type', options: CREATURE_TYPE_OPTIONS, valueOf: monsterTypeKey },
  { kind: 'select', key: 'size', label: 'Size', options: MONSTER_SIZES, valueOf: monsterSizes },
]);

// The bestiary browser's filters with nothing chosen: the search, the sources
// switched on (none: every source) and the fields.
export function monsterFilterDefaults() {
  return { search: '', sources: [], ...fieldDefaults(MONSTER_FILTER_FIELDS) };
}

// Whether anything is chosen: a search, a book switched off, a field.
export function monsterFiltering(filters = {}) {
  return Boolean(String(filters.search || '').trim())
    || normalizeSourceFilter(filters.sources).size > 0
    || countChosenValues(MONSTER_FILTER_FIELDS, filters) > 0;
}

export function filterMonsters(monsters, filters = {}) {
  const list = Array.isArray(monsters) ? monsters : [];
  const activeSources = normalizeSourceFilter(filters.sources);
  const tests = fieldTests(MONSTER_FILTER_FIELDS, filters);

  return list.filter((monster) => {
    if (activeSources.size && !activeSources.has(monster.source)) return false;
    if (!matchesQuery(filters.search, monster.name)) return false;
    return tests.every((test) => test(monster));
  });
}
