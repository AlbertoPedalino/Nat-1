import { calculateDifficulty } from './difficulty.js';
import { normalizeFumbleTables } from './fumbles.js';
import { normalizeNegotiation } from './negotiation.js';
import { hydrateEncounterItems, serializeEncounterItem } from './monsterUtils.js';
import {
  emitStorageEvent,
  restoreScopedPayload,
  snapshotScopedPayload,
  touchRegistryEntry,
} from '../../../shared/scopedStoragePayload.js';
import { SECTION_REGISTRY } from '../../../shared/sectionRegistry.js';

const SECTION = SECTION_REGISTRY.encounters;
export const REGISTRY_KEY = SECTION.registryKey;
export const ACTIVE_KEY = SECTION.activeKey;
export const STORAGE_VERSION = 1;
export const STORAGE_KEYS = Object.freeze({
  party: 'party:v1',
  draft: 'draft:v1',
  library: 'library:v1',
  fights: 'fights:v1',
  fumbles: 'fumbles:v1',
  negotiation: 'negotiation:v1',
});
const SAVE_EVENT = SECTION.saveEvent;

export function sanitizeEncounterId(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 48);
}

export function makeEncounterId(now = Date.now()) {
  return `enc_${now.toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function scopeKey(id, key) {
  return `gb:enc:${id}:${key}`;
}

export function scopedPrefix(id) {
  return SECTION.scopedPrefix(id);
}

export function readRegistry() {
  try {
    return JSON.parse(localStorage.getItem(REGISTRY_KEY) || '[]').filter((entry) => entry && entry.id);
  } catch {
    return [];
  }
}

export function writeRegistry(list) {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify((Array.isArray(list) ? list : []).slice(0, 20)));
}

export function hasScopedData(id) {
  const prefix = `gb:enc:${id}:`;
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (String(key || '').startsWith(prefix)) return true;
  }
  return false;
}

export function isKnownEncounterInstance(id) {
  return readRegistry().some((entry) => entry.id === id) || hasScopedData(id);
}

export function registerEncounterInstance(id, label, { force = false } = {}) {
  const cleanId = sanitizeEncounterId(id);
  if (!cleanId) return null;
  const now = Date.now();
  const list = readRegistry();
  const existing = list.find((entry) => entry.id === cleanId);
  const name = !force && existing?.name ? existing.name : (String(label || '').trim() || cleanId);
  const next = [{ id: cleanId, name, updatedAt: now }, ...list.filter((entry) => entry.id !== cleanId)].slice(0, 20);
  localStorage.setItem(ACTIVE_KEY, cleanId);
  writeRegistry(next);
  return next[0];
}

export function resolveInstance(search) {
  const params = new URLSearchParams(search || '');
  let id = sanitizeEncounterId(params.get('enc'));
  let saved = false;
  let replaceSearch = '';

  if (id === 'new') {
    id = makeEncounterId();
    replaceSearch = `?enc=${encodeURIComponent(id)}`;
  } else if (id) {
    saved = isKnownEncounterInstance(id);
  } else {
    const activeId = sanitizeEncounterId(localStorage.getItem(ACTIVE_KEY));
    if (activeId && isKnownEncounterInstance(activeId)) {
      id = activeId;
      saved = true;
      replaceSearch = `?enc=${encodeURIComponent(id)}`;
    } else {
      id = makeEncounterId();
      replaceSearch = `?enc=${encodeURIComponent(id)}`;
    }
  }

  return { id, saved, replaceSearch };
}

function readJson(id, key, fallback) {
  try {
    const raw = localStorage.getItem(scopeKey(id, key));
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(id, key, value) {
  localStorage.setItem(scopeKey(id, key), JSON.stringify(value));
  markEncounterPersisted(id);
}

export function readScopedPayload(id) {
  return snapshotScopedPayload(scopedPrefix(id));
}

export function writeScopedPayload(id, payload, { name, updatedAt } = {}) {
  restoreScopedPayload(scopedPrefix(id), payload);
  return touchRegistryEntry(REGISTRY_KEY, id, { name, updatedAt });
}

function markEncounterPersisted(id) {
  if (!touchRegistryEntry(REGISTRY_KEY, id)) return;
  emitStorageEvent(SAVE_EVENT, id);
}

export function readPersistedInstance(id, monsters = []) {
  const partyData = readJson(id, STORAGE_KEYS.party, null);
  const draftData = readJson(id, STORAGE_KEYS.draft, null);
  const library = readJson(id, STORAGE_KEYS.library, []);
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

export function persistParty(id, party, players) {
  writeJson(id, STORAGE_KEYS.party, { version: STORAGE_VERSION, party, players });
}

export function persistDraft(id, encounter, currentEncounterId, encounterName) {
  writeJson(id, STORAGE_KEYS.draft, {
    version: STORAGE_VERSION,
    currentEncounterId: currentEncounterId || null,
    encounterName: encounterName || '',
    encounter: (Array.isArray(encounter) ? encounter : []).map(serializeEncounterItem),
    updatedAt: Date.now(),
  });
}

export function persistLibrary(id, library) {
  writeJson(id, STORAGE_KEYS.library, Array.isArray(library) ? library : []);
}

export function persistFights(id, activeFightId, fights) {
  writeJson(id, STORAGE_KEYS.fights, {
    version: STORAGE_VERSION,
    activeFightId: activeFightId || null,
    items: Array.isArray(fights) ? fights : [],
  });
}

export function persistFumbles(id, fumbleTables) {
  writeJson(id, STORAGE_KEYS.fumbles, normalizeFumbleTables(fumbleTables));
}

export function persistNegotiation(id, negotiation) {
  writeJson(id, STORAGE_KEYS.negotiation, normalizeNegotiation(negotiation));
}

export function normalizeFightsData(value) {
  if (Array.isArray(value)) return { activeFightId: null, items: value };
  return {
    activeFightId: value?.activeFightId || null,
    items: Array.isArray(value?.items) ? value.items : [],
  };
}

export function makeSavedEncounter(name, encounter, party) {
  const difficulty = calculateDifficulty(encounter, party);
  return {
    id: Date.now(),
    name: String(name || '').trim() || defaultEncounterName(),
    createdAt: new Date().toISOString(),
    partyCount: party.count,
    partyLevel: party.level,
    totalXp: difficulty.totalXp,
    diffLabel: difficulty.label,
    encounter: (Array.isArray(encounter) ? encounter : []).map(serializeEncounterItem),
  };
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
