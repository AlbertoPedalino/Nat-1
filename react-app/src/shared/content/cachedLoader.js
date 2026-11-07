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
