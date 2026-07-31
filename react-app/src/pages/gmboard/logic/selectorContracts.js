import {
  SEASONS,
  WEATHER_OVERRIDE_OPTIONS,
  HEX_POPULATION_OPTIONS,
  TERRAIN_OPTIONS,
  DUNGEON_POPULATION_OPTIONS,
  QUEST_SCOPE_OPTIONS,
  TIER_OPTIONS,
} from './constants.js';

const SEASON_OPTIONS = SEASONS.map((s) => ({ id: s, label: s }));

// Single source of truth for every SelectorGroup/TierSelector call site on GM
// Board: the options it renders, the reducer action it dispatches, and how
// the resulting state maps back to an option identity. Both the components
// and the regression test read from here, so a selector can't silently stop
// highlighting its own selection (this exact bug happened once, for Terrain).
export const SELECTOR_CONTRACTS = Object.freeze({
  season: {
    options: SEASON_OPTIONS,
    getId: (o) => o.id,
    deriveValue: (state) => state.season,
    action: (o) => ({ type: 'setSeason', season: o.id }),
  },
  weatherOverride: {
    options: WEATHER_OVERRIDE_OPTIONS,
    getId: (o) => `${o.meteo}:${o.intensity}`,
    deriveValue: (state) => `${state.meteo}:${state.intensity}`,
    action: (o) => ({ type: 'setWeatherOverride', meteo: o.meteo, intensity: o.intensity }),
  },
  pop: {
    options: HEX_POPULATION_OPTIONS,
    getId: (o) => o.id,
    deriveValue: (state) => state.pop,
    action: (o) => ({ type: 'setPop', pop: o.id, popThr: o.thr }),
  },
  terrain: {
    options: TERRAIN_OPTIONS,
    getId: (o) => o.label,
    deriveValue: (state) => state.terrain,
    action: (o) => ({ type: 'setTerrain', terrain: o.label, terrainH: o.hours }),
  },
  dPop: {
    options: DUNGEON_POPULATION_OPTIONS,
    getId: (o) => o.id,
    deriveValue: (state) => state.dPop,
    action: (o) => ({ type: 'setDPop', dPop: o.id, dThr: o.thr }),
  },
  qPop: {
    options: QUEST_SCOPE_OPTIONS,
    getId: (o) => o.id,
    deriveValue: (state) => state.qPop,
    action: (o) => ({ type: 'setQPop', qPop: o.id, qThr: o.thr }),
  },
  hexTier: {
    options: TIER_OPTIONS,
    getId: (o) => o.tier,
    deriveValue: (state) => state.hexTier,
    action: (o) => ({ type: 'setHexTier', hexTier: o.tier }),
  },
  dTier: {
    options: TIER_OPTIONS,
    getId: (o) => o.tier,
    deriveValue: (state) => state.dTier,
    action: (o) => ({ type: 'setDTier', dTier: o.tier }),
  },
  qTier: {
    options: TIER_OPTIONS,
    getId: (o) => o.tier,
    deriveValue: (state) => state.qTier,
    action: (o) => ({ type: 'setQTier', qTier: o.tier }),
  },
});
