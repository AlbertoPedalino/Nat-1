
export const LOG_STORE_LIMIT = 50;
export const LOG_RENDER_LIMIT = 30;
export const ROLL_HISTORY_LIMIT = 20;

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
