// Where a health command takes its starting state from (commandCharacterVitals).
//
// 'digest' is the normal path: the caller holds the character digest and a base
// max HP derived for that digest's `hpBasis`, so the command is computed and
// committed with no read at all. Anything else names why the rare legacy path
// (read the digest and the whole sheet, derive the base max) is needed. Never
// a base max that belongs to another basis: that is how a stale maximum would
// clamp a heal.
//
// Pure, so every caller's tests can check they are on the normal path.

export function healthCommandRoute(charId, command, { digest = null, base = null } = {}) {
  if (!digest || String(digest.characterId) !== String(charId)) return 'no-digest';
  if (typeof digest.hpBasis !== 'string' || !Number.isFinite(Number(digest.rowRevision))) return 'no-digest';
  if (!base || !Number.isFinite(base.baseMax)) return 'no-base-max';
  if (base.hpBasis !== digest.hpBasis) return 'basis-mismatch';
  // Only the sheet sends a long rest, and it says the exhaustion level it
  // leads to; without it the rule needs the sheet's current level.
  if (command?.type === 'longRest' && command.exhaustionLevel == null) return 'needs-sheet';
  return 'digest';
}
