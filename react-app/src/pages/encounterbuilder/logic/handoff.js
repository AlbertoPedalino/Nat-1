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

import { buildCombat, snapshotFight } from './combat.js';
import { importableCombatants } from '../../../shared/vtt/encounterImport.js';
import {
  makeSavedEncounter, persistFights, persistLibrary, readPersistedInstance,
} from './storage.js';

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
