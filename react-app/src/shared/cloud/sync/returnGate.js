// A tab coming back fires `focus` and `visibilitychange` together (and a
// phone often adds a second focus). Each one used to start its own recovery
// read; this lets the first through and drops the rest for a few seconds.
//
// Only for "the user came back" signals: reconnects, `online` and the safety
// timer keep their own triggers.

export const RETURN_COALESCE_MS = 3_000;

export function coalesceReturns(run, { windowMs = RETURN_COALESCE_MS, now = () => Date.now() } = {}) {
  let last = -Infinity;
  return (...args) => {
    const at = now();
    if (at - last < windowMs) return;
    last = at;
    run(...args);
  };
}
