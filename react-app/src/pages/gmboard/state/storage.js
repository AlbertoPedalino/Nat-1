import { createDefaultCoreState, createDefaultResults } from './defaultState.js';
import { createDefaultTables } from '../tables/defaultTables.js';
import { LEGACY_KEYS, migrateLegacyBoard } from './migration.js';
import { readInstanceValue, saveLocal } from '../../../shared/instances/instanceStore.js';

// GM Board payload adapter: which keys an instance stores and how they are
// (de)serialized. Registry, sync and opening are shared (shared/instances/);
// every write goes through saveLocal, which skips unchanged values.

const SECTION_KEY = 'gmboard';
export const STORAGE_KEYS = Object.freeze({
  state: 'state:v1',
  tables: 'tables:v1',
  results: 'results:v1',
});

export function scopeKey(id, key) {
  return `gb:board:${id}:${key}`;
}

function readRaw(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

const readScoped = (id, key) => readInstanceValue(SECTION_KEY, id, key);

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
  const stateRaw = readScoped(id, STORAGE_KEYS.state);
  const tablesRaw = readScoped(id, STORAGE_KEYS.tables);
  const resultsRaw = readScoped(id, STORAGE_KEYS.results);

  if (stateRaw != null || tablesRaw != null) {
    return {
      state: parseJsonOr(stateRaw, createDefaultCoreState()),
      tables: parseJsonOr(tablesRaw, createDefaultTables()),
      results: parseJsonOr(resultsRaw, createDefaultResults()),
    };
  }

  const legacyScoped = readLegacyRecord((key) => readScoped(id, key));
  const legacySource = legacyScoped || (id === 'default' ? readLegacyRecord((key) => readRaw(key)) : null);
  if (legacySource) {
    const migrated = migrateLegacyBoard(legacySource);
    return { state: migrated.state, tables: migrated.tables, results: createDefaultResults() };
  }

  return { state: createDefaultCoreState(), tables: createDefaultTables(), results: createDefaultResults() };
}

// A whole save (core state, tables, results) in one local write.
export function persistBoard(id, { state, tables, results }) {
  return saveLocal(SECTION_KEY, id, {
    [STORAGE_KEYS.state]: JSON.stringify(state),
    [STORAGE_KEYS.tables]: JSON.stringify(tables),
    [STORAGE_KEYS.results]: JSON.stringify(results),
  });
}

export function persistBoardState(id, state) {
  return saveLocal(SECTION_KEY, id, { [STORAGE_KEYS.state]: JSON.stringify(state) });
}

export function persistBoardTables(id, tables) {
  return saveLocal(SECTION_KEY, id, { [STORAGE_KEYS.tables]: JSON.stringify(tables) });
}

export function persistBoardResults(id, results) {
  return saveLocal(SECTION_KEY, id, { [STORAGE_KEYS.results]: JSON.stringify(results) });
}
