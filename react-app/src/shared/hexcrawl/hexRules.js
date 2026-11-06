import { rollDie } from '../character/dice/dice.js';
import { rollD8D12, rollD20D20 } from '../gmboard/tableDice.js';
import { advanceMinutes, formatCampaignDateTime } from '../gmboard/campaignTime.js';
import { effectiveHours, hasWeatherDisadvantage, runWeatherChecks } from '../gmboard/weather.js';
import { getEvent, getLoot, getEnc, getTrap } from '../gmboard/tables.js';

function weatherLogFragment(changes) {
  if (!changes.length) return '';
  const parts = changes.map((c) => `${c.weather}${c.intensity ? ` (${c.intensity})` : ''} [d20=${c.d20}]`);
  return ` · [Weather: ${parts.join(' → ')}]`;
}

function weatherSteps(changes) {
  return changes.map((change, index) => ({
    kind: 'weatherChange',
    weather: change.weather,
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
    weather: state.weather,
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
    if (loot.type !== 'Nothing found') {
      const dc = resolveDc(rng);
      steps.push({ kind: 'lootDc', d8: dc.d8, d12: dc.d12, sum: dc.sum, disadvantage });
      logSuffix = ` · Loot:${loot.type} · DC=${dc.sum}${disadvantage ? ' (Weather Disadvantage)' : ''}`;
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
    if (loot.type !== 'Nothing found') {
      const lootDc = resolveDc(rng);
      steps.push({ kind: 'campLootDc', d8: lootDc.d8, d12: lootDc.d12, sum: lootDc.sum, disadvantage });
      logSuffix = ` · DC=${spotDc.sum} · Loot:${loot.type} · DC=${lootDc.sum}${disadvantage ? ' (Weather Disadvantage)' : ''}`;
    } else {
      logSuffix = ` · DC=${spotDc.sum} · Loot:nothing`;
    }
  } else if (ev.name === 'Env. Damage/Trap') {
    // A trap has one DC, the one on its table row: the same number finds it
    // and disarms it, so no separate detection DC is rolled.
    const trapRoll = resolveDc(rng);
    const trap = getTrap(tables, hexTier, trapRoll.sum);
    steps.push({ kind: 'trap', d8: trapRoll.d8, d12: trapRoll.d12, sum: trapRoll.sum, data: trap, disadvantage });
    logSuffix = ` · Trap:${trap.type} DC${trap.dc} ${trap.damage}${disadvantage ? ' (Weather Disadvantage)' : ''}`;
  } else {
    const dc = resolveDc(rng);
    steps.push({ kind: 'genericDc', d8: dc.d8, d12: dc.d12, sum: dc.sum, disadvantage });
    logSuffix = ` · DC=${dc.sum}${disadvantage ? ' (Weather Disadvantage)' : ''}`;
  }

  return { steps, logSuffix };
}

export function resolveProceed(state, tables, rng = Math.random) {
  const travelHours = effectiveHours(state.terrainH, state.weather, state.intensity, state.mountSpeed);
  const time = advanceMinutes({ min: state.min, day: state.day, month: state.month, year: state.year }, travelHours);
  const hoursSinceWeather = state.hoursSinceWeather + travelHours;

  const weatherPhase = runWeatherPhase({ ...state, hoursSinceWeather }, tables, rng);
  const weather = weatherPhase.result.weather;
  const intensity = weatherPhase.result.intensity;
  const disadvantage = hasWeatherDisadvantage(weather, intensity);

  const steps = [...weatherPhase.steps];

  const d6 = rollDie(6, rng);
  const triggered = d6 <= state.popThr;
  steps.push({ kind: 'popRoll', d6, threshold: state.popThr, triggered });

  let logEntry = `${formatCampaignDateTime(time)} · ${state.terrain} (${travelHours}h) · ${weather} ${intensity}`.trim()
    + ` · d6=${d6}${weatherPhase.logFragment}`;

  if (!triggered) {
    steps.push({ kind: 'none' });
    logEntry += ' → No event';
    return {
      time, hoursSinceWeather: weatherPhase.result.hoursSinceWeather, nextWeatherIn: weatherPhase.result.nextWeatherIn,
      weather, intensity, steps, logEntry, travelHours,
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
    weather, intensity, steps, logEntry, travelHours,
  };
}

export function resolveAdvanceOnly(state, tables, rng = Math.random) {
  const travelHours = effectiveHours(state.terrainH, state.weather, state.intensity, state.mountSpeed);
  const time = advanceMinutes({ min: state.min, day: state.day, month: state.month, year: state.year }, travelHours);
  const hoursSinceWeather = state.hoursSinceWeather + travelHours;

  const weatherPhase = runWeatherPhase({ ...state, hoursSinceWeather }, tables, rng);
  const weather = weatherPhase.result.weather;
  const intensity = weatherPhase.result.intensity;

  const logEntry = `${formatCampaignDateTime(time)} · ${state.terrain} (${travelHours}h) · ${weather} ${intensity}`.trim()
    + ` · advanced without rolls${weatherPhase.logFragment}`;

  return {
    time, hoursSinceWeather: weatherPhase.result.hoursSinceWeather, nextWeatherIn: weatherPhase.result.nextWeatherIn,
    weather, intensity, steps: weatherPhase.steps, logEntry, travelHours,
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
    weather: weatherPhase.result.weather,
    intensity: weatherPhase.result.intensity,
    steps: weatherPhase.steps,
    logEntry: null,
  };
}
