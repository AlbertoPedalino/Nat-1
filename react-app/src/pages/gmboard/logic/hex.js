import { rollDie, rollD8D12, rollD20D20 } from './rng.js';
import { advanceMinutes, formatDateTime } from './time.js';
import { effectiveHours, hasWeatherDisadvantage, runWeatherChecks } from './weather.js';
import { getEvent, getLoot, getEnc, getTrap } from './tables.js';

function weatherLogFragment(changes) {
  if (!changes.length) return '';
  const parts = changes.map((c) => `${c.meteo}${c.intensity ? ` (${c.intensity})` : ''} [d20=${c.d20}]`);
  return ` · [Weather: ${parts.join(' → ')}]`;
}

function weatherSteps(changes) {
  return changes.map((change, index) => ({
    kind: 'weatherChange',
    meteo: change.meteo,
    intensity: change.intensity,
    d20: change.d20,
    nextWeatherIn: change.nextWeatherIn,
    morePending: index < changes.length - 1,
  }));
}

function runWeatherPhase(state, tables, rng) {
  const result = runWeatherChecks({
    season: state.season,
    hoursSinceWeather: state.hoursSinceWeather,
    nextWeatherIn: state.nextWeatherIn,
    meteo: state.meteo,
    intensity: state.intensity,
  }, tables.weather, rng);
  return { result, steps: weatherSteps(result.changes), logFragment: weatherLogFragment(result.changes) };
}

function resolveDc(rng) {
  return rollD8D12(rng);
}

function resolveEventOutcome({ ev, hexTier, tables, disadvantage, rng }) {
  const steps = [];
  let logSuffix = '';

  if (ev.type === 'encounter') {
    const roll = rollD20D20(rng);
    const enc = getEnc(tables, hexTier, roll.sum);
    steps.push({ kind: 'encounter', label: 'Encounter Table', d1: roll.d1, d2: roll.d2, sum: roll.sum, data: enc });
  } else if (ev.type === 'loot') {
    const roll = resolveDc(rng);
    const loot = getLoot(tables, roll.sum);
    steps.push({ kind: 'loot', d8: roll.d8, d12: roll.d12, sum: roll.sum, data: loot });
    if (loot.tipo !== 'Nothing found') {
      const dc = resolveDc(rng);
      steps.push({ kind: 'lootDc', d8: dc.d8, d12: dc.d12, sum: dc.sum, disadvantage });
      logSuffix = ` · Loot:${loot.tipo} · DC=${dc.sum}${disadvantage ? ' (Weather Disadvantage)' : ''}`;
    } else {
      logSuffix = ' · Loot:nothing';
    }
  } else if (ev.type === 'camp_nemico') {
    const spotDc = resolveDc(rng);
    steps.push({ kind: 'campSpotDc', d8: spotDc.d8, d12: spotDc.d12, sum: spotDc.sum, disadvantage });
    const encRoll = rollD20D20(rng);
    const enc = getEnc(tables, hexTier, encRoll.sum);
    steps.push({ kind: 'encounter', label: 'Camp Difficulty', d1: encRoll.d1, d2: encRoll.d2, sum: encRoll.sum, data: enc });
    const lootRoll = resolveDc(rng);
    const loot = getLoot(tables, lootRoll.sum);
    steps.push({ kind: 'campLoot', d8: lootRoll.d8, d12: lootRoll.d12, sum: lootRoll.sum, data: loot });
    if (loot.tipo !== 'Nothing found') {
      const lootDc = resolveDc(rng);
      steps.push({ kind: 'campLootDc', d8: lootDc.d8, d12: lootDc.d12, sum: lootDc.sum, disadvantage });
      logSuffix = ` · DC=${spotDc.sum} · Loot:${loot.tipo} · DC=${lootDc.sum}${disadvantage ? ' (Weather Disadvantage)' : ''}`;
    } else {
      logSuffix = ` · DC=${spotDc.sum} · Loot:nothing`;
    }
  } else if (ev.name === 'Env. Damage/Trap') {
    const detectDc = resolveDc(rng);
    steps.push({ kind: 'trapDetectDc', d8: detectDc.d8, d12: detectDc.d12, sum: detectDc.sum, disadvantage });
    const trapRoll = resolveDc(rng);
    const trap = getTrap(tables, hexTier, trapRoll.sum);
    steps.push({ kind: 'trap', d8: trapRoll.d8, d12: trapRoll.d12, sum: trapRoll.sum, data: trap });
    logSuffix = ` · DC=${detectDc.sum} · Trap:${trap.tipo} DC${trap.dc} ${trap.danno}`;
  } else {
    const dc = resolveDc(rng);
    steps.push({ kind: 'genericDc', d8: dc.d8, d12: dc.d12, sum: dc.sum, disadvantage });
    logSuffix = ` · DC=${dc.sum}${disadvantage ? ' (Weather Disadvantage)' : ''}`;
  }

  return { steps, logSuffix };
}

export function resolveProceed(state, tables, rng = Math.random) {
  const travelHours = effectiveHours(state.terrainH, state.meteo, state.intensity);
  const time = advanceMinutes({ min: state.min, day: state.day, month: state.month, year: state.year }, travelHours);
  const hoursSinceWeather = state.hoursSinceWeather + travelHours;

  const weatherPhase = runWeatherPhase({ ...state, hoursSinceWeather }, tables, rng);
  const meteo = weatherPhase.result.meteo;
  const intensity = weatherPhase.result.intensity;
  const disadvantage = hasWeatherDisadvantage(meteo, intensity);

  const steps = [...weatherPhase.steps];

  const d6 = rollDie(6, rng);
  const triggered = d6 <= state.popThr;
  steps.push({ kind: 'popRoll', d6, threshold: state.popThr, triggered });

  let logEntry = `${formatDateTime(time)} · ${state.terrain} (${travelHours}h) · ${meteo} ${intensity}`.trim()
    + ` · d6=${d6}${weatherPhase.logFragment}`;

  if (!triggered) {
    steps.push({ kind: 'none' });
    logEntry += ' → No event';
    return {
      time, hoursSinceWeather: weatherPhase.result.hoursSinceWeather, nextWeatherIn: weatherPhase.result.nextWeatherIn,
      meteo, intensity, steps, logEntry,
    };
  }

  const evRoll = rollD20D20(rng);
  const ev = getEvent(tables, evRoll.sum);
  steps.push({ kind: 'event', name: ev.name, type: ev.type, d1: evRoll.d1, d2: evRoll.d2, sum: evRoll.sum });
  logEntry += ` → ${ev.name}`;

  const outcome = resolveEventOutcome({ ev, hexTier: state.hexTier, tables, disadvantage, rng });
  steps.push(...outcome.steps);
  logEntry += outcome.logSuffix;

  return {
    time, hoursSinceWeather: weatherPhase.result.hoursSinceWeather, nextWeatherIn: weatherPhase.result.nextWeatherIn,
    meteo, intensity, steps, logEntry,
  };
}

export function resolveAdvanceOnly(state, tables, rng = Math.random) {
  const travelHours = effectiveHours(state.terrainH, state.meteo, state.intensity);
  const time = advanceMinutes({ min: state.min, day: state.day, month: state.month, year: state.year }, travelHours);
  const hoursSinceWeather = state.hoursSinceWeather + travelHours;

  const weatherPhase = runWeatherPhase({ ...state, hoursSinceWeather }, tables, rng);
  const meteo = weatherPhase.result.meteo;
  const intensity = weatherPhase.result.intensity;

  const logEntry = `${formatDateTime(time)} · ${state.terrain} (${travelHours}h) · ${meteo} ${intensity}`.trim()
    + ` · advanced without rolls${weatherPhase.logFragment}`;

  return {
    time, hoursSinceWeather: weatherPhase.result.hoursSinceWeather, nextWeatherIn: weatherPhase.result.nextWeatherIn,
    meteo, intensity, steps: weatherPhase.steps, logEntry,
  };
}

export function resolveManualAdvance(state, hours, tables, rng = Math.random) {
  const time = advanceMinutes({ min: state.min, day: state.day, month: state.month, year: state.year }, hours);
  const hoursSinceWeather = state.hoursSinceWeather + hours;

  const weatherPhase = runWeatherPhase({ ...state, hoursSinceWeather }, tables, rng);

  return {
    time,
    hoursSinceWeather: weatherPhase.result.hoursSinceWeather,
    nextWeatherIn: weatherPhase.result.nextWeatherIn,
    meteo: weatherPhase.result.meteo,
    intensity: weatherPhase.result.intensity,
    steps: weatherPhase.steps,
    logEntry: null,
  };
}
