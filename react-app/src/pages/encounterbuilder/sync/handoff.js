// Sending an encounter to the builder from somewhere else in the app.
//
// The battle map rolls a dungeon and buys creatures for its rooms; those
// creatures are worth nothing until something is tracking their hit points. So
// the room is written into an Encounter Builder instance as a saved encounter
// and a fight — the same two records the builder writes when a GM launches one
// by hand — and the map then drops pieces that carry that fight's own reference.
// From the first round they are the same creatures on both screens.
//
// Everything here goes through the builder's own storage functions rather than
// touching its keys, so a change to how it stores things changes this too.

import { buildCombat, restoreFight, snapshotFight } from '../combat/combat.js';
import { importableCombatants } from '../../../shared/vtt/tokens/encounterImport.js';
import {
  makeSavedEncounter, persistFights, persistLibrary, readPersistedInstance,
} from '../state/storage.js';
import { getInstance } from '../../../shared/instances/instanceStore.js';
import { hydrateEncounterItems } from '../bestiary/monsterUtils.js';

// The builder's own shape for a line of an encounter: a creature and how many.
function encounterItem(monster, count) {
  return {
    id: `dungeon-${monster.name}-${count}`,
    name: monster.name,
    source: monster.source || '',
    cr: monster.cr,
    xp: monster.xp,
    qty: count,
    monsterData: monster,
  };
}

export function encounterFromGroups(groups) {
  return (groups || [])
    .filter((group) => group?.monster?.name && group.count > 0)
    .map((group) => encounterItem(group.monster, group.count));
}

// A party member linked to a sheet wears what the sheet says.
//
// The builder's party keeps a copy of the colour and the portrait, taken the day
// the character was imported. The sheet is where either is actually edited, so
// that copy goes stale — and a party typed in by hand never had them at all,
// which is how a character with a blue icon and a portrait arrived in the fight
// as the first colour of the palette with no face.
//
// The map has the campaign's roster in hand when it sends a room, so it is the
// one that can say. Only what the sheet actually carries is applied: a character
// who never picked a colour must not have the one the GM gave them overwritten
// with nothing.
export function withSheetIdentity(players, roster) {
  const bySheet = new Map((roster || [])
    .filter((entry) => entry?.characterId)
    .map((entry) => [String(entry.characterId), entry]));
  if (!bySheet.size) return players || [];

  return (players || []).map((player) => {
    const entry = player?.sourceId ? bySheet.get(String(player.sourceId)) : null;
    if (!entry) return player;
    return {
      ...player,
      ...(entry.color ? { iconColor: entry.color, color: entry.color } : {}),
      ...(entry.portraitPath ? { portraitPath: entry.portraitPath } : {}),
    };
  });
}

// Writes the encounter and the fight, and answers with what to point at them
// with. The players come from the instance's own party, so a fight rolled from
// the map has the same initiative order the builder would have given it.
export function sendEncounterToBuilder(instanceId, {
  name, groups, monsters = [], roster = [],
} = {}) {
  if (!instanceId) throw new Error('There is no Encounter Builder linked to this map.');
  const encounter = encounterFromGroups(groups);
  if (!encounter.length) throw new Error('That room has no creatures to send.');

  const persisted = readPersistedInstance(instanceId, monsters);
  const party = persisted.partyData?.party || { count: 4, level: 1 };
  const players = withSheetIdentity(persisted.partyData?.players || [], roster);

  const entry = makeSavedEncounter(name, encounter, party);
  const library = [entry, ...(persisted.library || [])];

  const combat = buildCombat(encounter, players, entry.id);
  combat.name = entry.name;
  const fightEntry = {
    id: combat.fightId,
    name: entry.name,
    savedAt: Date.now(),
    encounterId: entry.id,
    // The library card travels with the fight. A fight is only reachable
    // through the card of the encounter it was launched from, and the library
    // is still a blob in one browser — without this, a room sent from here
    // would arrive on another device as a fight nothing can open.
    encounter: entry,
    // The builder's own snapshot, so a fight sent from the map is stored
    // exactly as one launched by hand — including the vitals that were once
    // dropped here by listing fields out by name.
    fight: snapshotFight(combat),
  };
  const fights = [fightEntry, ...(persisted.fightsData?.items || [])
    .filter((fight) => fight.id !== fightEntry.id)];

  persistLibrary(instanceId, library);
  // Not made active: the GM may be sending twenty rooms in a row, and each one
  // stealing the builder's current fight would be unusable.
  persistFights(instanceId, persisted.fightsData?.activeFightId || null, fights);

  return {
    instanceId,
    encounterId: entry.id,
    fightId: combat.fightId,
    name: entry.name,
    // The record the caller is expected to put in the database. Written here
    // too, because a browser with no account is still a browser running a game
    // — but the row is what a second device will read.
    entry: fightEntry,
    // The fight keeps the party — it is a combat, and initiative without the
    // characters is not one. What goes onto the map is the creatures only: the
    // players already have their own pieces there, and a second set of them
    // standing in the room they are about to walk into is nobody's intention.
    combatants: importableCombatants(combat),
  };
}

// A saved encounter launched from outside the builder.
//
// A creature is only worth placing once something is tracking its hit points,
// and that something is a fight: a saved encounter on its own is a shopping
// list. The battle map's import dialog is where a GM is when they find out the
// encounter they want was never launched, and sending them to the builder and
// back to launch it by hand is a trip that ends exactly here — so this does
// what the builder's own launch does, from wherever it is asked.
//
// The fight is not made active. The GM is placing pieces on a map, not opening
// the builder's combat view on some other screen.
export function launchLibraryEncounter(instanceId, encounterId, { monsters = [], roster = [] } = {}) {
  if (!instanceId) throw new Error('There is no Encounter Builder behind this encounter.');
  const persisted = readPersistedInstance(instanceId, monsters);
  const card = (persisted.library || [])
    .find((entry) => String(entry.id) === String(encounterId));
  if (!card) throw new Error('That encounter is no longer in the Encounter Builder.');

  // An encounter it already has a fight for is not launched again: that fight
  // is what the pieces on every other screen already point at, and a second one
  // would leave half the table tracking hit points nobody else can see.
  const items = persisted.fightsData?.items || [];
  const existing = items.find((fight) => (
    fight?.encounterId != null && String(fight.encounterId) === String(card.id)
  ));
  if (existing) {
    return {
      instanceId,
      encounterId: card.id,
      fightId: existing.id,
      name: existing.name || card.name,
      // Nothing new to write anywhere: the fight is already a record.
      entry: null,
      combatants: importableCombatants(restoreFight(existing, monsters)),
    };
  }

  const encounter = hydrateEncounterItems(card.encounter, monsters);
  const players = withSheetIdentity(persisted.partyData?.players || [], roster);
  const combat = buildCombat(encounter, players, card.id);
  if (!combat.combatants.length) throw new Error('That encounter has no creatures to place.');
  combat.name = card.name;
  const fightEntry = {
    id: combat.fightId,
    name: card.name,
    savedAt: Date.now(),
    encounterId: card.id,
    // The card travels with the fight, as it does for a room sent from the map:
    // a device that never got this instance's library still has something to
    // open the fight from.
    encounter: card,
    fight: snapshotFight(combat),
  };
  persistFights(
    instanceId,
    persisted.fightsData?.activeFightId || null,
    [fightEntry, ...items.filter((fight) => fight.id !== fightEntry.id)],
  );

  return {
    instanceId,
    encounterId: card.id,
    fightId: combat.fightId,
    name: card.name,
    entry: fightEntry,
    combatants: importableCombatants(combat),
  };
}

// Whether a record that points at a fight still points at anything.
//
// A dungeon room remembers the fight it was sent as, and that record lives in
// the scene — where a GM deleting the encounter in the builder cannot reach it.
// So the room went on claiming to have been sent, and sending it again did
// nothing: the answer is this, asked before the room is taken at its word.
//
//   'present'  — the fight is in this browser's copy of the instance.
//   'missing'  — the instance is here and the fight is not: it was deleted.
//   'unknown'  — this browser has never held that instance, so it cannot say.
export function localFightPresence(instanceId, fightId) {
  if (!instanceId || !fightId) return 'missing';
  if (!getInstance('encounters', instanceId)) return 'unknown';
  const items = readPersistedInstance(instanceId, [])?.fightsData?.items || [];
  return items.some((fight) => String(fight.id) === String(fightId)) ? 'present' : 'missing';
}
