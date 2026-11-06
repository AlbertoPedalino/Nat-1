import {
  Castle, CloudRain, CloudSun, Compass, Flower2, LeafyGreen, Mountain, Route,
  Snowflake, Sun, Tent, Trees, Wheat,
} from 'lucide-react';

// One icon vocabulary for the hexcrawl, shared by the GM Board and the map's
// corner panel: the same season, weather and terrain must read the same on both
// screens, since a GM moves between them mid-leg.

export const SEASON_ICONS = Object.freeze({
  Spring: Flower2, Summer: Sun, Autumn: LeafyGreen, Winter: Snowflake,
});

export const WEATHER_ICONS = Object.freeze({ Clear: Sun, Rain: CloudRain, Snow: Snowflake });

export const FALLBACK_WEATHER_ICON = CloudSun;

// Keyed by the terrain option id, and by its label too, because a hex stores the
// label rather than the id.
export const TERRAIN_ICONS = Object.freeze({
  road: Route, plains: Wheat, forest: Trees, mountain: Mountain,
  Road: Route, Plains: Wheat, Forest: Trees, Mountain,
});

export const POPULATION_ICONS = Object.freeze({
  unexplored: Compass, frontier: Tent, settled: Castle, random: Compass,
});
