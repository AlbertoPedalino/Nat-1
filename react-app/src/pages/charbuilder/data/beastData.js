import { BEAST_FILES } from '../constants.js';
import { normalizeBeast } from '../../../shared/character/forms/beasts.js';
import { loadGameData } from '../../../shared/content/gameData.js';

// Wild Shape beast forms. Loads the configured bestiary files, keeps only beast
// statblocks, normalizes to the compact sheet shape, and de-dupes by name+source
// (highest-detail record wins). Cached per-file by loadGameData like every other load.
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
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
}
