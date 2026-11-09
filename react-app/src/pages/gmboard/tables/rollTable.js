import { rollD8D12, rollD20D20 } from '../../../shared/gmboard/tableDice.js';
import {
  BOARD_TABLES, eventDcLabel, eventFollowUps, eventKind, getEvent, getLoot, getCompl, getEnc, getTrap, getEnvSev, hasTableValue, isNothingFound,
} from '../../../shared/gmboard/tables.js';
import { diceText } from '../../../shared/gmboard/resultText.js';
import { formatNumber } from '../../../shared/ui/numberFormat.js';

// The tables a GM can roll on directly, in the order the Roll tab shows them.
// Each one is a single lookup: nothing here advances the clock or chains into
// another table, which is what the generators are for.
export const ROLL_TABLES = Object.freeze(['event', 'encounter', 'loot', 'trap', 'compl', 'env'].map((id) => {
  const { label, dice, tiered = false } = BOARD_TABLES[id];
  return Object.freeze({
    id, label, dice, tiered,
  });
}));

const LOOKUPS = {
  event: (tables, sum) => getEvent(tables, sum),
  encounter: (tables, sum, tier) => getEnc(tables, tier, sum),
  loot: (tables, sum) => getLoot(tables, sum),
  trap: (tables, sum, tier) => getTrap(tables, tier, sum),
  compl: (tables, sum) => getCompl(tables, sum),
  env: (tables, sum) => getEnvSev(tables, sum),
};

const COMPL_FOLLOW_UPS = { Encounter: 'encounter', 'Environment Damage': 'trap', Environment: 'env' };

// The table's paired dice, in the shape every board roll is kept in
// (tableDice.js): { d1, d2, sum } for 2d20, { d8, d12, sum } otherwise.
function rollDice(notation, rng) {
  return notation === '2d20' ? rollD20D20(rng) : rollD8D12(rng);
}

// The check a result asks of the party, where the generators roll one: loot
// that was found, a camp to spot, an event to interact with. A trap has none
// here because its row already carries its DC.
function dcLabel(tableId, data) {
  if (tableId === 'loot') return isNothingFound(data) ? null : 'DC to find it';
  return tableId === 'event' ? eventDcLabel(eventKind(data)) : null;
}

export function rollTable(tables, tableId, { tier = 1 } = {}, rng = Math.random) {
  const table = ROLL_TABLES.find((entry) => entry.id === tableId);
  if (!table) return null;
  const rolled = rollDice(table.dice, rng);
  const data = LOOKUPS[tableId](tables, rolled.sum, tier);
  const label = dcLabel(tableId, data);
  return {
    tableId,
    tier: table.tiered ? tier : null,
    ...rolled,
    data,
    // Rolled with the result, as the generators do, never as a separate step.
    dc: label ? { label, ...rollDice('1d8+1d12', rng) } : null,
  };
}

// The tables the generators would roll next for this result. The Roll tab only
// offers them; the GM decides whether the chain continues.
export function followUpTables(roll) {
  if (roll.tableId === 'event') return eventFollowUps(eventKind(roll.data));
  if (roll.tableId === 'compl') {
    return Object.prototype.hasOwnProperty.call(COMPL_FOLLOW_UPS, roll.data.type)
      ? [COMPL_FOLLOW_UPS[roll.data.type]]
      : [];
  }
  return [];
}

// What a result says, split into named fields so a card can show each one under
// its own label: `title` is the row's headline, `stats` everything else,
// including the DC rolled with it. `emphasis` marks the numbers a GM reads out.
function rolledDc(roll) {
  return roll.dc
    ? [{ label: roll.dc.label, value: String(roll.dc.sum), note: `DC roll: ${diceText(roll.dc)}`, emphasis: true }]
    : [];
}

function describeRow(roll) {
  const { data } = roll;
  switch (roll.tableId) {
    case 'event':
      return { titleLabel: 'Event', title: data.name, stats: [] };
    case 'encounter':
      return {
        titleLabel: 'Difficulty',
        title: data.diff,
        stats: [
          { label: 'Level', value: String(data.lv) },
          { label: 'XP / PC', value: formatNumber(data.xp), emphasis: true },
        ],
      };
    case 'loot':
      return {
        titleLabel: 'Loot',
        title: data.type,
        stats: hasTableValue(data.rarity) ? [
          { label: 'Rarity', value: data.rarity },
          { label: 'Quality', value: data.quality },
          { label: 'Value', value: data.value, ...(data.extra ? { note: data.extra } : {}) },
        ] : [],
      };
    case 'trap':
      return {
        titleLabel: 'Trap',
        title: data.type,
        stats: [
          { label: 'Level', value: String(data.lv) },
          // One DC per trap: the same number finds it and disarms it.
          { label: 'DC', value: String(data.dc), note: 'detect & disarm', emphasis: true },
          { label: 'Damage', value: data.damage, emphasis: true },
        ],
      };
    case 'compl':
      return { titleLabel: 'Complication', title: data.type, stats: [] };
    case 'env':
      return { titleLabel: 'Severity', title: data.severity, stats: [] };
    default:
      return { titleLabel: '', title: '—', stats: [] };
  }
}

export function describeRoll(roll) {
  const row = describeRow(roll);
  return { ...row, stats: [...row.stats, ...rolledDc(roll)] };
}

// The stats on one line, for the history.
export function summarizeStats(stats) {
  return stats.map((stat) => `${stat.label} ${stat.value}`).join(' · ');
}
