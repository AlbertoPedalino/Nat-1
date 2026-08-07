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

// Writes the encounter and the fight, and answers with what to point at them
// with. The players come from the instance's own party, so a fight rolled from
// the map has the same initiative order the builder would have given it.
export function sendEncounterToBuilder(instanceId, { name, groups, monsters = [] } = {}) {
  if (!instanceId) throw new Error('There is no Encounter Builder linked to this map.');
  const encounter = encounterFromGroups(groups);
  if (!encounter.length) throw new Error('That room has no creatures to send.');

  const persisted = readPersistedInstance(instanceId, monsters);
  const party = persisted.partyData?.party || { count: 4, level: 1 };
  const players = persisted.partyData?.players || [];

  const entry = makeSavedEncounter(name, encounter, party);
  const library = [entry, ...(persisted.library || [])];

  const combat = buildCombat(encounter, players, entry.id);
  combat.name = entry.name;
  const fightEntry = {
    id: combat.fightId,
    name: entry.name,
    savedAt: Date.now(),
    encounterId: entry.id,
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
    combatants: combat.combatants,
  };
}
