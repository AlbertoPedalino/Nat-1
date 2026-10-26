import { useDeferredValue, useMemo, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogContent, IconButton, MenuItem, Stack, TextField, Typography,
  useMediaQuery, useTheme,
} from '@mui/material';
import { X } from 'lucide-react';
import { List } from 'react-window';
import SearchField from '../../shared/ui/SearchField.jsx';
import { fullscreenContainer } from '../vtt/map/fullscreenContainer.js';
import { SOURCE_LABELS } from '../encounterbuilder/state/constants.js';
import CompendiumDetail from './CompendiumDetail.jsx';

// A compendium catalog: a filter bar of selects over one kind's entries, a
// virtualized list with columns (one compact line in the panel), and the
// entry in a dialog. The magic item, equipment, spell and monster tabs.

const ROW_HEIGHT = 52;

export const YES_NO = [{ key: 'yes', label: 'Yes' }, { key: 'no', label: 'No' }];

export function sourceOptions(sources) {
  return sources.map((source) => ({ key: source, label: SOURCE_LABELS[source] || source }));
}

// The item's picture, when it has one (an empty frame keeps the names in a
// column when it has none), then its name and a second line.
export function NameCell({ entry, children }) {
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

export default function Catalog({
  compendium, entries, initialFilters, filter, controls, columns, label, layout,
}) {
  const [filters, setFilters] = useState(initialFilters);
  const [opened, setOpened] = useState(null);
  const deferred = useDeferredValue(filters);
  const results = useMemo(() => filter(entries, deferred), [deferred, entries, filter]);
  const set = (key) => (value) => setFilters((current) => ({ ...current, [key]: value }));
  // A phone gets the panel's compact rows: the columns left a name its first
  // few letters.
  const phone = useMediaQuery(useTheme().breakpoints.down('sm'));
  const narrow = layout === 'panel' || phone;
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
