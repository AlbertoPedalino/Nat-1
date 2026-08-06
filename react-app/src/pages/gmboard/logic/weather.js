import { rollDie } from './rng.js';

// How long a hex takes: the terrain, what the sky is doing to it, and what the
// party is riding. The mount divides rather than subtracts — a mount is a rate,
// so it helps most exactly where the going is worst.
//
// Rounded to the quarter hour: the clock is read to the minute, and a third of
// a four-hour forest is not worth carrying to seven decimal places.
export function effectiveHours(terrainHours, meteo, intensity, mountSpeed = 1) {
  if (!terrainHours) return 0;
  let hours = terrainHours;
  if (meteo === 'Rain') {
    if (intensity === 'Moderate' || intensity === 'Heavy') hours *= 2;
  } else if (meteo === 'Snow') {
    if (intensity === 'Light' || intensity === 'Moderate') hours *= 2;
    if (intensity === 'Heavy') hours *= 4;
  }
  const speed = Number(mountSpeed) > 0 ? Number(mountSpeed) : 1;
  if (speed === 1) return hours;
  // Never free: a hex crossed at speed is still a quarter hour of the day.
  return Math.max(0.25, Math.round((hours / speed) * 4) / 4);
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
