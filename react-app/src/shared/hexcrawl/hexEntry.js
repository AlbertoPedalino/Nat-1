// Entering a hex on the map, resolved by the GM Board's own engine.
//
// The engine is not copied here and must never be: `resolveProceed` is the
// hexcrawl, tables and all, and a second implementation living in the VTT would
// drift the first time somebody edits a table. This module is the seam that lets
// the map call it — it turns "the party walked into hex (q, r)" into the state
// shape the resolver already expects, and turns the result back into the four
// clock fields anybody storing it needs.
//
// Pure: no Supabase, no React. The cloud module writes what this returns.

import {
  HEX_POPULATION_OPTIONS,
  TERRAIN_OPTIONS,
  TIER_OPTIONS,
} from '../../pages/gmboard/logic/constants.js';
import { resolveAdvanceOnly, resolveProceed } from '../../pages/gmboard/logic/hex.js';

export const HEX_STATUSES = Object.freeze(['unexplored', 'frontier', 'settled']);

// Terrain is stored by its label, which is the identity the board's own selector
// uses. Anything unknown resolves to nothing rather than to a default: a hex
// with no terrain is not a road, it is a hex nobody has set up yet.
export function terrainOption(value) {
  const label = String(value || '').trim().toLowerCase();
  return TERRAIN_OPTIONS.find((option) => option.label.toLowerCase() === label) || null;
}

export function populationOption(value) {
  const id = String(value || '').trim().toLowerCase();
  return HEX_POPULATION_OPTIONS.find((option) => option.id === id) || null;
}

export function tierOption(value) {
  const tier = Number(value);
  return TIER_OPTIONS.find((option) => option.tier === tier) || null;
}

// What a hex still needs before the party can walk into it. Returned as names so
// the panel can say which ones, the way the board's own Travel panel does.
export function missingHexSetup(hex, board) {
  const missing = [];
  if (!board?.season) missing.push('season');
  if (!terrainOption(hex?.terrain)) missing.push('terrain');
  if (!populationOption(hex?.pop)) missing.push('population');
  if (!tierOption(hex?.tier)) missing.push('tier');
  return missing;
}

export function canEnterHex(hex, board) {
  return missingHexSetup(hex, board).length === 0;
}

// The board's travelling state, with the hex's own terrain, population and tier
// standing in for whatever the Travel panel happens to be showing. The map is
// the authority on where the party is; the board is the authority on what time
// it is and what the sky is doing.
export function hexTravelState(board, hex) {
  const terrain = terrainOption(hex?.terrain);
  const population = populationOption(hex?.pop);
  const tier = tierOption(hex?.tier);
  return {
    ...board,
    terrain: terrain ? terrain.label : null,
    terrainH: terrain ? terrain.hours : 0,
    pop: population ? population.id : null,
    popThr: population ? population.thr : 0,
    hexTier: tier ? tier.tier : null,
  };
}

// The clock and sky as they are after a hex, in the shape both the reducer and
// the `campaign_hexcrawl` row store. Kept in one place so the two cannot drift:
// they are the same numbers under different names otherwise.
export function clockFromResult(result) {
  return {
    min: result.time.min,
    day: result.time.day,
    month: result.time.month,
    year: result.time.year,
    hoursSinceWeather: result.hoursSinceWeather,
    nextWeatherIn: result.nextWeatherIn,
    meteo: result.meteo,
    intensity: result.intensity,
  };
}

// The board's own state with the campaign's clock laid over it. Spreading the
// cloud row wholesale would be wrong in a way that is hard to see: its `season`
// is null until somebody sets one, and null would silently blank the board's —
// leaving a hexcrawl that refuses to roll and does not say why.
export function mergeBoardClock(boardState, clock) {
  if (!clock) return { ...boardState };
  return {
    ...boardState,
    min: clock.min ?? boardState.min,
    day: clock.day ?? boardState.day,
    month: clock.month ?? boardState.month,
    year: clock.year ?? boardState.year,
    hoursSinceWeather: clock.hoursSinceWeather ?? boardState.hoursSinceWeather,
    nextWeatherIn: clock.nextWeatherIn ?? boardState.nextWeatherIn,
    meteo: clock.meteo || boardState.meteo,
    intensity: clock.intensity || boardState.intensity,
    // The season is the board's until the campaign has one of its own.
    season: clock.season || boardState.season,
  };
}

// The same eight fields taken from a board-shaped state rather than from a
// result. Used to seed a campaign's clock the first time it is written: without
// it the row would start at the schema's defaults and quietly disagree with the
// board the GM has been keeping time on.
export function clockFromState(state) {
  return {
    min: state?.min ?? 0,
    day: state?.day ?? 1,
    month: state?.month ?? 1,
    year: state?.year ?? 1,
    hoursSinceWeather: state?.hoursSinceWeather ?? 0,
    nextWeatherIn: state?.nextWeatherIn ?? 0,
    meteo: state?.meteo || 'Clear',
    intensity: state?.intensity || '',
    season: state?.season || null,
  };
}

// The one-breath version of a hex entry, for the bubble that appears over the
// hex the moment it is clicked. The dialog still holds every roll; this is what
// the GM says out loud before reading it.
export function hexEntrySummary(result) {
  const steps = result?.steps || [];
  const step = (kind) => steps.find((item) => item.kind === kind);
  const event = step('event');
  const pop = step('popRoll');
  const weather = steps.filter((item) => item.kind === 'weatherChange').pop();

  const lines = [];
  if (weather) {
    lines.push(`Weather: ${weather.meteo}${weather.intensity ? ` (${weather.intensity})` : ''}`);
  }
  if (pop) lines.push(`d6 ${pop.d6} vs ${pop.threshold}`);

  const encounter = step('encounter');
  const loot = step('loot') || step('campLoot');
  const trap = step('trap');
  if (encounter?.data?.diff) lines.push(`${encounter.label || 'Encounter'}: ${encounter.data.diff}`);
  if (loot?.data?.tipo) lines.push(`Loot: ${loot.data.tipo}`);
  if (trap?.data?.tipo) lines.push(`Trap: ${trap.data.tipo}${trap.data.dc ? ` DC${trap.data.dc}` : ''}`);
  const dc = step('lootDc') || step('campSpotDc') || step('trapDetectDc') || step('genericDc');
  if (dc?.sum != null) lines.push(`DC ${dc.sum}${dc.disadvantage ? ' (disadvantage)' : ''}`);

  return {
    // No event is a result, not an absence: the party spent the hours either way.
    headline: event?.name || (steps.some((item) => item.kind === 'none') ? 'No event' : 'Travelled'),
    lines: lines.slice(0, 3),
  };
}

// `mode: 'proceed'` rolls for what happens; `'advance'` only moves the clock and
// the weather, for a hex the GM has already narrated.
export function runHexEntry({
  board, hex, tables, rng = Math.random, mode = 'proceed',
} = {}) {
  if (!board || !tables) throw new Error('The hexcrawl needs a board and its tables.');
  const state = hexTravelState(board, hex);
  const missing = missingHexSetup(hex, board);
  if (mode === 'proceed' && missing.length) {
    throw new Error(`This hex still needs its ${missing.join(', ')}.`);
  }
  // Advancing needs a terrain to know how long it takes, and a season for the
  // weather. The rest only matters once dice are involved.
  if (mode !== 'proceed' && (!state.terrain || !board.season)) {
    throw new Error('This hex still needs its terrain, and the board its season.');
  }

  const result = mode === 'proceed'
    ? resolveProceed(state, tables, rng)
    : resolveAdvanceOnly(state, tables, rng);

  return { result, clock: clockFromResult(result), state };
}
