import { rollDie } from './rng.js';

export function effectiveHours(terrainHours, meteo, intensity) {
  if (!terrainHours) return 0;
  let hours = terrainHours;
  if (meteo === 'Rain') {
    if (intensity === 'Moderate' || intensity === 'Heavy') hours *= 2;
  } else if (meteo === 'Snow') {
    if (intensity === 'Light' || intensity === 'Moderate') hours *= 2;
    if (intensity === 'Heavy') hours *= 4;
  }
  return hours;
}

export function weatherEffectLabel(meteo, intensity) {
  if (meteo === 'Rain') {
    if (intensity === 'Light') return '×1 travel';
    if (intensity === 'Moderate') return '×2 travel';
    if (intensity === 'Heavy') return '×2 travel · Disadvantage';
  } else if (meteo === 'Snow') {
    if (intensity === 'Light') return '×2 travel';
    if (intensity === 'Moderate') return '×2 travel · Disadvantage';
    if (intensity === 'Heavy') return '×4 travel · Disadvantage';
  }
  return 'No effect';
}

export function weatherTimerLabel(season, nextWeatherIn, hoursSinceWeather) {
  if (!season) return '— select season —';
  return `Next check in ${Math.max(nextWeatherIn - hoursSinceWeather, 0)}h`;
}

export function hasWeatherDisadvantage(meteo, intensity) {
  return (meteo === 'Rain' && intensity === 'Heavy')
    || (meteo === 'Snow' && (intensity === 'Moderate' || intensity === 'Heavy'));
}

export function runWeatherChecks({ season, hoursSinceWeather, nextWeatherIn, meteo, intensity }, weatherTable, rng = Math.random) {
  let hours = hoursSinceWeather;
  let interval = nextWeatherIn;
  let currentMeteo = meteo;
  let currentIntensity = intensity;
  const changes = [];

  if (!season) {
    return { hoursSinceWeather: hours, nextWeatherIn: interval, meteo: currentMeteo, intensity: currentIntensity, changes };
  }

  while (hours >= interval) {
    hours -= interval;
    interval = rollDie(6, rng) + 2;

    const d20 = rollDie(20, rng);
    const seasonData = weatherTable.find((w) => w.s === season) || { sole: 10, pioggia: 19 };
    let nextMeteo = 'Clear';
    if (d20 <= seasonData.sole) nextMeteo = 'Clear';
    else if (d20 <= seasonData.pioggia) nextMeteo = 'Rain';
    else nextMeteo = 'Snow';

    let nextIntensity = '';
    if (nextMeteo !== 'Clear') {
      const d6 = rollDie(6, rng);
      nextIntensity = d6 <= 3 ? 'Light' : d6 <= 5 ? 'Moderate' : 'Heavy';
    }

    currentMeteo = nextMeteo;
    currentIntensity = nextIntensity;
    changes.push({ meteo: nextMeteo, intensity: nextIntensity, d20, nextWeatherIn: interval });
  }

  return { hoursSinceWeather: hours, nextWeatherIn: interval, meteo: currentMeteo, intensity: currentIntensity, changes };
}
