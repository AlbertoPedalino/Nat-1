import { getType } from './monsterUtils.js';
import { crKey, crNumber } from './challengeRating.js';
import { matchesQuery } from '../content/searchText.js';

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

export function filterMonsters(monsters, filters = {}) {
  const list = Array.isArray(monsters) ? monsters : [];
  const cr = String(filters.cr || '').trim();
  const type = String(filters.type || '').toLowerCase().trim();
  const activeSources = normalizeSourceFilter(filters.sources);

  return list.filter((monster) => {
    if (activeSources.size && !activeSources.has(monster.source)) return false;
    if (!matchesQuery(filters.search, monster.name)) return false;
    if (cr && crKey(monster.cr) !== cr) return false;
    if (type && monsterTypeKey(monster) !== type) return false;
    return true;
  });
}
