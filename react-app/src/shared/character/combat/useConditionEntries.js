import { useEffect, useState } from 'react';
import { loadConditions } from '../../content/catalogs/rulesData.js';
import { cachedLoader } from '../../content/cachedLoader.js';

// XPHB condition descriptions, keyed by condition key: one load per tab for
// every combatant card, token pill and sheet (sheetLoad.js). A failed load is
// evicted, so a later caller retries; until then the map is empty — pills stay
// assignable and simply have nothing to expand.
export const loadConditionEntries = cachedLoader(loadConditions);

// The last answer, so a card mounted after the load starts with it.
let loaded = null;

export function useConditionEntries() {
  const [entries, setEntries] = useState(loaded || EMPTY);

  useEffect(() => {
    if (loaded) return undefined;
    let alive = true;
    loadConditionEntries()
      .then((result) => {
        loaded = result || EMPTY;
        if (alive) setEntries(loaded);
      })
      .catch(() => {
        if (alive) setEntries(EMPTY);
      });
    return () => { alive = false; };
  }, []);

  return entries;
}

const EMPTY = {};
