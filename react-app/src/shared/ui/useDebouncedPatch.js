import { useMemo, useRef } from 'react';
import { useDebouncedCallback } from './useDebouncedCallback.js';

// How long typing in a menu field waits before it is written: a row version
// and a realtime event per keystroke would be one per character.
export const TYPING_SAVE_DELAY = 400;

// Changes gathered while the user types, handed over together once the typing
// stops: `add(patch)` merges into what is waiting and restarts the wait, and
// `onFlush(patch)` then gets all of it. `take()` hands the waiting patch to the
// caller now instead (a save that should carry it), `cancel()` drops it, and
// `pending()` says what is waiting (a field still being typed keeps its value).
// A pending flush is dropped on unmount.
export function useDebouncedPatch(onFlush, delay = TYPING_SAVE_DELAY) {
  const pendingRef = useRef({});
  const later = useDebouncedCallback(() => {
    const patch = pendingRef.current;
    pendingRef.current = {};
    onFlush(patch);
  }, delay);

  return useMemo(() => ({
    add(patch) {
      pendingRef.current = { ...pendingRef.current, ...patch };
      later();
    },
    take() {
      later.cancel();
      const patch = pendingRef.current;
      pendingRef.current = {};
      return patch;
    },
    cancel() {
      later.cancel();
      pendingRef.current = {};
    },
    pending: () => pendingRef.current,
  }), [later]);
}
