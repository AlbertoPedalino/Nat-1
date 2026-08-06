import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canEnterHex,
  clockFromResult,
  hexEntrySummary,
  hexTravelState,
  mergeBoardClock,
  missingHexSetup,
  populationOption,
  runHexEntry,
  terrainOption,
  tierOption,
} from './hexEntry.js';
import { createDefaultTables } from '../../pages/gmboard/logic/defaultTables.js';
import { createDefaultCoreState } from '../../pages/gmboard/logic/defaultState.js';

const BOARD = { ...createDefaultCoreState(), season: 'Summer' };
const HEX = { terrain: 'Forest', pop: 'frontier', tier: 2 };

// A fixed sequence beats a seeded PRNG here: the point is that the engine is
// reached and its numbers come back, not that any particular roll happened.
function sequence(values) {
  let index = 0;
  return () => {
    const value = values[index % values.length];
    index += 1;
    return value;
  };
}

test('a hex names its terrain, population and tier the way the board does', () => {
  assert.equal(terrainOption('Forest').hours, 4);
  assert.equal(terrainOption('forest').hours, 4, 'case is not identity');
  assert.equal(terrainOption('Swamp'), null);
  assert.equal(populationOption('frontier').thr, 2);
  assert.equal(tierOption(2).tier, 2);
  assert.equal(tierOption(9), null);
});

test('an unset hex says what it still needs instead of guessing', () => {
  assert.deepEqual(missingHexSetup({}, BOARD), ['terrain', 'population', 'tier']);
  assert.deepEqual(missingHexSetup(HEX, { ...BOARD, season: null }), ['season']);
  assert.equal(canEnterHex(HEX, BOARD), true);
});

test('the hex supplies the travel state, the board keeps the clock', () => {
  const state = hexTravelState({ ...BOARD, terrain: 'Road', terrainH: 1 }, HEX);
  assert.equal(state.terrain, 'Forest');
  assert.equal(state.terrainH, 4, 'the hex overrides whatever the board panel shows');
  assert.equal(state.popThr, 2);
  assert.equal(state.hexTier, 2);
  assert.equal(state.min, BOARD.min, 'the clock is the board\'s');
});

test('the campaign clock lays over the board without blanking what it has not set', () => {
  const merged = mergeBoardClock(BOARD, {
    min: 600, day: 3, month: 2, year: 1001, season: null, meteo: 'Rain', intensity: 'Heavy',
    hoursSinceWeather: 2, nextWeatherIn: 6,
  });
  assert.equal(merged.min, 600);
  assert.equal(merged.meteo, 'Rain');
  // A campaign that has never picked a season must not erase the board's.
  assert.equal(merged.season, 'Summer');
  assert.deepEqual(mergeBoardClock(BOARD, null), { ...BOARD });
});

test('entering a hex advances the clock and returns the engine steps', () => {
  const tables = createDefaultTables();
  const { result, clock } = runHexEntry({
    board: BOARD, hex: HEX, tables, rng: sequence([0.01, 0.5, 0.99]),
  });

  assert.ok(Array.isArray(result.steps) && result.steps.length > 0);
  assert.ok(typeof result.logEntry === 'string' && result.logEntry.length > 0);
  // Forest is four hours, and the clock started at midnight.
  assert.deepEqual(clock, clockFromResult(result));
  assert.equal(clock.min, 4 * 60);
  assert.ok(result.steps.some((step) => step.kind === 'popRoll'), 'the population roll is the gate');
});

test('the bubble says the outcome in one breath, and the dialog keeps the rest', () => {
  const quiet = hexEntrySummary({
    steps: [
      { kind: 'weatherChange', meteo: 'Rain', intensity: 'Light', d20: 4 },
      { kind: 'popRoll', d6: 5, threshold: 2, triggered: false },
      { kind: 'none' },
    ],
  });
  assert.equal(quiet.headline, 'No event');
  assert.deepEqual(quiet.lines, ['Weather: Rain (Light)', 'd6 5 vs 2']);

  const fight = hexEntrySummary({
    steps: [
      { kind: 'popRoll', d6: 1, threshold: 2, triggered: true },
      { kind: 'event', name: 'Wandering Monster', type: 'encounter' },
      { kind: 'encounter', label: 'Encounter Table', data: { diff: 'Hard' } },
    ],
  });
  assert.equal(fight.headline, 'Wandering Monster');
  assert.deepEqual(fight.lines, ['d6 1 vs 2', 'Encounter Table: Hard']);

  // A busy hex says all of it: stopping at three lines hid the loot behind the
  // encounter, and the GM had to open the dialog to learn there was any.
  const busy = hexEntrySummary({
    steps: [
      { kind: 'weatherChange', meteo: 'Snow', intensity: 'Heavy' },
      { kind: 'popRoll', d6: 1, threshold: 3 },
      { kind: 'event', name: 'Enemy Camp', type: 'camp_nemico' },
      { kind: 'encounter', label: 'Camp Difficulty', data: { diff: 'Deadly', lv: 7, xp: 1200 } },
      { kind: 'campLoot', data: { tipo: 'Coins', rarita: 'Rare' } },
      { kind: 'campSpotDc', sum: 14, disadvantage: true },
    ],
  });
  assert.deepEqual(busy.lines, [
    'Weather: Snow (Heavy)',
    'd6 1 vs 3',
    // Grouped the way the dialog groups it, which is the reader's locale.
    `Camp Difficulty: Deadly · Lv 7 · ${(1200).toLocaleString()} XP/PC`,
    'Loot: Coins · Rare',
    'Spot DC 14 (disadvantage)',
  ]);
  assert.equal(hexEntrySummary(null).headline, 'Travelled');
});

test('advancing only moves the clock, and rolls nothing for the hex', () => {
  const tables = createDefaultTables();
  const { result } = runHexEntry({
    board: BOARD, hex: HEX, tables, rng: sequence([0.01]), mode: 'advance',
  });
  assert.ok(!result.steps.some((step) => step.kind === 'popRoll'));
  assert.match(result.logEntry, /advanced without rolls/);
});

test('a hex nobody has set up refuses rather than rolling on empty settings', () => {
  const tables = createDefaultTables();
  assert.throws(
    () => runHexEntry({ board: BOARD, hex: { terrain: 'Forest' }, tables }),
    /population, tier/,
  );
  // Advancing needs less, but it still needs to know how long the hex takes.
  assert.throws(
    () => runHexEntry({ board: BOARD, hex: {}, tables, mode: 'advance' }),
    /terrain/,
  );
});
