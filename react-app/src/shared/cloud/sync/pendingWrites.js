import { asArray } from '../../lists.js';
// This screen's own writes still in flight, counted per key (a piece id, a
// mark id, a scene field). While a key has one, realtime echoes and recovery
// reads for it are held back, so an older row never undoes the newer local
// change; the key is free again when its last write finishes.
//
// `begin(keys)` takes one key or a list and returns `finish()`, which returns
// the keys whose last write this was (once: a second call does nothing).
export function createPendingWrites() {
  const counts = new Map();
  return {
    begin(keys) {
      const list = asArray(keys);
      for (const key of list) counts.set(key, (counts.get(key) || 0) + 1);
      let finished = false;
      return () => {
        if (finished) return [];
        finished = true;
        const settled = [];
        for (const key of list) {
          const count = counts.get(key) || 0;
          if (count <= 1) {
            counts.delete(key);
            settled.push(key);
          } else {
            counts.set(key, count - 1);
          }
        }
        return settled;
      };
    },
    has: (key) => counts.has(key),
    keys: () => new Set(counts.keys()),
    get size() { return counts.size; },
  };
}
