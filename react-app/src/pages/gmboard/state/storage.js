import { createDefaultCoreState, createDefaultResults } from '../../../shared/gmboard/defaultState.js';
import { createDefaultTables } from '../../../shared/gmboard/defaultTables.js';
import { LEGACY_KEYS, migrateLegacyBoard } from './migration.js';
import { readInstanceValue, saveLocal } from '../../../shared/instances/instanceStore.js';
import { getStorageItem } from '../../../shared/storage/storage.js';
import { STORAGE_KEYS, decodeBoard } from '../../../shared/gmboard/boardFormat.js';

// GM Board payload adapter: which keys an instance stores and how they are
// (de)serialized. Registry, sync and opening are shared (shared/instances/);
// every write goes through saveLocal, which skips unchanged values.

const SECTION_KEY = 'gmboard';

const readScoped = (id, key) => readInstanceValue(SECTION_KEY, id, key);

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
  if (readScoped(id, STORAGE_KEYS.state) != null || readScoped(id, STORAGE_KEYS.tables) != null) {
    return decodeBoard((key) => readScoped(id, key));
  }

  const legacyScoped = readLegacyRecord((key) => readScoped(id, key));
  const legacySource = legacyScoped || (id === 'default' ? readLegacyRecord((key) => getStorageItem(key)) : null);
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
