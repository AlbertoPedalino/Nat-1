import { makeSavedEncounter, normalizeEncounterQuest } from './storage.js';
import { dedupeFightsByEncounter, dedupeLibraryById } from '../../../shared/encounter/library.js';
import { freeId } from '../../../shared/encounter/fightRecord.js';

// The encounter builder's saved encounters and fights: deleting, quest
// assignment, and merging what another tab or the battle map wrote.

// The composer (the builder's Encounter panel) is where an encounter is put
// together: a new one, or a library one loaded to be changed. Saving it,
// updating it or launching it hands it to the library and empties the
// composer, ready for the next one; the library card is where it lives on
// (Load, Launch, Resume).
const EMPTY_COMPOSER = Object.freeze({
  encounter: [], encounterName: '', encounterQuest: null, currentEncounterId: null,
});

// The composer emptied, or set to `composer` (fields of EMPTY_COMPOSER).
export function clearComposer(state, composer = {}) {
  return { ...state, ...EMPTY_COMPOSER, ...composer, selectedStatblock: null };
}

// The composer's encounter as a library card: the loaded one updated, or a new
// one with an id of its own. None for an empty composer.
export function draftLibraryEntry(state) {
  if (!state.encounter?.length) return null;
  const existing = state.library.find((entry) => entry.id === state.currentEncounterId) || null;
  const entry = makeSavedEncounter(state.encounterName, state.encounter, state.party, state.encounterQuest, existing);
  if (!existing) entry.id = freeId(entry.id, state.library);
  return entry;
}

// A card into the library (first in the list) and the composer emptied.
// Saving over an encounter is the GM choosing that version: a fight of the old
// one is superseded and goes, row and all (useCloudFights deletes what leaves
// this list). The fight being run is left to finish.
export function saveEntryToLibrary(state, entry) {
  return clearComposer({
    ...state,
    library: [entry, ...state.library.filter((card) => card.id !== entry.id)],
    fights: state.fights.filter((fight) => (
      fight.encounterId !== entry.id || fight.id === state.activeFightId
    )),
  });
}

// Fights and saved encounters written into this instance's storage by something
// other than this tab: the battle map sending a dungeon room, or the map writing
// hit points back into a fight that is not the one on screen.
//
// This tab's arrays are the whole record when it persists, so anything it has
// not heard about is not merely missing from the screen — the next save deletes
// it. That is what made a room sent from the map look unsynced: its fight was
// written, then quietly removed by the builder that was already open, and the
// pieces on the board were left pointing at a fight that no longer existed.
//
// The caller decides what is new or newer; this only merges, and answers with
// the same state when there is nothing to merge so a save cannot loop.
export function absorbExternal(state, { fights = [], library = [] }) {
  const currentFights = state.fights || [];
  const currentLibrary = state.library || [];
  const known = new Set(currentFights.map((fight) => String(fight.id)));
  const knownEncounters = new Set(currentLibrary.map((entry) => String(entry.id)));
  const addedEncounters = library.filter((entry) => !knownEncounters.has(String(entry.id)));
  const addedFights = fights.filter((fight) => !known.has(String(fight.id)));
  const incoming = new Map(fights.map((fight) => [String(fight.id), fight]));
  if (!fights.length && !library.length) return state;
  const merged = [
    ...addedFights,
    ...currentFights.map((fight) => incoming.get(String(fight.id)) || fight),
  ];
  return {
    ...state,
    // A launch supersedes the fight before it, but a fight that arrives from
    // elsewhere never went through a launch. Left alone, the row of an older
    // launch comes back and the encounter stands twice in every list that reads
    // this array — the battle map's import dialog among them.
    fights: dedupeFightsByEncounter(merged, state.activeFightId),
    library: dedupeLibraryById([...addedEncounters, ...currentLibrary, ...library]),
  };
}

export function deleteLibraryEncounter(state, id) {
  const fights = state.fights.filter((fight) => fight.encounterId !== id);
  // Only the fight that was running matters here. Asking whether the active one
  // survived, when there was no active one, answered "no" and sent the GM to the
  // builder every time they tidied up the library — a page they were reading,
  // closed for them because something they were not running was deleted.
  const lostTheRunningFight = state.activeFightId != null
    && !fights.some((fight) => fight.id === state.activeFightId);
  if (!lostTheRunningFight) {
    return {
      ...state,
      library: state.library.filter((entry) => entry.id !== id),
      currentEncounterId: state.currentEncounterId === id ? null : state.currentEncounterId,
      fights,
    };
  }
  return {
    ...state,
    library: state.library.filter((entry) => entry.id !== id),
    currentEncounterId: state.currentEncounterId === id ? null : state.currentEncounterId,
    fights,
    activeFightId: null,
    combat: null,
    view: 'builder',
  };
}

export function assignEncounterQuest(state, id, value) {
  const quest = normalizeEncounterQuest(value);
  if (!quest || !state.library.some((entry) => entry.id === id)) return state;
  return {
    ...state,
    library: state.library.map((entry) => (
      entry.id === id ? { ...entry, quest } : entry
    )),
    encounterQuest: state.currentEncounterId === id ? quest : state.encounterQuest,
  };
}

export function deleteFight(state, id) {
  const fights = state.fights.filter((fight) => fight.id !== id);
  return {
    ...state,
    fights,
    activeFightId: state.activeFightId === id ? null : state.activeFightId,
    combat: state.activeFightId === id ? null : state.combat,
    view: state.activeFightId === id ? 'builder' : state.view,
  };
}
