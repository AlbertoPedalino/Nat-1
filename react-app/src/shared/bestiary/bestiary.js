import { RAW_ALLOWED_SOURCES } from './bestiaryConstants.js';
import { sourceLabel } from '../content/sourcePriority.js';
import { loadGameData } from '../content/gameData.js';
import { monsterKey } from './monsterUtils.js';
import { byName } from '../lists.js';
import { cachedLoader } from '../content/cachedLoader.js';
import { resolveCopyRecords } from '../content/copyRecords.js';

function legendaryGroupKey(name, source) {
  return `${source || ''}__${name || ''}`;
}

export function resolveLegendaryGroups(data) {
  const groups = resolveCopyRecords(data?.legendaryGroup || []);
  return new Map(groups.map((group) => [legendaryGroupKey(group.name, group.source), group]));
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

// The bestiary is built once per page: the map's editor, its creature picker
// and its encounter import (and the compendium) share one database instead of
// each flattening, filtering and sorting every monster again. A failed build is
// forgotten, so the next caller tries again.
export const loadMonsterDatabase = cachedLoader(() => buildMonsterDatabase());

async function buildMonsterDatabase() {
  const { index, availableSources, legendaryGroups } = await loadBestiaryIndex();
  const loaded = await Promise.all(availableSources.map(async (source) => {
    const file = index[source];
    const path = String(file || '').startsWith('bestiary/') ? file : `bestiary/${file}`;
    const data = await loadGameData(path);
    return (data.monster || []).filter(isBestiaryStatBlock);
  }));
  const seen = new Set();
  const statBlocks = loaded.flat().filter((monster) => {
    const key = monsterKey(monster);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort(byName);
  return {
    monsters: statBlocks.filter(isEncounterMonster),
    statBlocks,
    availableSources,
    legendaryGroups,
    sourceOptions: availableSources.map((source) => ({
      source,
      label: sourceLabel(source),
    })),
  };
}

// Every stat block of the supported books: the compendium shows them all.
export function isBestiaryStatBlock(monster) {
  return Boolean(monster && RAW_ALLOWED_SOURCES.includes(monster.source));
}

// Summoned-creature templates and Wild Shape forms (Bear Form, Cat Form)
// intentionally have no Challenge Rating. They live in bestiary files because
// 5etools renders them as statblocks, but they are not independent encounter
// monsters and must not silently become CR 0 creatures.
export function isEncounterMonster(monster) {
  return Boolean(
    isBestiaryStatBlock(monster)
    && monster.cr != null
    && String(typeof monster.cr === 'object' ? monster.cr.cr : monster.cr).trim(),
  );
}
