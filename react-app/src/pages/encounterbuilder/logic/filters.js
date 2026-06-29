import { getCR, getType } from './monsterUtils.js';

export function normalizeSourceFilter(sources) {
  return new Set((Array.isArray(sources) ? sources : []).map((source) => String(source || '').trim()).filter(Boolean));
}

export function filterMonsters(monsters, filters = {}) {
  const list = Array.isArray(monsters) ? monsters : [];
  const search = String(filters.search || '').toLowerCase().trim();
  const cr = String(filters.cr || '').trim();
  const type = String(filters.type || '').toLowerCase().trim();
  const activeSources = normalizeSourceFilter(filters.sources);

  return list.filter((monster) => {
    if (activeSources.size && !activeSources.has(monster.source)) return false;
    if (search && !String(monster.name || '').toLowerCase().includes(search)) return false;
    if (cr && getCR(monster.cr) !== cr) return false;
    if (type && getType(monster.type).toLowerCase() !== type) return false;
    return true;
  });
}

export function filterQuickMonsters(monsters, filters = {}) {
  const list = Array.isArray(monsters) ? monsters : [];
  const search = String(filters.search || '').toLowerCase().trim();
  const cr = String(filters.cr || '').trim();
  const type = String(filters.type || '').toLowerCase().trim();

  return list.filter((monster) => {
    if (search && !String(monster.name || '').toLowerCase().includes(search)) return false;
    if (cr && getCR(monster.cr) !== cr) return false;
    if (type && !getType(monster.type).toLowerCase().includes(type)) return false;
    return true;
  });
}
