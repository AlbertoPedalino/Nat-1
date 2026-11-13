import { useDeferredValue, useMemo, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { List } from 'react-window';
import SearchField from '../../../shared/ui/SearchField.jsx';
import FilterFieldControls from '../../../shared/ui/FilterFieldControls.jsx';
import MonsterToken from '../../../shared/bestiary/MonsterToken.jsx';
import CompendiumDetail from '../detail/CompendiumDetail.jsx';
import LoadStatus, { isLoadPending } from '../../../shared/ui/LoadStatus.jsx';
import { useIsPhone } from '../../../shared/ui/useIsPhone.js';
import SheetDialog from '../../../shared/ui/SheetDialog.jsx';
import { captionLabelSx } from '../../../shared/ui/PanelHeader.jsx';
import {
  catalogDefaults, catalogEntries, catalogFields, catalogFiltering, runCatalog,
} from './catalogFilter.js';
import { entryNameSx, fillColumnSx, filterBarSx } from '../compendiumStyles.js';
import { INK_EDGE } from '../../../shared/ui/shadows.js';
import { LIST_ROW_RULE_SX, BARE_BUTTON_SX, focusRingSx } from '../../../shared/ui/interactive.js';
import EmptyLine from '../../../shared/ui/EmptyLine.jsx';
import Caption from '../../../shared/ui/Caption.jsx';

// A compendium catalog: one definition's entries (catalogFilter.js) under a
// filter bar made from its fields, a virtualized list with its columns (one
// compact line in the panel and on a phone), and the entry in a dialog.

const ROW_HEIGHT = 52;

// The entry's picture (a creature's token, an item's art; an empty frame keeps
// the names in a column when there is none), its name and a second line.
// `thumb={false}` for a kind that never has one (spells).
export function NameCell({
  entry, name = entry.name, thumb = true, tone = null, children,
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
        <Typography variant="body2" sx={tone ? { ...entryNameSx, color: tone } : entryNameSx}>{name}</Typography>
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
  const changed = catalogFiltering(definition, filters);
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

  const template = columns.map((column) => column.width).join(' ');

  return (
    <Box sx={fillColumnSx}>
      <Stack spacing={1} sx={filterBarSx}>
        <SearchField value={filters.search} onChange={set('search')} placeholder={`Search ${label}…`} ariaLabel={`Search ${label}`} />
        <FilterFieldControls
          fields={catalogFields(definition)}
          filters={filters}
          onChange={(key, value) => set(key)(value)}
          entries={entries}
          extra={[{ key: 'sort', label: 'Sort by', options: definition.sorts }]}
          changed={changed}
          onReset={() => setFilters(defaults)}
        />
        <Caption>{results.length} {label}</Caption>
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
          <EmptyLine inList>Nothing matches these filters.</EmptyLine>
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
          <Caption noWrap>
            {cells.slice(1).filter((value) => value && value !== '—').join(' · ')}
          </Caption>
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

const headerRowSx = {
  display: 'grid',
  gap: 1.5,
  px: 2,
  py: 0.75,
  borderBottom: INK_EDGE,
  flexShrink: 0,
};

const headerCellSx = { ...captionLabelSx, color: 'primary.main' };

const listBoxSx = { flex: 1, minHeight: 0 };

const rowSx = {
  ...BARE_BUTTON_SX,
  ...LIST_ROW_RULE_SX,
  bgcolor: 'transparent',
  display: 'grid',
  gap: 1.5,
  alignItems: 'center',
  px: 2,
  width: '100%',
  '&:hover': { bgcolor: 'action.hover' },
  ...focusRingSx({ inset: true }),
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
