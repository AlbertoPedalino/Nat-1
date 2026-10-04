import { rollD8D12, rollD20D20 } from '../logic/rng.js';
import { getEvent, getLoot, getCompl, getEnc, getTrap, getEnvSev } from './tables.js';

// The tables a GM can roll on directly, in the order the Roll tab shows them.
// Each one is a single lookup: nothing here advances the clock or chains into
// another table, which is what the generators are for.
export const ROLL_TABLES = Object.freeze([
  { id: 'event', label: 'Event', dice: '2d20', tiered: false },
  { id: 'encounter', label: 'Encounter', dice: '2d20', tiered: true },
  { id: 'loot', label: 'Loot', dice: '1d8+1d12', tiered: false },
  { id: 'trap', label: 'Trap', dice: '1d8+1d12', tiered: true },
  { id: 'compl', label: 'Complication', dice: '1d8+1d12', tiered: false },
  { id: 'env', label: 'Environment', dice: '1d8+1d12', tiered: false },
]);

const LOOKUPS = {
  event: (tables, sum) => getEvent(tables, sum),
  encounter: (tables, sum, tier) => getEnc(tables, tier, sum),
  loot: (tables, sum) => getLoot(tables, sum),
  trap: (tables, sum, tier) => getTrap(tables, tier, sum),
  compl: (tables, sum) => getCompl(tables, sum),
  env: (tables, sum) => getEnvSev(tables, sum),
};

const COMPL_FOLLOW_UPS = { Encounter: 'encounter', 'Environment Damage': 'trap', Environment: 'env' };

function rollDice(notation, rng) {
  if (notation === '2d20') {
    const { d1, d2, sum } = rollD20D20(rng);
    return { dice: [{ sides: 20, value: d1 }, { sides: 20, value: d2 }], sum };
  }
  const { d8, d12, sum } = rollD8D12(rng);
  return { dice: [{ sides: 8, value: d8 }, { sides: 12, value: d12 }], sum };
}

// The check a result asks of the party, where the generators roll one: loot
// that was found, a camp to spot, an event to interact with. A trap has none
// here because its row already carries its DC.
function dcLabel(tableId, data) {
  if (tableId === 'loot') return data.tipo !== 'Nothing found' ? 'DC to find it' : null;
  if (tableId !== 'event') return null;
  if (data.type === 'camp_nemico') return 'DC to spot the camp';
  if (data.type === 'encounter' || data.type === 'loot' || data.type === 'nothing') return null;
  if (data.name === 'Env. Damage/Trap') return null;
  return 'DC to interact';
}

export function rollTable(tables, tableId, { tier = 1 } = {}, rng = Math.random) {
  const table = ROLL_TABLES.find((entry) => entry.id === tableId);
  if (!table) return null;
  const { dice, sum } = rollDice(table.dice, rng);
  const data = LOOKUPS[tableId](tables, sum, tier);
  const label = dcLabel(tableId, data);
  return {
    tableId,
    tier: table.tiered ? tier : null,
    dice,
    sum,
    data,
    // Rolled with the result, as the generators do, never as a separate step.
    dc: label ? { label, ...rollDice('1d8+1d12', rng) } : null,
  };
}

// The tables the generators would roll next for this result. The Roll tab only
// offers them; the GM decides whether the chain continues.
export function followUpTables(roll) {
  if (roll.tableId === 'event') {
    if (roll.data.type === 'encounter') return ['encounter'];
    if (roll.data.type === 'loot') return ['loot'];
    if (roll.data.type === 'camp_nemico') return ['encounter', 'loot'];
    if (roll.data.name === 'Env. Damage/Trap') return ['trap'];
    return [];
  }
  if (roll.tableId === 'compl') {
    return Object.prototype.hasOwnProperty.call(COMPL_FOLLOW_UPS, roll.data.type)
      ? [COMPL_FOLLOW_UPS[roll.data.type]]
      : [];
  }
  return [];
}

// Works for a roll and for its `dc`: both carry `dice` and `sum`.
export function formatDice(roll) {
  return `${roll.dice.map((die) => `d${die.sides}(${die.value})`).join('+')}=${roll.sum}`;
}

// What a result says, split into named fields so a card can show each one under
// its own label: `title` is the row's headline, `stats` everything else,
// including the DC rolled with it. `emphasis` marks the numbers a GM reads out.
function rolledDc(roll) {
  return roll.dc
    ? [{ label: roll.dc.label, value: String(roll.dc.sum), note: `DC roll: ${formatDice(roll.dc)}`, emphasis: true }]
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
          { label: 'XP / PC', value: Number(data.xp).toLocaleString(), emphasis: true },
        ],
      };
    case 'loot':
      return {
        titleLabel: 'Loot',
        title: data.tipo,
        stats: data.rarita !== '—' ? [
          { label: 'Rarity', value: data.rarita },
          { label: 'Quality', value: data.qualita },
          { label: 'Value', value: data.valore, ...(data.extra ? { note: data.extra } : {}) },
        ] : [],
      };
    case 'trap':
      return {
        titleLabel: 'Trap',
        title: data.tipo,
        stats: [
          { label: 'Level', value: String(data.lv) },
          // One DC per trap: the same number finds it and disarms it.
          { label: 'DC', value: String(data.dc), note: 'detect & disarm', emphasis: true },
          { label: 'Damage', value: data.danno, emphasis: true },
        ],
      };
    case 'compl':
      return { titleLabel: 'Complication', title: data.type, stats: [] };
    case 'env':
      return { titleLabel: 'Severity', title: data.gravita, stats: [] };
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
