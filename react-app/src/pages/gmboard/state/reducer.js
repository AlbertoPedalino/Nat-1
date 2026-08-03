import { createDefaultCoreState, createDefaultResults } from '../logic/defaultState.js';
import { createDefaultTables } from '../logic/defaultTables.js';
import { LOG_STORE_LIMIT } from '../logic/constants.js';

export const CORE_FIELD_KEYS = Object.freeze(Object.keys(createDefaultCoreState()));

export function extractCoreState(state) {
  const core = {};
  CORE_FIELD_KEYS.forEach((key) => { core[key] = state[key]; });
  return core;
}

export function createInitialState() {
  return {
    tab: 'hex',
    ...createDefaultCoreState(),
    tables: createDefaultTables(),
    results: createDefaultResults(),
    hexResult: null,
  };
}

function pushLog(log, entry) {
  if (entry == null) return log;
  const next = [entry, ...log];
  if (next.length > LOG_STORE_LIMIT) next.length = LOG_STORE_LIMIT;
  return next;
}

function setTableCell(tables, tableKey, matchField, matchValue, field, value) {
  const parseTable = (rows) => rows.map((row) => (
    row[matchField] === matchValue ? { ...row, [field]: value } : row
  ));

  if (tableKey === 'weather') return { ...tables, weather: parseTable(tables.weather) };
  if (tableKey === 'events') return { ...tables, events: parseTable(tables.events) };
  if (tableKey === 'loot') return { ...tables, loot: parseTable(tables.loot) };
  if (tableKey === 'compl') return { ...tables, compl: parseTable(tables.compl) };
  if (tableKey === 'env') return { ...tables, env: parseTable(tables.env) };
  if (tableKey.startsWith('enc')) {
    const tier = Number(tableKey.slice(3));
    const enc = tables.enc.map((rows, index) => (index === tier ? parseTable(rows) : rows));
    return { ...tables, enc };
  }
  if (tableKey.startsWith('trap')) {
    const tier = Number(tableKey.slice(4));
    const trap = tables.trap.map((rows, index) => (index === tier ? parseTable(rows) : rows));
    return { ...tables, trap };
  }
  return tables;
}

export function gmBoardReducer(state, action) {
  switch (action.type) {
    case 'hydrate':
      return {
        ...state,
        ...action.payload.state,
        tables: action.payload.tables,
        results: action.payload.results,
        hexResult: null,
      };
    case 'setTab':
      return { ...state, tab: action.tab };
    case 'setCampaign':
      return { ...state, campaignId: action.campaignId || null };
    // The shared clock arriving from the campaign row: time and sky only. The
    // log is not touched — the cloud log is its own append-only table, and
    // merging the two would double every entry the GM can see.
    case 'applyClock':
      return {
        ...state,
        min: action.clock.min,
        day: action.clock.day,
        month: action.clock.month,
        year: action.clock.year,
        season: action.clock.season ?? state.season,
        meteo: action.clock.meteo ?? state.meteo,
        intensity: action.clock.intensity ?? state.intensity,
        hoursSinceWeather: action.clock.hoursSinceWeather,
        nextWeatherIn: action.clock.nextWeatherIn,
      };
    case 'setSeason':
      return { ...state, season: action.season };
    case 'setWeatherOverride':
      return { ...state, meteo: action.meteo, intensity: action.intensity };
    case 'setPop':
      return { ...state, pop: action.pop, popThr: action.popThr };
    case 'setTerrain':
      return { ...state, terrain: action.terrain, terrainH: action.terrainH };
    case 'setHexTier':
      return { ...state, hexTier: action.hexTier };
    case 'setDPop':
      return { ...state, dPop: action.dPop, dThr: action.dThr };
    case 'setDTier':
      return { ...state, dTier: action.dTier };
    case 'setQPop':
      return { ...state, qPop: action.qPop, qThr: action.qThr };
    case 'setQTier':
      return { ...state, qTier: action.qTier };
    case 'applyHexResult':
      return {
        ...state,
        min: action.result.time.min,
        day: action.result.time.day,
        month: action.result.time.month,
        year: action.result.time.year,
        hoursSinceWeather: action.result.hoursSinceWeather,
        nextWeatherIn: action.result.nextWeatherIn,
        meteo: action.result.meteo,
        intensity: action.result.intensity,
        log: pushLog(state.log, action.result.logEntry),
        hexResult: { steps: action.result.steps },
      };
    case 'setTimeOnly':
      return { ...state, min: action.min };
    case 'setStart':
      return {
        ...state,
        day: action.day,
        month: action.month,
        year: action.year,
        min: action.min,
        log: [],
        hexResult: null,
      };
    case 'clearLog':
      return { ...state, log: [] };
    case 'setDungeonResult':
      return { ...state, results: { ...state.results, dungeon: action.result } };
    case 'clearDungeon':
      return { ...state, results: { ...state.results, dungeon: null } };
    case 'setQuestResult':
      return { ...state, results: { ...state.results, quest: action.result } };
    case 'clearQuests':
      return { ...state, results: { ...state.results, quest: null } };
    case 'editTableCell':
      return { ...state, tables: setTableCell(state.tables, action.tableKey, action.matchField, action.matchValue, action.field, action.value) };
    case 'resetTables':
      return { ...state, tables: createDefaultTables() };
    default:
      return state;
  }
}
