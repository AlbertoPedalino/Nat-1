export const DATA_BASE = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/';
export const BESTIARY_BASE = `${DATA_BASE}bestiary/`;
export const IMAGE_BASE = 'https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/';
export const FALLBACK_MONSTER_TOKEN = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-img/main/bestiary/tokens/XMM/Skeleton.webp';

export const PROJECT_ALLOWED_SOURCES = Object.freeze([
  'XPHB', 'XMM', 'XDMG', 'FRAIF', 'FRHOF', 'EFA', 'RWH', 'AU', 'AUD',
]);
export const PROJECT_TO_RAW_SOURCE = Object.freeze({
  XPHB: 'XPHB',
  XMM: 'XMM',
  XDMG: 'XDMG',
  FRAIF: 'FRAiF',
  FRHOF: 'FRHoF',
  EFA: 'EFA',
  RWH: 'RHW',
  AU: 'AU',
  AUD: 'AUD',
});
export const RAW_TO_PROJECT_SOURCE = Object.freeze(Object.fromEntries(
  Object.entries(PROJECT_TO_RAW_SOURCE).map(([project, raw]) => [raw, project]),
));
export const RAW_ALLOWED_SOURCES = Object.freeze(PROJECT_ALLOWED_SOURCES.map((source) => PROJECT_TO_RAW_SOURCE[source]));
export const SOURCE_LABELS = Object.freeze({
  XPHB: "Player's Handbook (2024)",
  XMM: 'Monster Manual (2024)',
  XDMG: "Dungeon Master's Guide (2024)",
  FRAiF: 'Forgotten Realms: Adventures in Faerun',
  FRHoF: 'Forgotten Realms: Heroes of Faerun',
  EFA: 'Eberron: Forge of the Artificer',
  RHW: 'Ravenloft: The Horrors Within',
  AU: 'Arcana Unleashed',
  AUD: 'Arcana Unleashed: Deadfall',
});

export const CR_XP = Object.freeze({
  0: 10,
  '1/8': 25,
  '1/4': 50,
  '1/2': 100,
  1: 200,
  2: 450,
  3: 700,
  4: 1100,
  5: 1800,
  6: 2300,
  7: 2900,
  8: 3900,
  9: 5000,
  10: 5900,
  11: 7200,
  12: 8400,
  13: 10000,
  14: 11500,
  15: 13000,
  16: 15000,
  17: 18000,
  18: 20000,
  19: 22000,
  20: 25000,
  21: 33000,
  22: 41000,
  23: 50000,
  24: 62000,
  25: 75000,
  26: 90000,
  27: 105000,
  28: 120000,
  29: 135000,
  30: 155000,
});
export const CR_ORDER = Object.freeze(['0', '1/8', '1/4', '1/2', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30']);

export const XT = Object.freeze([
  [50, 75, 100, 150],
  [100, 150, 200, 300],
  [150, 225, 400, 600],
  [250, 375, 500, 750],
  [500, 750, 1100, 1600],
  [600, 1000, 1400, 2100],
  [750, 1300, 1700, 2500],
  [1000, 1700, 2100, 3100],
  [1300, 2000, 2600, 3900],
  [1600, 2300, 3100, 4600],
  [1900, 2900, 4100, 6100],
  [2200, 3700, 4700, 7000],
  [2600, 4200, 5400, 8100],
  [2900, 4900, 6200, 9300],
  [3300, 5400, 7800, 11700],
  [3800, 6100, 9800, 14700],
  [4500, 7200, 11700, 17500],
  [5000, 8700, 14200, 21300],
  [5500, 10700, 17200, 25800],
  [6400, 13200, 22000, 33000],
]);

export const DIFFICULTY_LABELS = Object.freeze(['Low', 'Moderate', 'High', 'Deadly']);
export const DIFFICULTY_COLORS = Object.freeze(['#58b879', '#d69245', '#e27b3e', '#de675f']);
export const TYPE_OPTIONS = Object.freeze([
  'aberration',
  'beast',
  'celestial',
  'construct',
  'dragon',
  'elemental',
  'fey',
  'fiend',
  'giant',
  'humanoid',
  'monstrosity',
  'ooze',
  'plant',
  'undead',
]);
export const SIZE_LABELS = Object.freeze({ T: 'Tiny', S: 'Small', M: 'Medium', L: 'Large', H: 'Huge', G: 'Gargantuan' });
export const PLAYER_COLORS = Object.freeze(['#e05c5c', '#5c8fe0', '#5ce07a', '#e0b85c', '#b05ce0', '#5ce0d8', '#e07c5c', '#9de05c', '#e05cb0', '#5ca8e0']);
export const COMBAT_LABEL_SHAPES = Object.freeze(['■', '●', '⬟', '⬢', '▲', '◆', '★', '◉', '▼', '◈']);
export const COMBAT_LABEL_COLORS = Object.freeze(['#3498db', '#e74c3c', '#f1c40f', '#27ae60', '#9b59b6', '#e67e22', '#1abc9c', '#e91e63', '#00bcd4', '#ff5722']);
export const LOG_MAX = 60;
