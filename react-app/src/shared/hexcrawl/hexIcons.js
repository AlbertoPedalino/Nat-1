import {
  FALLBACK_WEATHER_ICON, POPULATION_ICONS, SEASON_ICONS, TERRAIN_ICONS, WEATHER_ICONS,
} from '../ui/gameIcons.js';

// One icon vocabulary for the hexcrawl, shared by the GM Board and the map's
// corner panel: the same season, weather and terrain must read the same on both
// screens, since a GM moves between them mid-leg. Drawn in gameIcons.js.
export { FALLBACK_WEATHER_ICON, POPULATION_ICONS, SEASON_ICONS, TERRAIN_ICONS, WEATHER_ICONS };

export function weatherIcon(weather) {
  return WEATHER_ICONS[weather] || FALLBACK_WEATHER_ICON;
}
