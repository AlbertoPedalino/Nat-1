import { useCallback, useRef } from 'react';
import { commandFromRoster } from '../../../shared/campaign/rosterHealth.js';

// A stable health command for a character's piece. It starts from the digest
// the map follows and the base max HP derived for its basis
// (commandFromRoster), read through a ref so the command never goes stale
// nor changes identity when the roster refreshes.
export function useCharacterHealth(digests, baseMax) {
  const rosterVitalsRef = useRef(null);
  rosterVitalsRef.current = { digests, baseMax };
  return useCallback((characterId, command) => commandFromRoster(characterId, command, rosterVitalsRef.current), []);
}
