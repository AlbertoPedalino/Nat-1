import { getType } from './monsterUtils.js';
import { crKey } from './challengeRating.js';
import { matchesQuery } from '../content/searchText.js';

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
    if (type && getType(monster.type).toLowerCase() !== type) return false;
    return true;
  });
}
