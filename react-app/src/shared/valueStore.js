import { useSyncExternalStore } from 'react';

// One value kept outside React's state, so writing it redraws only the
// components that read it (useStoreValue), not the component that owns it and
// everything under it. For a value that changes often and is shown in one
// corner of a big page: a sheet's dice toast and roll log, which every roll —
// this player's or the campaign's — rewrites.
//
// `set` takes the next value or an updater, as a state setter does.
export function createValueStore(initial) {
  let value = initial;
  const listeners = new Set();
  return {
    get: () => value,
    set(next) {
      const resolved = typeof next === 'function' ? next(value) : next;
      if (Object.is(resolved, value)) return;
      value = resolved;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

// The store's current value, redrawing the component when it changes.
export function useStoreValue(store) {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
