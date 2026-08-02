import { createDefaultCoreState, createDefaultResults } from './logic/defaultState.js';
import { createDefaultTables } from './logic/defaultTables.js';
import { LEGACY_KEYS, migrateLegacyBoard } from './logic/migration.js';
import {
  emitStorageEvent,
  hasScopedPayload,
  restoreScopedPayload,
  snapshotScopedPayload,
  touchRegistryEntry,
} from '../../shared/scopedStoragePayload.js';
import { SECTION_REGISTRY } from '../../shared/sectionRegistry.js';
import { makeSectionInstanceId } from '../../shared/sectionInstances.js';
import { normalizeLinkGroupId } from '../../shared/linkGroupId.js';

const SECTION = SECTION_REGISTRY.gmboard;
export const REGISTRY_KEY = SECTION.registryKey;
export const ACTIVE_KEY = SECTION.activeKey;
export const STORAGE_KEYS = Object.freeze({
  state: 'state:v1',
  tables: 'tables:v1',
  results: 'results:v1',
});
const SAVE_EVENT = SECTION.saveEvent;

export function sanitizeBoardId(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 48);
}

export function makeBoardId(now = Date.now(), random = Math.random) {
  return makeSectionInstanceId(SECTION.key, now, random);
}

export function scopeKey(id, key) {
  return `gb:board:${id}:${key}`;
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
  return hasScopedPayload(scopedPrefix(id));
}

export function isKnownBoardInstance(id) {
  return readRegistry().some((entry) => entry.id === id) || hasScopedData(id);
}

export function registerBoardInstance(id, label, { force = false, linkGroupId } = {}) {
  const cleanId = sanitizeBoardId(id);
  if (!cleanId) return null;
  const now = Date.now();
  const list = readRegistry();
  const existing = list.find((entry) => entry.id === cleanId);
  const name = !force && existing?.name ? existing.name : (String(label || '').trim() || cleanId);
  const next = [{
    ...existing,
    id: cleanId,
    name,
    updatedAt: now,
    ...(linkGroupId ? { linkGroupId: normalizeLinkGroupId(linkGroupId) } : {}),
  }, ...list.filter((entry) => entry.id !== cleanId)].slice(0, 20);
  localStorage.setItem(ACTIVE_KEY, cleanId);
  writeRegistry(next);
  return next[0];
}

export function resolveInstance(search) {
  const params = new URLSearchParams(search || '');
  let id = sanitizeBoardId(params.get('board'));
  let linkGroupId = normalizeLinkGroupId(params.get('linkGroup'));
  let saved = false;
  let replaceSearch = '';

  if (id === 'new') {
    id = makeBoardId();
    replaceSearch = `?board=${encodeURIComponent(id)}${linkGroupId ? `&linkGroup=${encodeURIComponent(linkGroupId)}` : ''}`;
  } else if (id) {
    saved = isKnownBoardInstance(id);
    linkGroupId = readRegistry().find((entry) => entry.id === id)?.linkGroupId || linkGroupId;
  } else {
    const activeId = sanitizeBoardId(localStorage.getItem(ACTIVE_KEY));
    if (activeId && isKnownBoardInstance(activeId)) {
      id = activeId;
      saved = true;
      linkGroupId = readRegistry().find((entry) => entry.id === id)?.linkGroupId || linkGroupId;
      replaceSearch = `?board=${encodeURIComponent(id)}`;
    } else {
      id = makeBoardId();
      replaceSearch = `?board=${encodeURIComponent(id)}`;
    }
  }

  const group = normalizeLinkGroupId(linkGroupId);
  return { id, saved, replaceSearch, ...(group ? { linkGroupId: group } : {}) };
}

function readRaw(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function parseJsonOr(raw, fallback) {
  if (raw == null) return fallback;
  try {
    const value = JSON.parse(raw);
    return value == null ? fallback : value;
  } catch {
    return fallback;
  }
}

function readLegacyRecord(readKey) {
  const raw = {};
  let any = false;
  LEGACY_KEYS.forEach((key) => {
    const value = readKey(key);
    raw[key] = value;
    if (value != null) any = true;
  });
  return any ? raw : null;
}

export function readPersistedBoard(id) {
  const stateRaw = readRaw(scopeKey(id, STORAGE_KEYS.state));
  const tablesRaw = readRaw(scopeKey(id, STORAGE_KEYS.tables));
  const resultsRaw = readRaw(scopeKey(id, STORAGE_KEYS.results));

  if (stateRaw != null || tablesRaw != null) {
    return {
      state: parseJsonOr(stateRaw, createDefaultCoreState()),
      tables: parseJsonOr(tablesRaw, createDefaultTables()),
      results: parseJsonOr(resultsRaw, createDefaultResults()),
    };
  }

  const legacyScoped = readLegacyRecord((key) => readRaw(scopeKey(id, key)));
  const legacySource = legacyScoped || (id === 'default' ? readLegacyRecord((key) => readRaw(key)) : null);
  if (legacySource) {
    const migrated = migrateLegacyBoard(legacySource);
    return { state: migrated.state, tables: migrated.tables, results: createDefaultResults() };
  }

  return { state: createDefaultCoreState(), tables: createDefaultTables(), results: createDefaultResults() };
}

export function persistBoardState(id, state) {
  localStorage.setItem(scopeKey(id, STORAGE_KEYS.state), JSON.stringify(state));
  markBoardPersisted(id);
}

export function persistBoardTables(id, tables) {
  localStorage.setItem(scopeKey(id, STORAGE_KEYS.tables), JSON.stringify(tables));
  markBoardPersisted(id);
}

export function persistBoardResults(id, results) {
  localStorage.setItem(scopeKey(id, STORAGE_KEYS.results), JSON.stringify(results));
  markBoardPersisted(id);
}

export function readScopedPayload(id) {
  return snapshotScopedPayload(scopedPrefix(id));
}

export function writeScopedPayload(id, payload, { name, updatedAt, linkGroupId } = {}) {
  restoreScopedPayload(scopedPrefix(id), payload);
  return touchRegistryEntry(REGISTRY_KEY, id, { name, updatedAt, linkGroupId });
}

function markBoardPersisted(id) {
  if (!touchRegistryEntry(REGISTRY_KEY, id)) return;
  emitStorageEvent(SAVE_EVENT, id);
}
