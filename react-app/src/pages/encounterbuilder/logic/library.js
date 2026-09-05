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

export function listQuestNames(encounters) {
  return [...new Set(
    (encounters || []).map((entry) => String(entry?.quest || '').trim()).filter(Boolean),
  )].sort((a, b) => a.localeCompare(b));
}

export function groupLibraryByQuest(items) {
  const groups = new Map();
  for (const item of items || []) {
    const quest = String(item?.enc?.quest || '').trim();
    if (!groups.has(quest)) groups.set(quest, []);
    groups.get(quest).push(item);
  }
  return [...groups.entries()]
    .map(([quest, entries]) => ({ quest, items: entries }))
    .sort((a, b) => {
      if (!a.quest) return 1;
      if (!b.quest) return -1;
      return a.quest.localeCompare(b.quest);
    });
}
