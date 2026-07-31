export const SEASONS = Object.freeze(['Spring', 'Summer', 'Autumn', 'Winter']);

export const WEATHER_OVERRIDE_OPTIONS = Object.freeze([
  { meteo: 'Clear', intensity: '', label: 'Clear', sub: '' },
  { meteo: 'Rain', intensity: 'Light', label: 'Light', sub: '×1 time' },
  { meteo: 'Rain', intensity: 'Moderate', label: 'Moderate', sub: '×2 time' },
  { meteo: 'Rain', intensity: 'Heavy', label: 'Heavy', sub: '×2 + Dis' },
  { meteo: 'Snow', intensity: 'Light', label: 'Light', sub: '×2 time' },
  { meteo: 'Snow', intensity: 'Moderate', label: 'Moderate', sub: '×2 + Dis' },
  { meteo: 'Snow', intensity: 'Heavy', label: 'Heavy', sub: '×4 + Dis' },
]);

export const TERRAIN_OPTIONS = Object.freeze([
  { id: 'road', label: 'Road', hours: 1, sub: '+1h' },
  { id: 'plains', label: 'Plains', hours: 2, sub: '+2h' },
  { id: 'forest', label: 'Forest', hours: 4, sub: '+4h' },
  { id: 'mountain', label: 'Mountain', hours: 8, sub: '+8h' },
]);

export const HEX_POPULATION_OPTIONS = Object.freeze([
  { id: 'unexplored', label: 'Unexplored', thr: 1, sub: 'trigger: 1 only' },
  { id: 'frontier', label: 'Frontier', thr: 2, sub: 'trigger: 1–2' },
  { id: 'settled', label: 'Settled', thr: 3, sub: 'trigger: 1–3' },
]);

export const DUNGEON_POPULATION_OPTIONS = Object.freeze([
  { id: 'random', label: 'Random', thr: 0, sub: '1–3 random' },
  { id: 'unexplored', label: 'Unexplored', thr: 1, sub: '×1 roll' },
  { id: 'frontier', label: 'Frontier', thr: 2, sub: '×2 rolls' },
  { id: 'settled', label: 'Settled', thr: 3, sub: '×3 rolls' },
]);

export const DUNGEON_ROOM_POP_LABELS = Object.freeze({
  1: 'Unexplored',
  2: 'Peripheral',
  3: 'Populated',
});

export const QUEST_SCOPE_OPTIONS = Object.freeze([
  { id: 'random', label: 'Random', thr: 0, sub: '1–3 d8 random' },
  { id: 'small', label: 'Small', thr: 1, sub: '1d8' },
  { id: 'medium', label: 'Medium', thr: 2, sub: '2d8 max' },
  { id: 'large', label: 'Large', thr: 3, sub: '3d8 max' },
]);

export const TIER_OPTIONS = Object.freeze([
  { tier: 1, label: 'Tier 1', shortLabel: 'T1', levels: 'Levels 1–4', shortLevels: 'Lv 1–4' },
  { tier: 2, label: 'Tier 2', shortLabel: 'T2', levels: 'Levels 5–10', shortLevels: 'Lv 5–10' },
  { tier: 3, label: 'Tier 3', shortLabel: 'T3', levels: 'Levels 11–16', shortLevels: 'Lv 11–16' },
  { tier: 4, label: 'Tier 4', shortLabel: 'T4', levels: 'Levels 17–20', shortLevels: 'Lv 17–20' },
]);

export const LOG_STORE_LIMIT = 50;
export const LOG_RENDER_LIMIT = 30;

export const EDITOR_TABS = Object.freeze([
  { id: 'ed-weather', label: 'Seasonal Weather', tableName: 'Seasonal Weather Table', group: 'Shared tables', feeds: 'Hexcrawl', roll: 'auto-checked' },
  { id: 'ed-event', label: 'Event', tableName: 'Event Table', group: 'Shared tables', feeds: 'Hexcrawl, Quest', roll: '2d20' },
  { id: 'ed-loot', label: 'Loot', tableName: 'Loot Table', group: 'Shared tables', feeds: 'Hexcrawl, Dungeon, Quest', roll: '1d8+1d12' },
  { id: 'ed-compl', label: 'Complication', tableName: 'Complication Table', group: 'Shared tables', feeds: 'Dungeon', roll: '1d8+1d12' },
  { id: 'ed-enc1', label: 'Encounter T1', tableName: 'Encounter Table Tier 1 (Lv 1–4)', group: 'Encounter tiers', feeds: 'Hexcrawl, Dungeon, Quest', roll: '2d20', tier: 1 },
  { id: 'ed-enc2', label: 'Encounter T2', tableName: 'Encounter Table Tier 2 (Lv 5–10)', group: 'Encounter tiers', feeds: 'Hexcrawl, Dungeon, Quest', roll: '2d20', tier: 2 },
  { id: 'ed-enc3', label: 'Encounter T3', tableName: 'Encounter Table Tier 3 (Lv 11–16)', group: 'Encounter tiers', feeds: 'Hexcrawl, Dungeon, Quest', roll: '2d20', tier: 3 },
  { id: 'ed-enc4', label: 'Encounter T4', tableName: 'Encounter Table Tier 4 (Lv 17–20)', group: 'Encounter tiers', feeds: 'Hexcrawl, Dungeon, Quest', roll: '2d20', tier: 4 },
  { id: 'ed-trap1', label: 'Trap T1', tableName: 'Trap Table Tier 1 (Lv 1–4)', group: 'Trap tiers', feeds: 'Hexcrawl, Dungeon', roll: '1d8+1d12', tier: 1 },
  { id: 'ed-trap2', label: 'Trap T2', tableName: 'Trap Table Tier 2 (Lv 5–10)', group: 'Trap tiers', feeds: 'Hexcrawl, Dungeon', roll: '1d8+1d12', tier: 2 },
  { id: 'ed-trap3', label: 'Trap T3', tableName: 'Trap Table Tier 3 (Lv 11–16)', group: 'Trap tiers', feeds: 'Hexcrawl, Dungeon', roll: '1d8+1d12', tier: 3 },
  { id: 'ed-trap4', label: 'Trap T4', tableName: 'Trap Table Tier 4 (Lv 17–20)', group: 'Trap tiers', feeds: 'Hexcrawl, Dungeon', roll: '1d8+1d12', tier: 4 },
  { id: 'ed-env', label: 'Environment', tableName: 'Environment Severity Table', group: 'Shared tables', feeds: 'Dungeon', roll: '1d8+1d12' },
]);
