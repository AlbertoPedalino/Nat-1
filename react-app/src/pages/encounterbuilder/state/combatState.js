import {
  absorbFightTurn, buildCombat, snapshotFight, autoFightName,
} from '../../../shared/encounter/combat.js';
import { applySheetVitals } from '../../../shared/encounter/combatantVitals.js';
import { makeSavedEncounter } from './storage.js';
import { combatantToSheetPatch, resolveCombatVitals } from '../../../shared/encounter/sheetSync.js';
import { absorbMonsterVitals } from '../../../shared/vtt/tokens/fightVitals.js';

// The encounter builder's running fight: launching and closing it, writing it
// back into the fight list, and absorbing vitals and turns that changed
// elsewhere (character sheets, the battle map).

export function syncCombatantVitals(state, sourceId, vitals) {
  const cacheChanged = JSON.stringify(state.characterVitals?.[sourceId]) !== JSON.stringify(vitals);
  let changed = cacheChanged;
  const players = state.players.map((player) => {
    if (String(player.sourceId || '') !== String(sourceId)) return player;
    const resolved = resolveCombatVitals(player, vitals);
    const patch = { ...combatantToSheetPatch(resolved), hpMax: resolved.hpMax };
    if (Object.keys(patch).every((key) => JSON.stringify(player[key]) === JSON.stringify(patch[key]))) return player;
    changed = true;
    return { ...player, ...patch };
  });
  const fights = state.fights.map((fight) => {
    const next = applySheetVitals(fight, sourceId, vitals);
    if (next !== fight) changed = true;
    return next;
  });
  const combat = state.combat ? applySheetVitals(state.combat, sourceId, vitals) : null;
  if (combat !== state.combat) changed = true;
  return changed ? {
    ...state, players, fights, combat,
    characterVitals: cacheChanged ? { ...state.characterVitals, [sourceId]: vitals } : state.characterVitals,
  } : state;
}

// Enemy vitals from the fight's database row, the only authority for them.
// Unchanged vitals answer with the same state, so absorbing the echo of our
// own write neither re-renders nor saves.
export function absorbFightVitals(state, fightId, fight) {
  if (!state.combat || fightId == null || String(state.combat.fightId) !== String(fightId)) return state;
  const combat = absorbMonsterVitals(state.combat, fight);
  return combat === state.combat ? state : withCombat(state, combat);
}

// The turn from the fight's database row, when the battle map moved it.
export function absorbActiveFightTurn(state, fightId, fight) {
  if (!state.combat || fightId == null || String(state.combat.fightId) !== String(fightId)) return state;
  const combat = absorbFightTurn(state.combat, fight);
  return combat === state.combat ? state : withCombat(state, combat);
}

// Every launch is backed by a library encounter, so its card always exposes the
// full Load/Launch/Resume/Delete actions. Builder launches always pass a null
// id to save a new snapshot; Library launches restart the selected saved entry.
// `initiative`: the optional per-creature advantage/disadvantage chosen in the
// launch panel (initiativeRoster keys); a plain Launch passes none.
export function launchCombat(state, encounter, encounterId, name, quest = null, initiative = {}) {
  let library = state.library;
  let id = encounterId || null;
  if (id == null && encounter.length) {
    const entry = makeSavedEncounter(name, encounter, state.party, quest);
    while (library.some((saved) => saved.id === entry.id)) entry.id += 1;
    library = [entry, ...library];
    id = entry.id;
  }
  const combat = buildCombat(encounter, state.players, id, Math.random, { initiative: initiative || {} });
  // Two quick launches must not replace each other through Date.now() ids.
  while (state.fights.some((fight) => fight.id === combat.fightId)) combat.fightId += 1;
  combat.name = library.find((entry) => entry.id === id)?.name || autoFightName(combat.combatants);
  return withCombat({
    ...state,
    library,
    encounter,
    currentEncounterId: id,
    encounterName: name || library.find((entry) => entry.id === id)?.name || '',
    encounterQuest: quest || library.find((entry) => entry.id === id)?.quest || null,
  }, combat, { view: 'combat' });
}

export function withCombat(state, combat, patch = {}) {
  const existing = (state.fights || []).find((fight) => fight.id === combat.fightId);
  const fightEntry = {
    id: combat.fightId,
    name: existing?.name || combat.name || autoFightName(combat.combatants),
    savedAt: Date.now(),
    encounterId: combat.encounterId || null,
    // The library card a fight sent from the battle map carries with it, so a
    // device that never wrote the library blob still has something to open it
    // from. Kept across a launch: dropping it here would clear the column on the
    // next save, and the fight would go dark on every other screen.
    ...(existing?.encounter ? { encounter: existing.encounter } : {}),
    fight: snapshotFight(combat),
  };
  // Keep one fight per encounter: a fresh launch supersedes the previous fight.
  const fights = [fightEntry, ...state.fights.filter((fight) => (
    fight.id !== fightEntry.id
    && !(fightEntry.encounterId != null && fight.encounterId === fightEntry.encounterId)
  ))];
  return {
    ...state,
    ...patch,
    combat,
    fights,
    activeFightId: fightEntry.id,
  };
}

// Closing only drops the fight as the active one: its snapshot stays in
// `fights`, so a fight whose encounter is in the library can still be resumed
// from there. Nothing is deleted here.
export function closeCombat(state) {
  if (!state.combat) return state;
  return {
    ...state,
    combat: null,
    activeFightId: null,
    view: 'builder',
    selectedStatblock: null,
  };
}
