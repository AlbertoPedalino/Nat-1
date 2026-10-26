import { useMemo } from 'react';
import { Typography } from '@mui/material';
import Catalog, { NameCell, YES_NO, sourceOptions } from './Catalog.jsx';
import {
  COST_RANGES,
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_FILTERS,
  MAGIC_FILTERS,
  MAGIC_TYPES,
  RARITIES,
  WEIGHT_RANGES,
  attunementText,
  catalogEntries,
  catalogSources,
  equipmentCategory,
  filterEquipment,
  filterMagicItems,
  formatCost,
  formatWeight,
  itemAttributes,
  magicBonus,
  magicItemType,
  rarityLabel,
} from './itemCatalog.js';

// The magic items of the supported manuals, filtered like a loot table: type,
// rarity, attunement, magic bonus, charges, source.
export function MagicItemCatalog({ compendium, layout = 'page' }) {
  const entries = useMemo(() => catalogEntries(compendium.index, true), [compendium.index]);
  const sources = useMemo(() => catalogSources(entries), [entries]);
  return (
    <Catalog
      compendium={compendium}
      entries={entries}
      initialFilters={MAGIC_FILTERS}
      filter={filterMagicItems}
      layout={layout}
      label="magic items"
      columns={MAGIC_COLUMNS}
      controls={[
        { key: 'type', label: 'Type', options: MAGIC_TYPES },
        { key: 'rarity', label: 'Rarity', options: RARITIES },
        { key: 'attunement', label: 'Attunement', any: 'any', options: YES_NO },
        { key: 'bonus', label: 'Magic Bonus', any: 'any', options: [1, 2, 3].map((n) => ({ key: String(n), label: `+${n}` })) },
        { key: 'charges', label: 'Has Charges', any: 'any', options: YES_NO },
        { key: 'source', label: 'Source', options: sourceOptions(sources) },
        { key: 'sort', label: 'Sort by', fixed: true, options: [{ key: 'name', label: 'Name' }, { key: 'rarity', label: 'Rarity' }] },
      ]}
    />
  );
}

// The mundane equipment of the supported manuals: weapons, armor, gear, tools,
// mounts…, with cost and weight.
export function EquipmentCatalog({ compendium, layout = 'page' }) {
  const entries = useMemo(() => catalogEntries(compendium.index, false), [compendium.index]);
  const sources = useMemo(() => catalogSources(entries), [entries]);
  return (
    <Catalog
      compendium={compendium}
      entries={entries}
      initialFilters={EQUIPMENT_FILTERS}
      filter={filterEquipment}
      layout={layout}
      label="items"
      columns={EQUIPMENT_COLUMNS}
      controls={[
        { key: 'category', label: 'Type', options: EQUIPMENT_CATEGORIES },
        { key: 'cost', label: 'Cost', options: COST_RANGES },
        { key: 'weight', label: 'Weight', options: WEIGHT_RANGES },
        { key: 'source', label: 'Source', options: sourceOptions(sources) },
        {
          key: 'sort',
          label: 'Sort by',
          fixed: true,
          options: [{ key: 'name', label: 'Name' }, { key: 'cost', label: 'Cost' }, { key: 'weight', label: 'Weight' }],
        },
      ]}
    />
  );
}

const MAGIC_TYPE_LABEL = Object.fromEntries(MAGIC_TYPES.map(({ key, label }) => [key, label]));
const EQUIPMENT_LABEL = Object.fromEntries(EQUIPMENT_CATEGORIES.map(({ key, label }) => [key, label]));

const RARITY_TONES = {
  Common: 'gmboard.rarity.Common',
  Uncommon: 'gmboard.rarity.Uncommon',
  Rare: 'gmboard.rarity.Rare',
  'Very Rare': 'gmboard.rarity.Very Rare',
  Legendary: 'gmboard.rarity.Legendary',
  Artifact: 'error.main',
};

const MAGIC_COLUMNS = [
  {
    key: 'name',
    label: 'Name',
    width: '2fr',
    render: (entry) => (
      <NameCell entry={entry}>
        <Typography variant="caption" sx={{ color: RARITY_TONES[rarityLabel(entry.record)] || 'text.secondary' }}>
          {rarityLabel(entry.record)}
        </Typography>
      </NameCell>
    ),
  },
  { key: 'type', label: 'Type', width: '1fr', render: (entry) => MAGIC_TYPE_LABEL[magicItemType(entry.record)] },
  { key: 'attunement', label: 'Attunement', width: '1fr', render: (entry) => attunementText(entry.record) || '—' },
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
    render: (entry) => (
      <NameCell entry={entry}>
        <Typography variant="caption" color="text.secondary">{EQUIPMENT_LABEL[equipmentCategory(entry.record)]}</Typography>
      </NameCell>
    ),
  },
  { key: 'cost', label: 'Cost', width: '0.7fr', render: (entry) => formatCost(entry.record.value) },
  { key: 'weight', label: 'Weight', width: '0.7fr', render: (entry) => formatWeight(entry.record.weight) },
  { key: 'attributes', label: 'Attributes', width: '2fr', render: (entry) => itemAttributes(entry.record).join(', ') || '—' },
  { key: 'notes', label: 'Notes', width: '0.6fr', render: (entry) => entry.source },
];
