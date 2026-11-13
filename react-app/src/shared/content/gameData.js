// The 5etools data and images the app reads, from one place.
//
// Every JSON file is downloaded at most once per session and shared by every
// reader (builder, sheet, compendium, bestiary, weapon masteries, summoned
// creatures), through fetchJsonOnce.

import { fetchJsonOnce } from '../fetchJsonOnce.js';

export const GAME_DATA_BASE = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/';
export const GAME_IMAGE_BASE = 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/';
export const FALLBACK_MONSTER_TOKEN = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-img/main/bestiary/tokens/XMM/Skeleton.webp';

// `path` is relative to the data folder: 'races.json', 'class/class-wizard.json'.
export function loadGameData(path) {
  return fetchJsonOnce(GAME_DATA_BASE + String(path || '').replace(/^\/+/, ''));
}
