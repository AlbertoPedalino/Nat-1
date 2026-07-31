import { useEffect, useState } from 'react';
import { loadBeasts } from '../../charbuilder/logic/dataLoaders.js';

// Loads the normalized beast DB for a sheet panel (Wild Shape / Wild Companion).
// loadBeasts is cached per-file in dataLoaders, so multiple callers share one
// fetch; this hook just manages the async-to-state plus the unmount guard, which
// both beast panels would otherwise duplicate.
export function useBeastsDb() {
  const [beasts, setBeasts] = useState([]);
  useEffect(() => {
    let alive = true;
    loadBeasts().then((db) => { if (alive) setBeasts(db || []); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return beasts;
}
