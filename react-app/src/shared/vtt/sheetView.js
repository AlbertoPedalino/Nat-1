export function sheetChoicesForRole(roster, {
  isGm = false, ownedCharacterIds = [],
} = {}) {
  const owned = new Set(ownedCharacterIds || []);
  return (roster || []).filter((entry) => (
    entry?.characterId && (isGm || owned.has(entry.characterId))
  ));
}
