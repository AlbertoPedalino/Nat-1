import { BEAST_FILES } from './catalogFiles.js';
import { featureFormRequirement, normalizeBeast } from '../../character/forms/beasts.js';
import { BEAST_ALLOWED_SOURCES, isAllowedSource } from '../sourcePriority.js';
import { loadGameData } from '../gameData.js';
import { byName } from '../../lists.js';

// Wild Shape beast forms. Loads the configured bestiary files, keeps only beast
// statblocks, normalizes to the compact sheet shape, and de-dupes by name+source
// (highest-detail record wins). Cached per-file by loadGameData like every other load.
// Wild Shape forms that are no beast but a feature's (Bear Form, Cat Form:
// "Requires Circle Forms"), raw, to be resolved for the druid who takes them.
export async function loadFeatureForms() {
  const results = await Promise.allSettled(BEAST_FILES.map((file) => loadGameData(file)));
  return results
    .flatMap((r) => (r.status === 'fulfilled' ? (r.value?.monster || []) : []))
    .filter((record) => isAllowedSource(record?.source, BEAST_ALLOWED_SOURCES))
    .map((record) => ({ name: record.name, source: record.source, requiresFeature: featureFormRequirement(record), record }))
    .filter((form) => form.requiresFeature)
    .sort(byName);
}

export async function loadBeasts() {
  const results = await Promise.allSettled(BEAST_FILES.map((file) => loadGameData(file)));
  const raw = results.flatMap((r) => (r.status === 'fulfilled' ? (r.value?.monster || []) : []));
  const byKey = new Map();
  raw.forEach((record) => {
    const beast = normalizeBeast(record);
    if (!beast) return;
    const key = `${beast.name.toLowerCase()}|${beast.source.toLowerCase()}`;
    if (!byKey.has(key)) byKey.set(key, beast);
  });
  return [...byKey.values()].sort(byName);
}
