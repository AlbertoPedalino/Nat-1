export function createDefaultCoreState() {
  return {
    season: null, meteo: 'Clear', intensity: '', hoursSinceWeather: 0, nextWeatherIn: 8,
    min: 0, day: 1, month: 1, year: 1000, log: [],
    pop: null, popThr: 0, terrain: null, terrainH: 0, hexTier: null,
    dPop: null, dThr: 0, dTier: null,
    qPop: null, qThr: 0, qTier: null,
  };
}

export function createDefaultResults() {
  return { dungeon: null, quest: null };
}
