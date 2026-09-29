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
// A fight launched before the card was last saved is not that fight: it holds
// the creatures of the old version (isFightSuperseded, below).
export function mergeLibrary(encounters, fights) {
  return (encounters || [])
    .map((enc) => {
      const linkedFight = fightForEncounter(
        (fights || []).filter((fight) => !isFightSuperseded(enc, fight)),
        enc.id,
      );
      return { enc, fight: linkedFight, sortKey: Math.max(toTime(enc.updatedAt || enc.createdAt), linkedFight?.savedAt || 0) };
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

// One fight per encounter, which is the rule the builder already keeps for
// itself: launching an encounter supersedes the fight of the previous launch.
// A fight arriving from anywhere else never went through that launch — a row
// written by another device, a room sent over by the battle map — so without
// this the fight of an older launch comes back and stands beside the current
// one, and the same encounter is offered twice over. The newest snapshot wins,
// and the fight in play is never dropped: the reducer is running it.
export function dedupeFightsByEncounter(fights, activeFightId = null) {
  const activeKey = activeFightId == null ? null : String(activeFightId);
  const encounterKey = (fight) => (fight?.encounterId == null ? null : String(fight.encounterId));
  const keep = new Map();
  for (const fight of fights || []) {
    const key = encounterKey(fight);
    if (key == null) continue;
    const held = keep.get(key);
    if (!held) {
      keep.set(key, fight);
      continue;
    }
    if (String(held.id) === activeKey) continue;
    if (String(fight.id) === activeKey || toTime(fight.savedAt) > toTime(held.savedAt)) {
      keep.set(key, fight);
    }
  }
  // A fight launched from a draft that was never saved has no encounter to be
  // the second of, so it is always its own.
  return (fights || []).filter((fight) => {
    const key = encounterKey(fight);
    return key == null || keep.get(key) === fight;
  });
}

// When a saved encounter was last written, however it was spelled: the builder
// stamps ISO strings, and a fight stamps a number.
export function cardTime(card) {
  return Math.max(toTime(card?.updatedAt), toTime(card?.createdAt));
}

// A fight is a snapshot of the card as it was when launched, and saving the card
// again does not touch it. So a GM who changed an encounter after its fight was
// launched was handed the old creatures by the battle map, under the new name.
// Saving over an encounter is the GM saying which version they mean: a fight
// launched before that save is superseded, and the card is launched afresh.
//
// When the fight was launched: the copy of the card it carries says so exactly;
// otherwise its id, which the builder mints with `Date.now()` at launch. A fight
// with neither is not second-guessed.
function fightLaunchTime(fight) {
  const copy = cardTime(fight?.encounter);
  if (copy) return copy;
  return typeof fight?.id === 'number' && Number.isSafeInteger(fight.id) ? fight.id : null;
}

export function isFightSuperseded(card, fight) {
  if (!card || !fight) return false;
  const launched = fightLaunchTime(fight);
  return launched != null && cardTime(card) > launched;
}

// Repair duplicate cards already in storage as well as incoming batches.
export function dedupeLibraryById(cards) {
  const latest = new Map();
  for (const card of Array.isArray(cards) ? cards : []) {
    if (card?.id == null) continue;
    const key = String(card.id);
    const held = latest.get(key);
    if (!held || cardTime(card) >= cardTime(held)) latest.set(key, card);
  }
  return [...latest.values()];
}
