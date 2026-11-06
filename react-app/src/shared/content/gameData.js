// The 5etools data and images the app reads, from one place.
//
// Every JSON file is downloaded at most once per session and shared by every
// reader (builder, sheet, compendium, bestiary, weapon masteries, summoned
// creatures): the promise is cached by path, and a failed download is
// forgotten so the next call tries again.

export const GAME_DATA_BASE = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/';
export const GAME_IMAGE_BASE = 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/';
export const FALLBACK_MONSTER_TOKEN = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-img/main/bestiary/tokens/XMM/Skeleton.webp';

const cache = new Map();

// `path` is relative to the data folder: 'races.json', 'class/class-wizard.json'.
export function loadGameData(path) {
  const key = String(path || '').replace(/^\/+/, '');
  const cached = cache.get(key);
  if (cached) return cached;
  const promise = (async () => {
    const response = await fetch(GAME_DATA_BASE + key);
    if (!response.ok) throw new Error(`${key}: HTTP ${response.status}`);
    return response.json();
  })();
  promise.catch(() => cache.delete(key));
  cache.set(key, promise);
  return promise;
}
