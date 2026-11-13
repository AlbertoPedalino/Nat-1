// A loader that runs once per tab and shares its promise with every caller.
// A failure is not kept: a rejection, or a result `failed(result)` calls a
// failure (a catalog with files missing), is forgotten so the next call tries
// again. `reset()` forgets the result on purpose.
export function cachedLoader(load, { failed = () => false } = {}) {
  let promise = null;
  const run = () => {
    if (promise) return promise;
    const pending = Promise.resolve().then(load);
    promise = pending;
    pending.then(
      (result) => { if (failed(result) && promise === pending) promise = null; },
      () => { if (promise === pending) promise = null; },
    );
    return pending;
  };
  run.reset = () => { promise = null; };
  return run;
}

// The same, one loader per key: `load(key)` runs once for each key, and a key
// whose load failed is tried again (a downloaded file by URL, a roll table, an
// adapter module by path).
export function cachedLoaderByKey(load, options) {
  const loaders = new Map();
  return (key) => {
    if (!loaders.has(key)) loaders.set(key, cachedLoader(() => load(key), options));
    return loaders.get(key)();
  };
}

// A JSON file fetched at most once per tab and shared by every reader, fetched
// again after a failure: the 5etools data (gameData.js) and the map's game
// drawings (pages/vtt/objects/gameDrawings.js).
export const fetchJsonOnce = cachedLoaderByKey(async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
});
