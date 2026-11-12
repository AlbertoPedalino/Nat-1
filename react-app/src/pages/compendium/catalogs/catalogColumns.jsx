import { NameCell } from './Catalog.jsx';
import {
  EQUIPMENT_CATALOG, EQUIPMENT_CATEGORIES, MAGIC_ITEM_CATALOG, MAGIC_TYPES,
  equipmentCategory, formatCostCell, formatWeightCell, itemAttributes, magicBonus, magicItemType,
} from './itemCatalog.js';
import { SPELL_CATALOG, spellLevelLabel } from './spellCatalog.js';
import { MONSTER_CATALOG, monsterStats } from './monsterCatalog.js';
import { attunementRequirementText } from '../../../shared/character/inventory/itemAttunement.js';
import { rarityLabel, rarityTone } from '../../../shared/character/inventory/itemRarity.js';
import Caption from '../../../shared/ui/Caption.jsx';

// The compendium's catalogs as tabs: each one's definition (what it lists and
// how it filters, in its *Catalog.js) with the columns its rows show. A column
// is { key, label, width, render(entry) }; the first one is the name.
const secondLine = (text, sx) => (
  <Caption noWrap component="div" sx={sx}>{text}</Caption>
);

const sourceColumn = { key: 'source', label: 'Source', width: '0.6fr', render: (entry) => entry.source };

// Concentration and ritual, as the spell list marks them: "(C, R)".
const spellTags = (spell) => [spell.concentration ? 'C' : '', spell.ritual ? 'R' : ''].filter(Boolean).join(', ');

const SPELL_COLUMNS = [
  {
    key: 'name',
    label: 'Name',
    width: '2fr',
    render: (entry) => (
      <NameCell entry={entry} name={spellTags(entry.record) ? `${entry.name} (${spellTags(entry.record)})` : entry.name} thumb={false}>
        {secondLine(entry.subtitle)}
      </NameCell>
    ),
  },
  { key: 'level', label: 'Level', width: '0.6fr', render: (entry) => spellLevelLabel(entry.record) },
  { key: 'time', label: 'Casting Time', width: '1fr', render: (entry) => entry.record.castingTimeLabel || '—' },
  { key: 'range', label: 'Range', width: '1fr', render: (entry) => entry.record.rangeLabel || '—' },
  { key: 'duration', label: 'Duration', width: '1.2fr', render: (entry) => entry.record.durationLabel || '—' },
  sourceColumn,
];

const MONSTER_COLUMNS = [
  { key: 'name', label: 'Name', width: '2fr', render: (entry) => <NameCell entry={entry}>{secondLine(entry.subtitle)}</NameCell> },
  { key: 'cr', label: 'CR', width: '0.5fr', render: (entry) => monsterStats(entry.record).cr },
  { key: 'size', label: 'Size', width: '0.8fr', render: (entry) => monsterStats(entry.record).size || '—' },
  { key: 'ac', label: 'AC', width: '0.5fr', render: (entry) => String(monsterStats(entry.record).ac ?? '—') },
  { key: 'hp', label: 'HP', width: '0.5fr', render: (entry) => String(monsterStats(entry.record).hp ?? '—') },
  sourceColumn,
];

const MAGIC_TYPE_LABEL = Object.fromEntries(MAGIC_TYPES.map(({ key, label }) => [key, label]));
const EQUIPMENT_LABEL = Object.fromEntries(EQUIPMENT_CATEGORIES.map(({ key, label }) => [key, label]));

const MAGIC_COLUMNS = [
  {
    key: 'name',
    label: 'Name',
    width: '2fr',
    render: (entry) => {
      // The name and its rarity lettered in the rarity's colour.
      const tone = rarityTone(entry.record);
      return <NameCell entry={entry} tone={tone}>{secondLine(rarityLabel(entry.record), { color: tone || 'text.secondary' })}</NameCell>;
    },
  },
  { key: 'type', label: 'Type', width: '1fr', render: (entry) => MAGIC_TYPE_LABEL[magicItemType(entry.record)] },
  { key: 'attunement', label: 'Attunement', width: '1.2fr', render: (entry) => attunementRequirementText(entry.record) || '—' },
  {
    key: 'notes',
    label: 'Notes',
    width: '1fr',
    render: (entry) => [
      magicBonus(entry.record) ? `+${magicBonus(entry.record)}` : '',
      entry.record.charges != null ? `${entry.record.charges} charges` : '',
      entry.source,
    ].filter(Boolean).join(' · '),
  },
];

const EQUIPMENT_COLUMNS = [
  {
    key: 'name',
    label: 'Name',
    width: '2fr',
    render: (entry) => <NameCell entry={entry}>{secondLine(EQUIPMENT_LABEL[equipmentCategory(entry.record)])}</NameCell>,
  },
  { key: 'value', label: 'Value', width: '0.7fr', render: (entry) => formatCostCell(entry.record.value) },
  { key: 'weight', label: 'Weight', width: '0.7fr', render: (entry) => formatWeightCell(entry.record.weight) },
  { key: 'attributes', label: 'Attributes', width: '2fr', render: (entry) => itemAttributes(entry.record).join(', ') || '—' },
  { ...sourceColumn, label: 'Notes' },
];

export const CATALOG_TABS = Object.freeze([
  { key: 'spells', label: 'Spells', definition: SPELL_CATALOG, columns: SPELL_COLUMNS },
  { key: 'monsters', label: 'Monsters', definition: MONSTER_CATALOG, columns: MONSTER_COLUMNS },
  { key: 'magic', label: 'Magic Items', definition: MAGIC_ITEM_CATALOG, columns: MAGIC_COLUMNS },
  { key: 'equipment', label: 'Equipment', definition: EQUIPMENT_CATALOG, columns: EQUIPMENT_COLUMNS },
]);
