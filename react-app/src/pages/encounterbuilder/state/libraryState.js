import { normalizeEncounterQuest } from './storage.js';
import { dedupeFightsByEncounter, dedupeLibraryById } from '../../../shared/encounter/library.js';

// The encounter builder's saved encounters and fights: deleting, quest
// assignment, and merging what another tab or the battle map wrote.

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
