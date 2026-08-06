import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

class MemoryStorage {
  constructor() { this.store = new Map(); }
  getItem(key) { return this.store.has(key) ? this.store.get(key) : null; }
  setItem(key, value) { this.store.set(key, String(value)); }
  removeItem(key) { this.store.delete(key); }
  clear() { this.store.clear(); }
  key(index) { return Array.from(this.store.keys())[index] ?? null; }
  get length() { return this.store.size; }
}

if (!globalThis.localStorage) {
  Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true });
}

const { daysInMonth, isLeapYear, advanceMinutes, formatHM, formatDate, validateStart } = await import('./time.js');
const { effectiveHours, hasWeatherDisadvantage, weatherEffectLabel, weatherTimerLabel, runWeatherChecks } = await import('./weather.js');
const { getEvent, getLoot, getEnc, getTrap, getCompl, getEnvSev } = await import('./tables.js');
const { rollDie, rollD8D12, rollD20D20 } = await import('./rng.js');
const { resolveProceed, resolveAdvanceOnly, resolveManualAdvance } = await import('./hex.js');
const { normalizeMountSpeed } = await import('./constants.js');
const { createDungeon, isValidRoomCount, roomCountInputFrom } = await import('./dungeon.js');
const { resolveCellCommit } = await import('./tableEdit.js');
const { createQuests } = await import('./quest.js');
const { migrateLegacyBoard, LEGACY_KEYS } = await import('./migration.js');
const { createDefaultTables } = await import('./defaultTables.js');
const { createDefaultCoreState, createDefaultResults } = await import('./defaultState.js');
const { gmBoardReducer, createInitialState } = await import('../state/reducer.js');
const { SELECTOR_CONTRACTS } = await import('./selectorContracts.js');
const { confirmDiscard } = await import('./confirmDiscard.js');
const storage = await import('../storage.js');

function seqRng(values) {
  let i = 0;
  return () => {
    if (i >= values.length) throw new Error('rng sequence exhausted');
    const v = values[i];
    i += 1;
    return v;
  };
}

// --- time.js ---

test('isLeapYear / daysInMonth handle February correctly', () => {
  assert.equal(isLeapYear(2000), true);
  assert.equal(isLeapYear(1900), false);
  assert.equal(isLeapYear(2024), true);
  assert.equal(daysInMonth(2, 2024), 29);
  assert.equal(daysInMonth(2, 2023), 28);
});

test('advanceMinutes rolls over day/month/year boundaries', () => {
  const next = advanceMinutes({ min: 23 * 60, day: 28, month: 2, year: 2023 }, 3);
  assert.deepEqual(next, { min: 120, day: 1, month: 3, year: 2023 });
});

test('advanceMinutes rolls over year boundary', () => {
  const next = advanceMinutes({ min: 0, day: 31, month: 12, year: 1000 }, 24);
  assert.deepEqual(next, { min: 0, day: 1, month: 1, year: 1001 });
});

test('formatHM and formatDate produce padded, readable output', () => {
  assert.equal(formatHM(65), '01:05');
  assert.equal(formatDate({ day: 3, month: 1, year: 1000 }), '3 January 1000');
});

test('validateStart rejects invalid dates and times', () => {
  assert.equal(validateStart({ day: 30, month: 2, year: 1000, time: '10:00' }), null);
  assert.equal(validateStart({ day: 1, month: 1, year: 1000, time: '24:00' }), null);
  assert.deepEqual(
    validateStart({ day: 5, month: 6, year: 1000, time: '08:30' }),
    { day: 5, month: 6, year: 1000, min: 510 },
  );
});

// --- weather.js ---

test('effectiveHours applies rain/snow multipliers', () => {
  assert.equal(effectiveHours(4, 'Clear', ''), 4);
  assert.equal(effectiveHours(4, 'Rain', 'Moderate'), 8);
  assert.equal(effectiveHours(4, 'Snow', 'Heavy'), 16);
  assert.equal(effectiveHours(0, 'Snow', 'Heavy'), 0);
});

// A mount is a rate, so it divides: it helps most exactly where the going is
// worst, and it never makes a hex free.
test('a mount divides the hours a hex costs', () => {
  assert.equal(effectiveHours(4, 'Clear', '', 2), 2);
  assert.equal(effectiveHours(4, 'Clear', '', 3), 1.25, 'rounded to the quarter hour');
  assert.equal(effectiveHours(4, 'Snow', 'Heavy', 4), 4, 'heavy snow quadruples what the mount quarters');
  assert.equal(effectiveHours(1, 'Clear', '', 20), 0.25, 'never free');
  assert.equal(effectiveHours(4, 'Clear', '', 1), 4);
  assert.equal(effectiveHours(4, 'Clear', '', 0), 4, 'nonsense is a party on foot');
  assert.equal(effectiveHours(0, 'Clear', '', 4), 0);

  assert.equal(normalizeMountSpeed(2), 2);
  assert.equal(normalizeMountSpeed('3'), 3);
  assert.equal(normalizeMountSpeed(1.37), 1.25);
  assert.equal(normalizeMountSpeed(0), 1);
  assert.equal(normalizeMountSpeed(-4), 1);
  assert.equal(normalizeMountSpeed('a horse'), 1);
  assert.equal(normalizeMountSpeed(999), 20);
});

test('hasWeatherDisadvantage matches heavy rain and moderate/heavy snow only', () => {
  assert.equal(hasWeatherDisadvantage('Rain', 'Heavy'), true);
  assert.equal(hasWeatherDisadvantage('Rain', 'Moderate'), false);
  assert.equal(hasWeatherDisadvantage('Snow', 'Moderate'), true);
  assert.equal(hasWeatherDisadvantage('Snow', 'Light'), false);
});

test('weatherEffectLabel describes travel multiplier per condition', () => {
  assert.equal(weatherEffectLabel('Clear', ''), 'No effect');
  assert.equal(weatherEffectLabel('Snow', 'Heavy'), '×4 travel · Disadvantage');
});

test('weatherTimerLabel shows a select-season placeholder with no season, else the check countdown', () => {
  assert.equal(weatherTimerLabel(null, 8, 3), '— select season —');
  assert.equal(weatherTimerLabel('Spring', 8, 3), 'Next check in 5h');
  assert.equal(weatherTimerLabel('Spring', 8, 10), 'Next check in 0h');
});

test('runWeatherChecks is a no-op without a season', () => {
  const result = runWeatherChecks({ season: null, hoursSinceWeather: 10, nextWeatherIn: 8, meteo: 'Clear', intensity: '' }, [], Math.random);
  assert.equal(result.changes.length, 0);
  assert.equal(result.hoursSinceWeather, 10);
});

test('runWeatherChecks applies one weather roll when threshold is crossed', () => {
  const table = createDefaultTables().weather;
  // interval reroll d6=1 -> +2 = 3; d20=5 (<=10 sole) -> Clear
  const rng = seqRng([0 / 6, 4 / 20]);
  const result = runWeatherChecks({ season: 'Spring', hoursSinceWeather: 8, nextWeatherIn: 8, meteo: 'Rain', intensity: 'Light' }, table, rng);
  assert.equal(result.changes.length, 1);
  assert.equal(result.changes[0].meteo, 'Clear');
  assert.equal(result.nextWeatherIn, 3);
  assert.equal(result.hoursSinceWeather, 0);
});

// --- tables.js ---

test('table getters fall back to a safe default for unknown rolls', () => {
  const tables = createDefaultTables();
  assert.equal(getEvent(tables, 2).name, 'Dungeon');
  assert.equal(getLoot(tables, 999).tipo, 'Nothing found');
  assert.equal(getEnc(tables, 1, 999).diff, 'Low');
  assert.equal(getTrap(tables, 1, 999).tipo, 'Nuisance');
  assert.equal(getCompl(tables, 999).type, 'None');
  assert.equal(getEnvSev(tables, 999).gravita, 'Common');
});

// --- rng.js ---

test('rollDie maps rng() into an inclusive 1..sides range using injected rng', () => {
  assert.equal(rollDie(6, () => 0), 1);
  assert.equal(rollDie(6, () => 0.999), 6);
});

test('rollD8D12 and rollD20D20 combine two dice deterministically', () => {
  const d8d12 = rollD8D12(seqRng([0, 0]));
  assert.deepEqual(d8d12, { d8: 1, d12: 1, sum: 2 });
  const d20d20 = rollD20D20(seqRng([0.999, 0.999]));
  assert.deepEqual(d20d20, { d1: 20, d2: 20, sum: 40 });
});

// --- hex.js ---

test('resolveProceed with no season/weather and a missed population roll produces a "no event" leg', () => {
  const tables = createDefaultTables();
  const state = { ...createDefaultCoreState(), terrain: 'Road', terrainH: 1, hexTier: 1, popThr: 1 };
  // d6=2 (index within rollDie mapping) misses threshold of 1
  const rng = seqRng([1 / 6]);
  const result = resolveProceed(state, tables, rng);
  assert.equal(result.steps.at(-1).kind, 'none');
  assert.match(result.logEntry, /No event$/);
});

test('resolveProceed triggers and resolves an encounter event deterministically', () => {
  const tables = createDefaultTables();
  const state = { ...createDefaultCoreState(), terrain: 'Road', terrainH: 1, hexTier: 1, popThr: 6 };
  // d6=1 triggers; event roll 2d20 sums to 6 -> Encounter; encounter roll 2d20 sums to 2
  const rng = seqRng([0, 0, 4 / 20, 0, 0]);
  const result = resolveProceed(state, tables, rng);
  const eventStep = result.steps.find((s) => s.kind === 'event');
  assert.equal(eventStep.name, 'Encounter');
  const encStep = result.steps.find((s) => s.kind === 'encounter');
  assert.equal(encStep.data.diff, 'High');
});

test('resolveAdvanceOnly moves time without a population/event roll', () => {
  const tables = createDefaultTables();
  const state = { ...createDefaultCoreState(), terrain: 'Road', terrainH: 2 };
  const result = resolveAdvanceOnly(state, tables, Math.random);
  assert.equal(result.time.min, 120);
  assert.ok(!result.steps.some((s) => s.kind === 'popRoll' || s.kind === 'event'));
});

test('resolveManualAdvance advances by the given hours with no log entry', () => {
  const tables = createDefaultTables();
  const state = createDefaultCoreState();
  const result = resolveManualAdvance(state, 5, tables, Math.random);
  assert.equal(result.time.min, 300);
  assert.equal(result.logEntry, null);
});

// --- dungeon.js ---

test('isValidRoomCount enforces the 1..40 integer range', () => {
  assert.equal(isValidRoomCount(1), true);
  assert.equal(isValidRoomCount(40), true);
  assert.equal(isValidRoomCount(0), false);
  assert.equal(isValidRoomCount(41), false);
  assert.equal(isValidRoomCount(1.5), false);
});

test('createDungeon builds the requested number of rooms with fixed population', () => {
  const tables = createDefaultTables();
  const dungeon = createDungeon({ roomCount: 3, popMode: 'unexplored', thr: 1, tier: 1 }, tables, Math.random);
  assert.equal(dungeon.rooms.length, 3);
  assert.ok(dungeon.rooms.every((room) => room.thr === 1 && room.slots.length === 1));
});

test('createDungeon derives id/createdAt from the injected clock, not Date.now', () => {
  const tables = createDefaultTables();
  const dungeon = createDungeon({ roomCount: 1, popMode: 'unexplored', thr: 1, tier: 1 }, tables, Math.random, () => 123456);
  assert.equal(dungeon.createdAt, 123456);
  assert.equal(dungeon.id, `dungeon_${(123456).toString(36)}`);
});

test('roomCountInputFrom seeds the room-count control from persisted results', () => {
  assert.equal(roomCountInputFrom(null), '6');
  assert.equal(roomCountInputFrom({}), '6');
  assert.equal(roomCountInputFrom({ dungeon: null }), '6');
  assert.equal(roomCountInputFrom({ dungeon: { config: { roomCount: 12 } } }), '12');
  assert.equal(roomCountInputFrom({ dungeon: { config: { roomCount: 0 } } }), '6');
});

test('a persisted 12-room dungeon config round-trips through storage without rerolling', () => {
  localStorage.clear();
  const tables = createDefaultTables();
  const dungeon = createDungeon({ roomCount: 12, popMode: 'unexplored', thr: 1, tier: 1 }, tables, Math.random, () => 111);
  storage.persistBoardState('dungeon-board', createDefaultCoreState());
  storage.persistBoardResults('dungeon-board', { ...createDefaultResults(), dungeon });

  const persisted = storage.readPersistedBoard('dungeon-board');
  assert.equal(persisted.results.dungeon.config.roomCount, 12);
  assert.equal(roomCountInputFrom(persisted.results), '12');
});

// --- tableEdit.js ---

test('resolveCellCommit keeps the previous value as an invalid draft when cleared or non-numeric', () => {
  assert.deepEqual(resolveCellCommit('', { numeric: true, previous: 10 }), { value: 10, valid: false });
  assert.deepEqual(resolveCellCommit('   ', { numeric: true, previous: 10 }), { value: 10, valid: false });
  assert.deepEqual(resolveCellCommit('abc', { numeric: true, previous: 10 }), { value: 10, valid: false });
});

test('resolveCellCommit parses valid numeric drafts, trimmed', () => {
  assert.deepEqual(resolveCellCommit('12', { numeric: true, previous: 10 }), { value: 12, valid: true });
  assert.deepEqual(resolveCellCommit(' 7 ', { numeric: true, previous: 10 }), { value: 7, valid: true });
  assert.deepEqual(resolveCellCommit('0', { numeric: true, previous: 10 }), { value: 0, valid: true });
});

test('resolveCellCommit passes text columns through unchanged', () => {
  assert.deepEqual(resolveCellCommit('Nothing found', { numeric: false, previous: 'x' }), { value: 'Nothing found', valid: true });
  assert.deepEqual(resolveCellCommit('', { numeric: false, previous: 'x' }), { value: '', valid: true });
});

// --- quest.js ---

test('createQuests applies the minimum-reward fallback when loot finds nothing', () => {
  const tables = createDefaultTables();
  // d8 count-roll -> 1 quest; event 2d20=40 -> Dungeon/other (no encounter);
  // loot 1d8+1d12=8 -> "Nothing found" -> minimum reroll at fixed roll 15
  const rng = seqRng([0, 0.999, 0.999, 0, 0.5]);
  const quests = createQuests({ scope: 'small', thr: 1, tier: 1 }, tables, rng);
  assert.equal(quests.count, 1);
  const [quest] = quests.quests;
  assert.equal(quest.encounter, null);
  assert.equal(quest.reward.isMinimum, true);
  assert.equal(quest.reward.data.tipo, 'Consumable');
});

test('createQuests count is the max of the rolled scope dice', () => {
  const tables = createDefaultTables();
  // numDice=3 (random scope maps to rollDie(3,...)); d8 rolls: 2, 5, 3 -> count = 5
  const values = [2 / 3, 1 / 8, 4 / 8, 2 / 8];
  const rng = seqRng(values.concat(Array(40).fill(0)));
  const quests = createQuests({ scope: 'random', thr: 0, tier: 1 }, tables, rng);
  assert.equal(quests.numDice, 3);
  assert.equal(quests.count, 5);
  assert.equal(quests.quests.length, 5);
});

test('createQuests derives id/createdAt from the injected clock, not Date.now', () => {
  const tables = createDefaultTables();
  const rng = seqRng([0, 0.999, 0.999, 0, 0.5]);
  const quests = createQuests({ scope: 'small', thr: 1, tier: 1 }, tables, rng, () => 654321);
  assert.equal(quests.createdAt, 654321);
  assert.equal(quests.id, `questset_${(654321).toString(36)}`);
});

// --- migration.js ---

test('migrateLegacyBoard maps legacy Italian weather/intensity/loot/complication/environment values', () => {
  const raw = {
    gm_state: JSON.stringify({ meteo: 'Pioggia', intensita: 'Forte', min: 90, day: 2, month: 3, year: 1000, log: ['x'] }),
    gm_lo: JSON.stringify([{ r: 2, tipo: 'Oggetto Maledetto', rarita: 'Leggendario', qualita: 'Corrotto', valore: '75×Lv', extra: '' }]),
    gm_co: JSON.stringify([{ r: 2, type: 'Niente' }]),
    gm_env: JSON.stringify([{ r: 2, gravita: 'Comune' }]),
  };
  const migrated = migrateLegacyBoard(raw);
  assert.equal(migrated.state.meteo, 'Rain');
  assert.equal(migrated.state.intensity, 'Heavy');
  assert.equal(migrated.tables.loot[0].tipo, 'Cursed Item');
  assert.equal(migrated.tables.loot[0].rarita, 'Legendary');
  assert.equal(migrated.tables.loot[0].qualita, 'Corrupted');
  assert.equal(migrated.tables.compl[0].type, 'None');
});

test('migrateLegacyBoard is idempotent on already-English values and falls back to defaults when absent', () => {
  const defaults = createDefaultTables();
  const migrated = migrateLegacyBoard({});
  assert.deepEqual(migrated.tables.loot, defaults.loot);
  assert.deepEqual(migrated.tables.env, defaults.env);

  const raw = { gm_lo: JSON.stringify(defaults.loot) };
  const migratedAgain = migrateLegacyBoard(raw);
  assert.deepEqual(migratedAgain.tables.loot, defaults.loot);
});

test('LEGACY_KEYS enumerates every scoped legacy key the migration reads', () => {
  assert.deepEqual(
    [...LEGACY_KEYS].sort(),
    ['gm_co', 'gm_enc0', 'gm_enc1', 'gm_enc2', 'gm_enc3', 'gm_env', 'gm_ev', 'gm_lo', 'gm_state',
      'gm_trap0', 'gm_trap1', 'gm_trap2', 'gm_trap3', 'gm_wea'].sort(),
  );
});

// --- storage.js ---

test('storage.js no longer exports a dead STORAGE_VERSION token', () => {
  assert.equal('STORAGE_VERSION' in storage, false);
});

test('resolveInstance("?board=new") creates a fresh unsaved id and asks to replace the URL', () => {
  const result = storage.resolveInstance('?board=new');
  assert.equal(result.saved, false);
  assert.equal(result.replaceSearch, `?board=${result.id}`);
});

test('resolveInstance treats an unknown board id as unsaved with no URL change', () => {
  const result = storage.resolveInstance('?board=totally-unknown-id');
  assert.equal(result.id, 'totally-unknown-id');
  assert.equal(result.saved, false);
  assert.equal(result.replaceSearch, '');
});

test('resolveInstance recognizes a registered saved board id', () => {
  localStorage.clear();
  storage.registerBoardInstance('board-a', 'Board A');
  const result = storage.resolveInstance('?board=board-a');
  assert.equal(result.id, 'board-a');
  assert.equal(result.saved, true);
});

test('resolveInstance with no query reuses the active board if known, else makes a new one', () => {
  localStorage.clear();
  const fresh = storage.resolveInstance('');
  assert.equal(fresh.saved, false);
  assert.ok(fresh.replaceSearch.startsWith('?board='));

  storage.registerBoardInstance('active-board', 'Active');
  const reused = storage.resolveInstance('');
  assert.equal(reused.id, 'active-board');
  assert.equal(reused.saved, true);
});

test('unsaved boards never write scoped storage keys', () => {
  localStorage.clear();
  const before = localStorage.length;
  const persisted = storage.readPersistedBoard('never-saved-board');
  assert.deepEqual(persisted.state, createDefaultCoreState());
  assert.deepEqual(persisted.results, createDefaultResults());
  assert.equal(localStorage.length, before);
});

test('registerBoardInstance writes the board registry and active id', () => {
  localStorage.clear();
  storage.registerBoardInstance('reg-board', 'My Board');
  const registry = storage.readRegistry();
  assert.ok(registry.some((entry) => entry.id === 'reg-board' && entry.name === 'My Board'));
  assert.equal(localStorage.getItem(storage.ACTIVE_KEY), 'reg-board');
});

test('persisted board state round-trips and stays isolated per board id', () => {
  localStorage.clear();
  const stateA = { ...createDefaultCoreState(), day: 5 };
  const stateB = { ...createDefaultCoreState(), day: 9 };
  storage.persistBoardState('board-a', stateA);
  storage.persistBoardState('board-b', stateB);

  const readA = storage.readPersistedBoard('board-a');
  const readB = storage.readPersistedBoard('board-b');
  assert.equal(readA.state.day, 5);
  assert.equal(readB.state.day, 9);
});

// --- reducer.js ---

test('reducer applies selector/time actions', () => {
  let state = createInitialState();
  state = gmBoardReducer(state, { type: 'setSeason', season: 'Winter' });
  assert.equal(state.season, 'Winter');
  state = gmBoardReducer(state, { type: 'setPop', pop: 'settled', popThr: 3 });
  assert.equal(state.pop, 'settled');
  assert.equal(state.popThr, 3);
  state = gmBoardReducer(state, { type: 'setTerrain', terrain: 'Forest', terrainH: 4 });
  assert.equal(state.terrainH, 4);
  state = gmBoardReducer(state, { type: 'setHexTier', hexTier: 2 });
  assert.equal(state.hexTier, 2);
  state = gmBoardReducer(state, { type: 'setStart', day: 1, month: 1, year: 1005, min: 0 });
  assert.equal(state.year, 1005);
  assert.deepEqual(state.log, []);
});

test('reducer applyHexResult updates time/weather/log and clearLog empties the log', () => {
  let state = createInitialState();
  const result = {
    time: { min: 60, day: 2, month: 1, year: 1000 },
    hoursSinceWeather: 1,
    nextWeatherIn: 8,
    meteo: 'Rain',
    intensity: 'Light',
    steps: [{ kind: 'none' }],
    logEntry: 'test entry',
  };
  state = gmBoardReducer(state, { type: 'applyHexResult', result });
  assert.equal(state.log[0], 'test entry');
  assert.equal(state.meteo, 'Rain');
  assert.deepEqual(state.hexResult, { steps: result.steps });
  state = gmBoardReducer(state, { type: 'clearLog' });
  assert.deepEqual(state.log, []);
});

test('reducer stores and clears dungeon/quest results', () => {
  let state = createInitialState();
  const dungeon = { id: 'd1', rooms: [] };
  state = gmBoardReducer(state, { type: 'setDungeonResult', result: dungeon });
  assert.equal(state.results.dungeon, dungeon);
  state = gmBoardReducer(state, { type: 'clearDungeon' });
  assert.equal(state.results.dungeon, null);

  const quest = { id: 'q1', quests: [] };
  state = gmBoardReducer(state, { type: 'setQuestResult', result: quest });
  assert.equal(state.results.quest, quest);
  state = gmBoardReducer(state, { type: 'clearQuests' });
  assert.equal(state.results.quest, null);
});

test('reducer editTableCell edits a single row/field without touching others, and resetTables restores defaults', () => {
  let state = createInitialState();
  state = gmBoardReducer(state, { type: 'editTableCell', tableKey: 'events', matchField: 'r', matchValue: 2, field: 'name', value: '<b>Hacked</b>' });
  assert.equal(state.tables.events.find((e) => e.r === 2).name, '<b>Hacked</b>');
  assert.equal(state.tables.events.find((e) => e.r === 3).name, 'Cave');

  state = gmBoardReducer(state, { type: 'editTableCell', tableKey: 'enc1', matchField: 'r', matchValue: 2, field: 'xp', value: '999' });
  assert.equal(state.tables.enc[1].find((e) => e.r === 2).xp, '999');

  state = gmBoardReducer(state, { type: 'resetTables' });
  assert.deepEqual(state.tables, createDefaultTables());
});

// --- selectorContracts.js ---

test('every selector contract dispatches a state value that matches the option identity it compares against', () => {
  const contractNames = Object.keys(SELECTOR_CONTRACTS);
  assert.deepEqual(
    contractNames.sort(),
    ['dPop', 'dTier', 'hexTier', 'pop', 'qPop', 'qTier', 'season', 'terrain', 'weatherOverride'].sort(),
  );

  for (const name of contractNames) {
    const contract = SELECTOR_CONTRACTS[name];
    assert.ok(contract.options.length > 0, `${name} has no options`);
    for (const option of contract.options) {
      const state = gmBoardReducer(createInitialState(), contract.action(option));
      assert.equal(
        contract.deriveValue(state),
        contract.getId(option),
        `${name} option ${JSON.stringify(option)} does not round-trip through its own contract`,
      );
    }
  }
});

// --- confirmDiscard.js ---

test('confirmDiscard returns false and signals no discard when the injected confirm is declined', () => {
  let called = null;
  const declined = confirmDiscard('Discard?', (msg) => { called = msg; return false; });
  assert.equal(declined, false);
  assert.equal(called, 'Discard?');
});

test('confirmDiscard returns true when the injected confirm is accepted', () => {
  const accepted = confirmDiscard('Discard?', () => true);
  assert.equal(accepted, true);
});

// --- no remaining reference to the retired standalone tool ---

test('no GM Board source file references the deleted public/tools/gmboard.html or StandaloneHtmlFrame', () => {
  const selfPath = fileURLToPath(import.meta.url);
  const srcDir = path.resolve(path.dirname(selfPath), '..', '..', '..');
  const needle1 = ['gmboard', '.html'].join('');
  const needle2 = ['Standalone', 'HtmlFrame'].join('');
  const offenders = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (/\.(jsx?|css)$/.test(entry.name) && full !== selfPath) {
        const content = fs.readFileSync(full, 'utf8');
        if (content.includes(needle1) || content.includes(needle2)) {
          offenders.push(full);
        }
      }
    }
  }

  walk(srcDir);
  assert.deepEqual(offenders, []);
});
