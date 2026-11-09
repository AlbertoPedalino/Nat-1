import { useDeferredValue, useMemo, useState } from 'react';
import {
  Box, Button, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import { List } from 'react-window';
import SearchField from '../../../shared/ui/SearchField.jsx';
import RangeInputs from '../../../shared/ui/RangeInputs.jsx';
import MonsterToken from '../../../shared/bestiary/MonsterToken.jsx';
import CompendiumDetail from '../detail/CompendiumDetail.jsx';
import LoadStatus, { isLoadPending } from '../../../shared/ui/LoadStatus.jsx';
import { useIsPhone } from '../../../shared/ui/useIsPhone.js';
import SheetDialog from '../../../shared/ui/SheetDialog.jsx';
import { captionLabelSx, emptyTextSx } from '../../../shared/ui/PanelHeader.jsx';
import { rangeFilterKeys } from '../../../shared/character/inventory/itemFilters.js';
import {
  YES_NO_OPTIONS, anyValue, catalogDefaults, catalogEntries, fieldOptions, runCatalog, sourceOptions,
} from './catalogFilter.js';
import { entryNameSx, fillColumnSx } from '../compendiumStyles.js';

// A compendium catalog: one definition's entries (catalogFilter.js) under a
// filter bar made from its fields, a virtualized list with its columns (one
// compact line in the panel and on a phone), and the entry in a dialog.

const ROW_HEIGHT = 52;

// The entry's picture (a creature's token, an item's art; an empty frame keeps
// the names in a column when there is none), its name and a second line.
// `thumb={false}` for a kind that never has one (spells).
export function NameCell({
  entry, name = entry.name, thumb = true, children,
}) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
      {thumb && entry.kind === 'monster' ? <MonsterToken monster={entry.record} size={40} /> : null}
      {thumb && entry.kind !== 'monster' ? (
        <Box sx={thumbSx}>
          {entry.image ? <Box component="img" src={entry.image} alt="" loading="lazy" sx={thumbImageSx} /> : null}
        </Box>
      ) : null}
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={entryNameSx}>{name}</Typography>
        {children}
      </Box>
    </Stack>
  );
}

export default function Catalog({
  compendium, definition, columns, layout = 'page',
}) {
  const defaults = useMemo(() => catalogDefaults(definition), [definition]);
  const entries = useMemo(() => catalogEntries(definition, compendium.index), [compendium.index, definition]);
  const [filters, setFilters] = useState(defaults);
  const [opened, setOpened] = useState(null);
  const deferred = useDeferredValue(filters);
  const results = useMemo(() => runCatalog(definition, entries, deferred), [definition, deferred, entries]);
  const set = (key) => (value) => setFilters((current) => ({ ...current, [key]: value }));
  // A phone gets the panel's compact rows: the columns left a name its first
  // few letters.
  const phone = useIsPhone();
  const narrow = layout === 'panel' || phone;
  const changed = Object.keys(defaults).some((key) => key !== 'sort' && filters[key] !== defaults[key]);
  const { label } = definition;

  if (isLoadPending(compendium.status)) {
    return (
      <LoadStatus
        status={compendium.status}
        loadingLabel="Loading the books…"
        errorMessage={`The ${label} could not be loaded. Check the connection and reopen this page.`}
      />
    );
  }

  const selects = [
    ...definition.fields.filter((field) => field.kind !== 'range').map((field) => ({
      key: field.key,
      label: field.label,
      any: anyValue(field),
      options: field.kind === 'yesNo' ? YES_NO_OPTIONS : fieldOptions(field, entries),
    })),
    { key: 'source', label: 'Source', any: 'all', options: sourceOptions(entries) },
    { key: 'sort', label: 'Sort by', options: definition.sorts },
  ];
  const ranges = definition.fields.filter((field) => field.kind === 'range');
  const template = columns.map((column) => column.width).join(' ');

  return (
    <Box sx={fillColumnSx}>
      <Stack spacing={1} sx={filterBarSx}>
        <SearchField value={filters.search} onChange={set('search')} placeholder={`Search ${label}…`} ariaLabel={`Search ${label}`} />
        <Box sx={controlsSx}>
          {selects.map((control) => (
            <TextField
              key={control.key}
              select
              size="small"
              label={control.label}
              value={filters[control.key]}
              onChange={(event) => set(control.key)(event.target.value)}
              sx={controlSx}
            >
              {control.any ? <MenuItem value={control.any}>Any</MenuItem> : null}
              {control.options.map((option) => (
                <MenuItem key={option.key} value={option.key}>{option.label}</MenuItem>
              ))}
            </TextField>
          ))}
          {ranges.map((field) => {
            const [minKey, maxKey] = rangeFilterKeys(field);
            return (
              <Box key={field.key} role="group" aria-label={field.label} sx={rangeSx}>
                <Typography component="span" sx={captionLabelSx}>{field.label}</Typography>
                <RangeInputs
                  label={field.label}
                  unit={field.unit}
                  step={field.step}
                  min={filters[minKey]}
                  max={filters[maxKey]}
                  onMin={set(minKey)}
                  onMax={set(maxKey)}
                />
              </Box>
            );
          })}
          {changed ? (
            <Button size="small" onClick={() => setFilters(defaults)}>Reset filters</Button>
          ) : null}
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{results.length} {label}</Typography>
      </Stack>
      {!narrow ? (
        <Box aria-hidden sx={[headerRowSx, { gridTemplateColumns: template }]}>
          {columns.map((column) => <Typography key={column.key} component="span" sx={headerCellSx}>{column.label}</Typography>)}
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
          <Typography sx={{ ...emptyTextSx, p: 2 }}>Nothing matches these filters.</Typography>
        )}
      </Box>
      <SheetDialog open={Boolean(opened)} onClose={() => setOpened(null)} maxWidth="sm" showClose>
        {opened ? <CompendiumDetail key={opened.key} entry={opened} legendaryGroups={compendium.legendaryGroups} /> : null}
      </SheetDialog>
    </Box>
  );
}

// One result. react-window places it with `style` (its absolute position).
function CatalogRow({
  index, style, results, columns, template, narrow, onOpen,
}) {
  const entry = results[index];
  const cells = columns.map((column) => column.render(entry));
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
          <Box>{cells[0]}</Box>
          <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
            {cells.slice(1).filter((value) => value && value !== '—').join(' · ')}
          </Typography>
        </>
      ) : cells.map((cell, cellIndex) => (
        <Box key={columns[cellIndex].key} sx={cellSx}>
          {typeof cell === 'string'
            ? <Typography variant="body2" noWrap sx={{ color: 'text.secondary' }}>{cell}</Typography>
            : cell}
        </Box>
      ))}
    </Box>
  );
}

const filterBarSx = { p: 1.5, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 };

const controlsSx = { display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' };

const controlSx = { minWidth: 130, flex: { xs: '1 1 130px', md: '0 0 auto' } };

const rangeSx = { display: 'flex', alignItems: 'center', gap: 0.75 };

const headerRowSx = {
  display: 'grid',
  gap: 1.5,
  px: 2,
  py: 0.75,
  borderBottom: '1px solid',
  borderColor: 'divider',
  flexShrink: 0,
};

const headerCellSx = { ...captionLabelSx, color: 'primary.main' };

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
