import { createDefaultCoreState, createDefaultResults } from './defaultState.js';
import { createDefaultTables } from './defaultTables.js';

// How a GM Board instance stores its data: one JSON value per key, scoped to
// the board id. The board page and the battle map (which reads a campaign's
// board tables) both read it through these.
export const STORAGE_KEYS = Object.freeze({
  state: 'state:v1',
  tables: 'tables:v1',
  results: 'results:v1',
});

export function scopeKey(id, key) {
  return `gb:board:${id}:${key}`;
}

function parseJsonOr(raw, fallback) {
  if (typeof raw !== 'string') return fallback;
  try {
    const value = JSON.parse(raw);
    return value == null ? fallback : value;
  } catch {
    return fallback;
  }
}

// A board's { state, tables, results } from its stored values, wherever they
// are kept (this browser's store, or the cloud row's data): `readKey(key)`
// returns the raw JSON string of one STORAGE_KEYS entry, or nothing. A missing
// or unreadable value is the default.
export function decodeBoard(readKey) {
  return {
    state: parseJsonOr(readKey(STORAGE_KEYS.state), createDefaultCoreState()),
    tables: parseJsonOr(readKey(STORAGE_KEYS.tables), createDefaultTables()),
    results: parseJsonOr(readKey(STORAGE_KEYS.results), createDefaultResults()),
  };
}
