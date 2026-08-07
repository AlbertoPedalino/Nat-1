// What an open builder tab has not heard about.
//
// The battle map writes into this instance's storage directly: a dungeon room
// sent over becomes a saved encounter and a fight, and hit points edited on a
// piece are written into whichever fight that piece came from. A tab that is
// already open knows none of it, and since it persists its own arrays whole,
// what it does not know it deletes on the next save.
//
// Pure, so the rule for "new or newer" is testable without a browser.

export function externalDelta(persisted, held = {}) {
  const heldFights = held.fights || [];
  const mine = new Map(heldFights.map((fight) => [String(fight.id), fight]));
  const activeKey = held.activeFightId == null ? null : String(held.activeFightId);

  const fights = (persisted?.fightsData?.items || []).filter((entry) => {
    const key = String(entry.id);
    const ours = mine.get(key);
    if (!ours) return true;
    // The fight in play is applied through `resumeFight` instead: two mechanisms
    // rewriting it would take turns undoing each other.
    if (key === activeKey) return false;
    return Number(entry.savedAt || 0) > Number(ours.savedAt || 0);
  });

  const knownEncounters = new Set((held.library || []).map((entry) => String(entry.id)));
  const library = (persisted?.library || [])
    .filter((entry) => !knownEncounters.has(String(entry.id)));

  return { fights, library };
}
