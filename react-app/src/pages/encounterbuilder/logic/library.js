// A fight is reachable only through the library card of the encounter it was
// launched from: `mergeLibrary` walks encounters and attaches their fight, so a
// fight with no `encounterId` (launched from a draft that was never saved) has
// no card to appear on. Both the Library view and the close-encounter guard
// read that rule from here so they cannot drift apart.

export function toTime(value) {
  if (typeof value === 'number') return value;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

export function fightForEncounter(fights, encounterId) {
  if (encounterId == null) return null;
  return (fights || []).find((fight) => fight.encounterId === encounterId) || null;
}

export function isFightResumable(library, fight) {
  if (fight?.encounterId == null) return false;
  return (library || []).some((entry) => entry.id === fight.encounterId);
}

// Each library encounter is one card, optionally carrying its in-progress fight.
export function mergeLibrary(encounters, fights) {
  return (encounters || [])
    .map((enc) => {
      const linkedFight = fightForEncounter(fights, enc.id);
      return { enc, fight: linkedFight, sortKey: Math.max(toTime(enc.createdAt), linkedFight?.savedAt || 0) };
    })
    .sort((a, b) => b.sortKey - a.sortKey);
}
