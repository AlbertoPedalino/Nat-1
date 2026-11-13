// Work done at most once per key and shared by every caller: the promise is
// kept by key, and one that fails is forgotten so the next call tries again.
// A downloaded file (fetchJsonOnce), a parsed roll table (rollTables.js), an
// adapter module (adapters/index.js): each keeps its own `cache` Map.
export function rememberPromise(cache, key, make) {
  if (!cache.has(key)) {
    const promise = Promise.resolve().then(make);
    promise.catch(() => cache.delete(key));
    cache.set(key, promise);
  }
  return cache.get(key);
}
