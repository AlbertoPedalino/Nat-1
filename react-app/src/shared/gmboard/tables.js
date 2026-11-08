// The board's tables: one lookup per table, and what a rolled row means. Every
// generator (hexcrawl, dungeon, quest, the Roll tab) reads a row through here,
// so a type's rules — what it chains into, which DC it asks for — live once.

// A loot row that found nothing, and the "no value" mark its columns carry.
export const NOTHING_FOUND = 'Nothing found';
const NO_VALUE = '—';
// The event row that rolls on the tier Trap Table.
const TRAP_EVENT = 'Env. Damage/Trap';

// Every table a board keeps: where its rows live in the board's `tables`
// (a tiered table holds one list per tier), the column a row is known by, the
// dice it is rolled with, and what it is called and feeds.
export const BOARD_TABLES = Object.freeze({
  weather: {
    key: 'weather', matchField: 's', dice: 'auto-checked', label: 'Seasonal Weather', tableName: 'Seasonal Weather Table', feeds: 'Hexcrawl',
  },
  event: {
    key: 'events', matchField: 'r', dice: '2d20', label: 'Event', tableName: 'Event Table', feeds: 'Hexcrawl, Quest',
  },
  loot: {
    key: 'loot', matchField: 'r', dice: '1d8+1d12', label: 'Loot', tableName: 'Loot Table', feeds: 'Hexcrawl, Dungeon, Quest',
  },
  compl: {
    key: 'compl', matchField: 'r', dice: '1d8+1d12', label: 'Complication', tableName: 'Complication Table', feeds: 'Dungeon',
  },
  encounter: {
    key: 'enc', matchField: 'r', dice: '2d20', tiered: true, label: 'Encounter', tableName: 'Encounter Table', feeds: 'Hexcrawl, Dungeon, Quest',
  },
  trap: {
    key: 'trap', matchField: 'r', dice: '1d8+1d12', tiered: true, label: 'Trap', tableName: 'Trap Table', feeds: 'Hexcrawl, Dungeon',
  },
  env: {
    key: 'env', matchField: 'r', dice: '1d8+1d12', label: 'Environment', tableName: 'Environment Severity Table', feeds: 'Dungeon',
  },
});

// A table's rows; `tier` (1–4) picks the list of a tiered one.
export function tableRows(tables, tableId, tier = 1) {
  const table = BOARD_TABLES[tableId];
  if (!table) return [];
  const rows = tables?.[table.key];
  return (table.tiered ? rows?.[tier - 1] : rows) || [];
}

// The board's tables with one cell of one row changed.
export function editTableCell(tables, { tableId, tier = 1, matchValue, field, value }) {
  const table = BOARD_TABLES[tableId];
  if (!table) return tables;
  const edit = (rows) => rows.map((row) => (row[table.matchField] === matchValue ? { ...row, [field]: value } : row));
  const rows = tables[table.key];
  return {
    ...tables,
    [table.key]: table.tiered ? rows.map((list, index) => (index === tier - 1 ? edit(list) : list)) : edit(rows),
  };
}

export function getEvent(tables, sum) {
  return tableRows(tables, 'event').find((e) => e.r === sum) || { name: NO_VALUE, type: 'nothing' };
}

export function getLoot(tables, sum) {
  return tableRows(tables, 'loot').find((e) => e.r === sum) || { type: NOTHING_FOUND, rarity: NO_VALUE, quality: NO_VALUE, value: NO_VALUE, extra: '' };
}

export function getCompl(tables, sum) {
  return tableRows(tables, 'compl').find((e) => e.r === sum) || { type: 'None' };
}

export function getEnc(tables, tier, sum) {
  return tableRows(tables, 'encounter', tier).find((e) => e.r === sum) || { diff: 'Low', lv: '?', xp: 0 };
}

export function getTrap(tables, tier, sum) {
  return tableRows(tables, 'trap', tier).find((e) => e.r === sum) || { type: 'Nuisance', lv: '?', dc: 10, damage: '?' };
}

export function getEnvSev(tables, sum) {
  return tableRows(tables, 'env').find((e) => e.r === sum) || { severity: 'Common' };
}

// What an event row is: 'encounter', 'loot', 'camp' (an enemy camp: spot it,
// fight it, loot it), 'trap', 'nothing', or 'other' (something to interact
// with). The type column says it, except for the trap, which is known by name.
export function eventKind(ev) {
  if (ev?.type === 'encounter' || ev?.type === 'loot' || ev?.type === 'nothing') return ev.type;
  if (ev?.type === 'camp_nemico') return 'camp';
  if (ev?.name === TRAP_EVENT) return 'trap';
  return 'other';
}

// The tables an event chains into, in order.
const EVENT_FOLLOW_UPS = Object.freeze({
  encounter: ['encounter'], loot: ['loot'], camp: ['encounter', 'loot'], trap: ['trap'],
});
export function eventFollowUps(kind) {
  return EVENT_FOLLOW_UPS[kind] || [];
}

// The check an event asks of the party, rolled with it: a camp to spot,
// something to interact with. A trap's DC is on its own row; encounters, loot
// and nothing ask for none.
export function eventDcLabel(kind) {
  if (kind === 'camp') return 'DC to spot the camp';
  if (kind === 'other') return 'DC to interact';
  return null;
}

export function isNothingFound(loot) {
  return !loot?.type || loot.type === NOTHING_FOUND;
}

// Whether a column holds a value ("—" and empty mean none).
export function hasTableValue(value) {
  return value != null && value !== '' && value !== NO_VALUE;
}
