import { useEffect, useState } from 'react';
import { loadConditions } from '../../charbuilder/logic/dataLoaders.js';

// XPHB condition descriptions, keyed by condition key. Every combatant card asks
// for these, so the fetch is shared: `loadConditions` reads through the module
// level JSON cache in dataLoaders, meaning many subscribers still cost one
// request. A failed load just leaves the map empty — pills stay assignable and
// simply have nothing to expand.

let cached = null;

export function useConditionEntries() {
  const [entries, setEntries] = useState(cached || EMPTY);

  useEffect(() => {
    if (cached) return undefined;
    let alive = true;
    loadConditions()
      .then((loaded) => {
        cached = loaded || EMPTY;
        if (alive) setEntries(cached);
      })
      .catch(() => {
        if (alive) setEntries(EMPTY);
      });
    return () => { alive = false; };
  }, []);

  return entries;
}

const EMPTY = {};
