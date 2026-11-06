import { RAW_ALLOWED_SOURCES, SOURCE_LABELS } from '../state/constants.js';
import { loadGameData } from '../../../shared/content/gameData.js';
import { monsterKey } from './monsterUtils.js';

function legendaryGroupKey(name, source) {
  return `${source || ''}__${name || ''}`;
}

export function resolveLegendaryGroups(data) {
  const rawGroups = new Map((data?.legendaryGroup || []).map((group) => [
    legendaryGroupKey(group.name, group.source),
    group,
  ]));
  const resolved = new Map();

  function resolve(group, visited = new Set()) {
    if (!group) return null;
    const key = legendaryGroupKey(group.name, group.source);
    if (resolved.has(key)) return resolved.get(key);
    if (visited.has(key)) return group;

    const copy = group._copy;
    if (!copy?.name || !copy?.source) {
      resolved.set(key, group);
      return group;
    }

    const nextVisited = new Set(visited);
    nextVisited.add(key);
    const base = resolve(rawGroups.get(legendaryGroupKey(copy.name, copy.source)), nextVisited);
    const merged = { ...(base || {}), ...group };
    delete merged._copy;

    for (const [prop, mod] of Object.entries(copy._mod || {})) {
      if (!mod || !Array.isArray(mod.items)) continue;
      const current = Array.isArray(merged[prop]) ? merged[prop] : [];
      if (mod.mode === 'prependArr') merged[prop] = [...mod.items, ...current];
      else if (mod.mode === 'appendArr') merged[prop] = [...current, ...mod.items];
      else if (mod.mode === 'replaceArr') merged[prop] = [...mod.items];
    }

    resolved.set(key, merged);
    return merged;
  }

  rawGroups.forEach((group) => resolve(group));
  return resolved;
}

export function getLegendaryGroup(monster, legendaryGroups) {
  const ref = monster?.legendaryGroup;
  if (!ref?.name || !ref?.source || !legendaryGroups) return null;
  return legendaryGroups.get(legendaryGroupKey(ref.name, ref.source)) || null;
}

export async function loadBestiaryIndex() {
  const [index, legendaryResult] = await Promise.all([
    loadGameData('bestiary/index.json'),
    loadGameData('bestiary/legendarygroups.json').then(resolveLegendaryGroups).catch(() => new Map()),
  ]);
  const availableSources = RAW_ALLOWED_SOURCES.filter((source) => index?.[source]);
  return { index, availableSources, legendaryGroups: legendaryResult };
}

export async function loadMonsterDatabase() {
  const { index, availableSources, legendaryGroups } = await loadBestiaryIndex();
  const loaded = await Promise.all(availableSources.map(async (source) => {
    const file = index[source];
    const path = String(file || '').startsWith('bestiary/') ? file : `bestiary/${file}`;
    const data = await loadGameData(path);
    return (data.monster || []).filter(isEncounterMonster);
  }));
  const seen = new Set();
  const monsters = loaded.flat().filter((monster) => {
    const key = monsterKey(monster);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => a.name.localeCompare(b.name));
  return {
    monsters,
    availableSources,
    legendaryGroups,
    sourceOptions: availableSources.map((source) => ({
      source,
      label: SOURCE_LABELS[source] || source,
    })),
  };
}

// Summoned-creature templates intentionally have no Challenge Rating. They live
// in bestiary files because 5etools renders them as statblocks, but they are not
// independent encounter monsters and must not silently become CR 0 creatures.
export function isEncounterMonster(monster) {
  return Boolean(
    monster
    && RAW_ALLOWED_SOURCES.includes(monster.source)
    && monster.cr != null
    && String(typeof monster.cr === 'object' ? monster.cr.cr : monster.cr).trim(),
  );
}
