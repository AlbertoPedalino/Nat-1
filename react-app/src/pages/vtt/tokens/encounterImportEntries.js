import { dedupeFightsByEncounter, isFightSuperseded, mergeLibrary } from '../../../shared/encounter/library.js';

// What there is to import is the library, not the fights: an encounter that
// was saved but never launched is still an encounter the GM wants on the
// board, and it is launched on the way out. Each card carries at most one
// fight — the newest, once the older ones of the same encounter are dropped —
// and the quest is written on the card rather than on the fight.
//
// A fight launched before its card was last saved is left out: it holds the
// creatures of the old version, and the card is launched again instead.
export function buildImportEntries(fights, library) {
  const cardsById = new Map((library || []).map((enc) => [String(enc?.id), enc]));
  const current = dedupeFightsByEncounter(fights.filter((fight) => (
    fight.encounterId == null || !isFightSuperseded(cardsById.get(String(fight.encounterId)), fight)
  )));
  const cards = mergeLibrary(library, current).map(({ enc, fight }) => ({
    key: `e:${enc.id}`,
    encounterId: enc.id,
    fight,
    name: enc.name || 'Encounter',
    quest: String(enc.quest || '').trim(),
    card: enc,
  }));
  // A fight whose card this device never got — a room sent over from the map,
  // and the library is still a blob one browser holds. It is offered under the
  // copy of the card the fight carries, or under its own name.
  const known = new Set((library || []).map((enc) => String(enc?.id)));
  const orphans = current
    .filter((fight) => fight.encounterId == null || !known.has(String(fight.encounterId)))
    .map((fight) => ({
      key: `f:${fight.id}`,
      encounterId: fight.encounterId ?? null,
      fight,
      name: fight.name || fight.encounter?.name || 'Fight',
      quest: String(fight.encounter?.quest || '').trim(),
      card: fight.encounter || null,
    }));
  return [...cards, ...orphans];
}
