// A character's portrait: where its bytes live, and how a browser keeps a copy
// so it does not ask the bucket again.
//
// The path carries a stamp, so the bytes at any given address never change.
// That is what makes caching safe at every level — the browser's, and the copy
// kept here — and it is the same rule the map's images follow.
//
// The copy is the picture itself, not a link to it: a portrait is a few
// kilobytes after downscaling, and keeping it means a sheet, a battle map and an
// encounter can all show it with no network at all.

export const PORTRAIT_SIZE = 256;
// What the picker will accept before it is downscaled. Generous, because it is
// about refusing a video or a RAW file rather than about the final size — that
// is decided by the downscale, not by the upload.
export const PORTRAIT_MAX_BYTES = 12 * 1024 * 1024;
export const PORTRAIT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'];

const CACHE_PREFIX = 'gb:portrait:';
// localStorage is a few megabytes for the whole origin, shared with every
// character, board and encounter the app keeps. Portraits get a slice of it.
const CACHE_BUDGET = 24;

export function portraitPath(ownerId, characterId, stamp = Date.now()) {
  if (!ownerId || !characterId) return null;
  // Owner first: storage policies are written against the first folder, which
  // is what stops one player from writing over another's portrait.
  return `${ownerId}/${characterId}-${stamp}.webp`;
}

export function isSupportedPortrait(file) {
  if (!file) return false;
  if (!PORTRAIT_TYPES.includes(file.type)) return false;
  return file.size > 0 && file.size <= PORTRAIT_MAX_BYTES;
}

function defaultStore() {
  try {
    return globalThis.localStorage || null;
  } catch {
    // Storage can be denied outright; a portrait is not worth an exception.
    return null;
  }
}

export function readPortrait(path, store = defaultStore()) {
  if (!path || !store) return null;
  try {
    const raw = store.getItem(CACHE_PREFIX + path);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    return typeof entry?.url === 'string' ? entry.url : null;
  } catch {
    return null;
  }
}

export function writePortrait(path, url, store = defaultStore()) {
  if (!path || !url || !store) return false;
  const entry = JSON.stringify({ url, at: Date.now() });
  try {
    store.setItem(CACHE_PREFIX + path, entry);
    prunePortraits(store);
    return true;
  } catch {
    // Out of room, which the whole origin shares — so the budget is not what is
    // in the way and pruning to it would free nothing. Halve what is actually
    // there and try once more. Failing after that is not an error: the picture
    // is still in the bucket, it just has to be fetched again next time.
    prunePortraits(store, Math.floor(listPortraits(store).length / 2));
    try {
      store.setItem(CACHE_PREFIX + path, entry);
      return true;
    } catch {
      return false;
    }
  }
}

export function forgetPortrait(path, store = defaultStore()) {
  if (!path || !store) return;
  try {
    store.removeItem(CACHE_PREFIX + path);
  } catch {}
}

// Every portrait in the store, oldest first.
function listPortraits(store) {
  const entries = [];
  try {
    for (let index = 0; index < store.length; index += 1) {
      const key = store.key(index);
      if (!key?.startsWith(CACHE_PREFIX)) continue;
      let at = 0;
      try {
        at = JSON.parse(store.getItem(key))?.at || 0;
      } catch {
        // Unreadable entries are the first to go.
      }
      entries.push({ key, at });
    }
  } catch {
    return [];
  }
  return entries.sort((a, b) => a.at - b.at);
}

// Down to the budget, oldest first. Called after every write, so the cache
// cannot grow past it however long a session runs.
export function prunePortraits(store = defaultStore(), budget = CACHE_BUDGET) {
  if (!store) return 0;
  const entries = listPortraits(store);
  if (entries.length <= budget) return 0;

  const doomed = entries.slice(0, entries.length - budget);
  try {
    for (const entry of doomed) store.removeItem(entry.key);
  } catch {
    return 0;
  }
  return doomed.length;
}
