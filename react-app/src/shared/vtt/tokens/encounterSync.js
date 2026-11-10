// The reference an imported piece carries to its combatant:
// `instanceId:fightId:combatantId`. Edits on the map go to that combatant in
// its fight row (fightVitals.js, the one authority for enemy vitals); a
// character's piece has none — its vitals belong to the sheet.

const SEPARATOR = ':';

export function makeSourceRef(instanceId, fightId, combatantId) {
  if (!instanceId || !fightId || combatantId == null) return null;
  // Ids come from our own storage, but a colon in one of them would silently
  // shift every field after it.
  const parts = [instanceId, fightId, combatantId].map((part) => String(part));
  return parts.some((part) => part.includes(SEPARATOR)) ? null : parts.join(SEPARATOR);
}

export function parseSourceRef(ref) {
  const parts = String(ref || '').split(SEPARATOR);
  if (parts.length !== 3 || parts.some((part) => !part)) return null;
  return { instanceId: parts[0], fightId: parts[1], combatantId: parts[2] };
}
