import { createDefaultCoreState, createDefaultResults } from './logic/defaultState.js';
import { createDefaultTables } from './logic/defaultTables.js';
import { LEGACY_KEYS, migrateLegacyBoard } from './logic/migration.js';

export const REGISTRY_KEY = 'gb_board_registry';
export const ACTIVE_KEY = 'gb_active_board_id';
export const STORAGE_KEYS = Object.freeze({
  state: 'state:v1',
  tables: 'tables:v1',
  results: 'results:v1',
});

export function sanitizeBoardId(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 48);
}

export function makeBoardId(now = Date.now()) {
  return `gm_${now.toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function scopeKey(id, key) {
  return `gb:board:${id}:${key}`;
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
  const prefix = `gb:board:${id}:`;
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (String(key || '').startsWith(prefix)) return true;
  }
  return false;
}

export function isKnownBoardInstance(id) {
  return readRegistry().some((entry) => entry.id === id) || hasScopedData(id);
}

export function registerBoardInstance(id, label, { force = false } = {}) {
  const cleanId = sanitizeBoardId(id);
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
  let id = sanitizeBoardId(params.get('board'));
  let saved = false;
  let replaceSearch = '';

  if (id === 'new') {
    id = makeBoardId();
    replaceSearch = `?board=${encodeURIComponent(id)}`;
  } else if (id) {
    saved = isKnownBoardInstance(id);
  } else {
    const activeId = sanitizeBoardId(localStorage.getItem(ACTIVE_KEY));
    if (activeId && isKnownBoardInstance(activeId)) {
      id = activeId;
      saved = true;
      replaceSearch = `?board=${encodeURIComponent(id)}`;
    } else {
      id = makeBoardId();
      replaceSearch = `?board=${encodeURIComponent(id)}`;
    }
  }

  return { id, saved, replaceSearch };
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
}

export function persistBoardTables(id, tables) {
  localStorage.setItem(scopeKey(id, STORAGE_KEYS.tables), JSON.stringify(tables));
}

export function persistBoardResults(id, results) {
  localStorage.setItem(scopeKey(id, STORAGE_KEYS.results), JSON.stringify(results));
}
