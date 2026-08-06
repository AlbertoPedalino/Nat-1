export function createDefaultCoreState() {
  return {
    season: null, meteo: 'Clear', intensity: '', hoursSinceWeather: 0, nextWeatherIn: 8,
    min: 0, day: 1, month: 1, year: 1000, log: [],
    // The campaign this board keeps the clock for, or null for a board used on
    // its own. Part of the core state so it travels with the board's own save,
    // local and cloud alike; `campaigns.hexcrawl_board_id` is the pointer back,
    // and the one the map trusts.
    campaignId: null,
    pop: null, popThr: 0, terrain: null, terrainH: 0, hexTier: null,
    // What the party is travelling on, as a multiplier on its speed. One is on
    // foot, which is what every board saved before this had.
    mountSpeed: 1,
    dPop: null, dThr: 0, dTier: null,
    qPop: null, qThr: 0, qTier: null,
  };
}

export function createDefaultResults() {
  return { dungeon: null, quest: null };
}
