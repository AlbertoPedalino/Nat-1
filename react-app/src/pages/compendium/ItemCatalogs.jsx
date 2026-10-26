import { useDeferredValue, useMemo, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogContent, IconButton, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import { X } from 'lucide-react';
import { List } from 'react-window';
import SearchField from '../../shared/ui/SearchField.jsx';
import { fullscreenContainer } from '../vtt/map/fullscreenContainer.js';
import { SOURCE_LABELS } from '../encounterbuilder/state/constants.js';
import CompendiumDetail from './CompendiumDetail.jsx';
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

const ROW_HEIGHT = 52;

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

const YES_NO = [{ key: 'yes', label: 'Yes' }, { key: 'no', label: 'No' }];

function sourceOptions(sources) {
  return sources.map((source) => ({ key: source, label: SOURCE_LABELS[source] || source }));
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

// The item's picture, when it has one (an empty frame keeps the names in a
// column when it has none), then its name and a second line.
function NameCell({ entry, children }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
      <Box sx={thumbSx}>
        {entry.image ? <Box component="img" src={entry.image} alt="" loading="lazy" sx={thumbImageSx} /> : null}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={nameSx}>{entry.name}</Typography>
        {children}
      </Box>
    </Stack>
  );
}

function Catalog({
  compendium, entries, initialFilters, filter, controls, columns, label, layout,
}) {
  const [filters, setFilters] = useState(initialFilters);
  const [opened, setOpened] = useState(null);
  const deferred = useDeferredValue(filters);
  const results = useMemo(() => filter(entries, deferred), [deferred, entries, filter]);
  const set = (key) => (value) => setFilters((current) => ({ ...current, [key]: value }));
  const narrow = layout === 'panel';
  const changed = Object.keys(initialFilters).some((key) => key !== 'sort' && filters[key] !== initialFilters[key]);

  if (compendium.status === 'loading') {
    return (
      <Stack direction="row" spacing={1} sx={statusSx}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">Loading the books…</Typography>
      </Stack>
    );
  }
  if (compendium.status === 'error') {
    return <Alert severity="error" sx={{ m: 1 }}>The items could not be loaded. Check the connection and reopen this page.</Alert>;
  }

  const template = columns.map((column) => column.width).join(' ');
  return (
    <Box sx={rootSx}>
      <Stack spacing={1} sx={filterBarSx}>
        <SearchField value={filters.search} onChange={set('search')} placeholder={`Search ${label}…`} ariaLabel={`Search ${label}`} />
        <Box sx={controlsSx}>
          {controls.map((control) => (
            <TextField
              key={control.key}
              select
              size="small"
              label={control.label}
              value={filters[control.key]}
              onChange={(event) => set(control.key)(event.target.value)}
              sx={controlSx}
            >
              {control.fixed ? null : <MenuItem value={control.any || 'all'}>Any</MenuItem>}
              {control.options.map((option) => (
                <MenuItem key={option.key} value={option.key}>{option.label}</MenuItem>
              ))}
            </TextField>
          ))}
          {changed ? (
            <Button size="small" onClick={() => setFilters(initialFilters)}>Reset filters</Button>
          ) : null}
        </Box>
        <Typography variant="caption" color="text.secondary">{results.length} {label}</Typography>
      </Stack>
      {!narrow ? (
        <Box aria-hidden sx={[headerRowSx, { gridTemplateColumns: template }]}>
          {columns.map((column) => <Typography key={column.key} variant="caption" sx={headerCellSx}>{column.label}</Typography>)}
        </Box>
      ) : null}
      <Box sx={listBoxSx}>
        {results.length ? (
          <Box
            component={List}
            rowComponent={CatalogRow}
            rowCount={results.length}
            rowHeight={narrow ? 64 : ROW_HEIGHT}
            defaultHeight={480}
            rowProps={{ results, columns, template, narrow, onOpen: setOpened }}
            aria-label={`${label} found`}
            sx={{ height: '100%' }}
          />
        ) : (
          <Typography variant="body2" color="text.secondary" sx={statusSx}>Nothing matches these filters.</Typography>
        )}
      </Box>
      <Dialog open={Boolean(opened)} onClose={() => setOpened(null)} maxWidth="sm" fullWidth container={fullscreenContainer}>
        <DialogContent sx={{ position: 'relative', pt: 3 }}>
          <IconButton size="small" aria-label="Close" onClick={() => setOpened(null)} sx={dialogCloseSx}>
            <X size={16} />
          </IconButton>
          {opened ? <CompendiumDetail key={opened.key} entry={opened} legendaryGroups={compendium.legendaryGroups} /> : null}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

// One result. react-window places it with `style` (its absolute position).
function CatalogRow({
  index, style, results, columns, template, narrow, onOpen,
}) {
  const entry = results[index];
  return (
    <Box
      component="button"
      type="button"
      style={style}
      onClick={() => onOpen(entry)}
      sx={[rowSx, narrow ? narrowRowSx : { gridTemplateColumns: template }]}
    >
      {narrow ? (
        <>
          <Box>{columns[0].render(entry)}</Box>
          <Typography variant="caption" color="text.secondary" noWrap>
            {columns.slice(1).map((column) => column.render(entry)).filter((value) => value && value !== '—').join(' · ')}
          </Typography>
        </>
      ) : columns.map((column) => (
        <Box key={column.key} sx={cellSx}>
          {typeof column.render(entry) === 'string'
            ? <Typography variant="body2" color="text.secondary" noWrap>{column.render(entry)}</Typography>
            : column.render(entry)}
        </Box>
      ))}
    </Box>
  );
}

const statusSx = { p: 2, alignItems: 'center' };

const rootSx = { display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' };

const filterBarSx = { p: 1.5, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 };

const controlsSx = { display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' };

const controlSx = { minWidth: 130, flex: { xs: '1 1 130px', md: '0 0 auto' } };

const headerRowSx = {
  display: 'grid',
  gap: 1.5,
  px: 2,
  py: 0.75,
  borderBottom: '1px solid',
  borderColor: 'divider',
  flexShrink: 0,
};

const headerCellSx = { color: 'primary.main', fontWeight: 700, letterSpacing: '0.04em' };

const listBoxSx = { flex: 1, minHeight: 0 };

const rowSx = {
  appearance: 'none',
  border: 0,
  borderBottom: '1px solid',
  borderColor: 'divider',
  bgcolor: 'transparent',
  color: 'inherit',
  font: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
  display: 'grid',
  gap: 1.5,
  alignItems: 'center',
  px: 2,
  width: '100%',
  '&:hover': { bgcolor: 'action.hover' },
  '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -2 },
};

const narrowRowSx = { display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'center', gap: 0 };

const cellSx = { minWidth: 0, overflow: 'hidden' };

const thumbSx = {
  width: 40,
  height: 40,
  flexShrink: 0,
  borderRadius: 1,
  bgcolor: 'action.hover',
  display: 'grid',
  placeItems: 'center',
  overflow: 'hidden',
};

const thumbImageSx = { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' };

const nameSx = { fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

const dialogCloseSx = { position: 'absolute', top: 8, right: 8, zIndex: 1 };
