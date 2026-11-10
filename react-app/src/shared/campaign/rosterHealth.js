import { commandCharacterVitals } from '../cloud/api/healthCommands.js';

// A health command from what a view follows of its characters: the digests and
// base maxima keyed by character id (the battle map's roster, the builder's
// sync), so nothing is read before the command is committed.
export function commandFromRoster(charId, command, { digests, baseMax } = {}) {
  const id = String(charId);
  return commandCharacterVitals(charId, command, {
    digest: digests?.get(id) ?? null,
    base: baseMax?.get(id) ?? null,
  });
}
