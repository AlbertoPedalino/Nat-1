import { useCallback, useRef } from 'react';
import { commandCharacterVitals } from '../../../shared/cloud/api/healthCommands.js';

// A stable health command for a character's piece. It starts from the digest
// the map follows and the base max HP derived for its basis
// (commandCharacterVitals), read through a ref so the command never goes stale
// nor changes identity when the roster refreshes.
export function useCharacterHealth(digests, baseMax) {
  const rosterVitalsRef = useRef(null);
  rosterVitalsRef.current = { digests, baseMax };
  return useCallback((characterId, command) => {
    const id = String(characterId);
    const { digests: held, baseMax: base } = rosterVitalsRef.current;
    return commandCharacterVitals(characterId, command, { digest: held.get(id) ?? null, base: base.get(id) ?? null });
  }, []);
}
