import { calculateDifficulty } from '../builder/difficulty.js';
import { dedupeLibraryById } from '../library/library.js';
import { normalizeFumbleTables } from '../rolls/fumbles.js';
import { normalizeNegotiation } from '../negotiation/negotiation.js';
import { hydrateEncounterItems, serializeEncounterItem } from '../bestiary/monsterUtils.js';
import { readInstanceValue, saveLocal } from '../../../shared/instances/instanceStore.js';

// Encounter Builder payload adapter: which keys an instance stores and how
// they are (de)serialized. Registry, sync and opening are shared
// (shared/instances/); every write goes through saveLocal, which skips
// unchanged values.

const SECTION_KEY = 'encounters';
export const STORAGE_VERSION = 1;
export const STORAGE_KEYS = Object.freeze({
  party: 'party:v1',
  draft: 'draft:v1',
  library: 'library:v1',
  fights: 'fights:v1',
  fumbles: 'fumbles:v1',
  negotiation: 'negotiation:v1',
});

export function scopeKey(id, key) {
  return `gb:enc:${id}:${key}`;
}

function readJson(id, key, fallback) {
  try {
    const raw = readInstanceValue(SECTION_KEY, id, key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function readPersistedInstance(id, monsters = []) {
  const partyData = readJson(id, STORAGE_KEYS.party, null);
  const draftData = readJson(id, STORAGE_KEYS.draft, null);
  const library = dedupeLibraryById(readJson(id, STORAGE_KEYS.library, []));
  const fightsData = readJson(id, STORAGE_KEYS.fights, { activeFightId: null, items: [] });
  const fumbleTables = normalizeFumbleTables(readJson(id, STORAGE_KEYS.fumbles, null));
  const negotiation = normalizeNegotiation(readJson(id, STORAGE_KEYS.negotiation, null));
  return {
    partyData,
    draftData: draftData ? {
      ...draftData,
      encounter: hydrateEncounterItems(draftData.encounter, monsters),
    } : null,
    library: Array.isArray(library) ? library : [],
    fightsData: normalizeFightsData(fightsData),
    fumbleTables,
    negotiation,
  };
}

const partyValue = (party, players) => JSON.stringify({ version: STORAGE_VERSION, party, players });
const libraryValue = (library) => JSON.stringify(Array.isArray(library) ? library : []);
const fightsValue = (activeFightId, fights) => JSON.stringify({
  version: STORAGE_VERSION,
  activeFightId: activeFightId || null,
  items: Array.isArray(fights) ? fights : [],
});
const fumblesValue = (fumbleTables) => JSON.stringify(normalizeFumbleTables(fumbleTables));
const negotiationValue = (negotiation) => JSON.stringify(normalizeNegotiation(negotiation));

// The draft's `updatedAt` only stamps a change: the same draft keeps the stored
// string (so saving it again is a no-op), a different one gets a new stamp.
function draftValue(id, encounter, currentEncounterId, encounterName, encounterQuest) {
  const draft = {
    version: STORAGE_VERSION,
    currentEncounterId: currentEncounterId || null,
    encounterName: encounterName || '',
    encounterQuest: normalizeEncounterQuest(encounterQuest),
    encounter: (Array.isArray(encounter) ? encounter : []).map(serializeEncounterItem),
  };
  const previousRaw = readInstanceValue(SECTION_KEY, id, STORAGE_KEYS.draft);
  const previous = readJson(id, STORAGE_KEYS.draft, null);
  if (previous && JSON.stringify({ ...draft, updatedAt: previous.updatedAt }) === JSON.stringify(previous)) return previousRaw;
  return JSON.stringify({ ...draft, updatedAt: Date.now() });
}

// A whole save: all six keys in one local write, so listeners and the sync
// engine hear about it once, after every key is on disk.
export function persistEncounter(id, state) {
  return saveLocal(SECTION_KEY, id, {
    [STORAGE_KEYS.party]: partyValue(state.party, state.players),
    [STORAGE_KEYS.draft]: draftValue(id, state.encounter, state.currentEncounterId, state.encounterName, state.encounterQuest),
    [STORAGE_KEYS.library]: libraryValue(state.library),
    [STORAGE_KEYS.fights]: fightsValue(state.activeFightId, state.fights),
    [STORAGE_KEYS.fumbles]: fumblesValue(state.fumbleTables),
    [STORAGE_KEYS.negotiation]: negotiationValue(state.negotiation),
  });
}

export function persistParty(id, party, players) {
  return saveLocal(SECTION_KEY, id, { [STORAGE_KEYS.party]: partyValue(party, players) });
}

export function persistDraft(id, encounter, currentEncounterId, encounterName, encounterQuest) {
  return saveLocal(SECTION_KEY, id, {
    [STORAGE_KEYS.draft]: draftValue(id, encounter, currentEncounterId, encounterName, encounterQuest),
  });
}

export function persistLibrary(id, library) {
  return saveLocal(SECTION_KEY, id, { [STORAGE_KEYS.library]: libraryValue(library) });
}

export function persistFights(id, activeFightId, fights) {
  return saveLocal(SECTION_KEY, id, { [STORAGE_KEYS.fights]: fightsValue(activeFightId, fights) });
}

export function normalizeFightsData(value) {
  if (Array.isArray(value)) return { activeFightId: null, items: value };
  return {
    activeFightId: value?.activeFightId || null,
    items: Array.isArray(value?.items) ? value.items : [],
  };
}

export function makeSavedEncounter(name, encounter, party, quest = null, existing = null) {
  const difficulty = calculateDifficulty(encounter, party);
  return {
    ...existing,
    id: existing?.id ?? Date.now(),
    name: String(name || '').trim() || existing?.name || defaultEncounterName(),
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    partyCount: party.count,
    partyLevel: party.level,
    totalXp: difficulty.totalXp,
    diffLabel: difficulty.label,
    quest: normalizeEncounterQuest(quest),
    encounter: (Array.isArray(encounter) ? encounter : []).map(serializeEncounterItem),
  };
}

export function normalizeEncounterQuest(value) {
  const quest = String(value || '').trim().replace(/\s+/g, ' ').slice(0, 120);
  return quest || null;
}

function defaultEncounterName() {
  const date = new Date();
  return `Encounter ${date.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}
