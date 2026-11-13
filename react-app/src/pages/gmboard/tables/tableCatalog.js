import { BOARD_TABLES } from '../../../shared/gmboard/tables.js';
import { TIER_OPTIONS } from '../../../shared/gmboard/boardOptions.js';
import { TABLE_ICONS } from '../../../shared/ui/gameIcons.js';

// What the page shows of each board table (BOARD_TABLES): its icon
// (TABLE_ICONS, gameIcons.js), and the columns its editor offers.

const ROLL = { field: 'r', label: 'Roll', editable: false };
const TABLE_COLUMNS = Object.freeze({
  weather: [
    { field: 's', label: 'Season', editable: false },
    { field: 'clear', label: 'Clear ≤', editable: true, numeric: true },
    { field: 'rain', label: 'Rain ≤', editable: true, numeric: true },
  ],
  event: [ROLL, { field: 'name', label: 'Name', editable: true }, { field: 'type', label: 'Type', editable: true }],
  loot: [
    ROLL,
    { field: 'type', label: 'Type', editable: true },
    { field: 'rarity', label: 'Rarity', editable: true },
    { field: 'quality', label: 'Quality', editable: true },
    { field: 'value', label: 'Value', editable: true },
    { field: 'extra', label: 'Extra', editable: true },
  ],
  compl: [ROLL, { field: 'type', label: 'Type', editable: true }],
  encounter: [
    ROLL,
    { field: 'diff', label: 'Difficulty', editable: true },
    { field: 'lv', label: 'Level', editable: true },
    { field: 'xp', label: 'XP', editable: true, numeric: true },
  ],
  trap: [
    ROLL,
    { field: 'type', label: 'Type', editable: true },
    { field: 'lv', label: 'Level', editable: true },
    { field: 'dc', label: 'DC', editable: true, numeric: true },
    { field: 'damage', label: 'Damage', editable: true },
  ],
  env: [ROLL, { field: 'severity', label: 'Severity', editable: true }],
});

function editorTab(tableId, tier = null) {
  const table = BOARD_TABLES[tableId];
  const tierOption = tier ? TIER_OPTIONS[tier - 1] : null;
  return Object.freeze({
    id: tier ? `${tableId}-${tier}` : tableId,
    tableId,
    tier,
    label: tier ? `${table.label} ${tierOption.shortLabel}` : table.label,
    tableName: tier ? `${table.tableName} ${tierOption.label} (${tierOption.shortLevels})` : table.tableName,
    // A tiered table says which set of tiers it belongs to; the others need no heading.
    group: tier ? `${table.label} tiers` : null,
    feeds: table.feeds,
    roll: table.dice,
    matchField: table.matchField,
    icon: TABLE_ICONS[tableId],
    columns: TABLE_COLUMNS[tableId],
  });
}

const tiers = (tableId) => TIER_OPTIONS.map((option) => editorTab(tableId, option.tier));

// The Tables tab's editors, in the order it lists them: one per table, a tiered
// table once per tier.
export const EDITOR_TABS = Object.freeze([
  editorTab('weather'), editorTab('event'), editorTab('loot'), editorTab('compl'),
  ...tiers('encounter'), ...tiers('trap'),
  editorTab('env'),
]);
