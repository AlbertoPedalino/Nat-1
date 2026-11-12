import { useDeferredValue, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  List,
  ListItemButton,
  Stack,
} from '@mui/material';
import { ArrowLeft } from 'lucide-react';
import SearchField from '../../../shared/ui/SearchField.jsx';
import FilterToggles from '../../../shared/ui/FilterToggles.jsx';
import ShowMoreButton from '../../../shared/ui/ShowMoreButton.jsx';
import { usePagedList } from '../../../shared/ui/usePagedList.js';
import { COMPENDIUM_KIND_COLORS } from '../../../shared/ui/entityColors.js';
import MiniBadge from '../../../shared/ui/MiniBadge.jsx';
import { COMPENDIUM_KINDS, compendiumKind, searchCompendium } from './compendiumIndex.js';
import CompendiumDetail from '../detail/CompendiumDetail.jsx';
import LoadStatus, { isLoadPending } from '../../../shared/ui/LoadStatus.jsx';
import { fillColumnSx, filterBarSx, scrollPaneSx } from '../compendiumStyles.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { INK_EDGE } from '../../../shared/ui/shadows.js';
import EmptyLine from '../../../shared/ui/EmptyLine.jsx';
import EntityRow from '../../../shared/ui/EntityRow.jsx';

// The kind filter: everything, or one kind.
const KIND_OPTIONS = [{ key: 'all', label: 'All' }, ...COMPENDIUM_KINDS];
const PAGE_SIZE = 50;

// Search, kind filter, results and the open entry. `layout`:
// 'page' — results and entry side by side (one at a time on a phone);
// 'panel' — one column, the entry replacing the results until Back.
// `compendium` is useCompendium()'s state, so a page and a panel share one load.
export default function CompendiumBrowser({ compendium, layout = 'page', autoFocus = false }) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [selectedKey, setSelectedKey] = useState(null);
  // Typing stays immediate; the search over thousands of entries follows.
  const deferredQuery = useDeferredValue(query);
  const results = useMemo(
    () => searchCompendium(compendium.index, deferredQuery, { kind }),
    [compendium.index, deferredQuery, kind],
  );
  // Every match, a page at a time: a cut-off list looked like a search that
  // had found only that much.
  const page = usePagedList(results, { pageSize: PAGE_SIZE, resetKey: `${deferredQuery}|${kind}` });
  const selected = useMemo(
    () => compendium.index.find((entry) => entry.key === selectedKey) || null,
    [compendium.index, selectedKey],
  );
  const panel = layout === 'panel';
  const showList = !panel || !selected;

  const search = (
    <Stack spacing={1} sx={filterBarSx}>
      <SearchField
        value={query}
        onChange={(value) => { setQuery(value); if (panel) setSelectedKey(null); }}
        placeholder="Search spells, items, monsters, rules…"
        autoFocus={autoFocus}
        ariaLabel="Search the compendium"
      />
      <Box role="group" aria-label="Kind" sx={kindRowSx}>
        <FilterToggles options={KIND_OPTIONS} value={kind} onChange={(key) => setKind(kind === key ? 'all' : key)} />
      </Box>
    </Stack>
  );

  let list;
  if (isLoadPending(compendium.status)) {
    list = (
      <LoadStatus
        status={compendium.status}
        loadingLabel="Loading the books…"
        errorMessage="The compendium could not be loaded. Check the connection and reopen it."
      />
    );
  } else {
    list = (
      <>
        {compendium.failed?.length ? (
          <Alert severity="warning" sx={{ m: 1 }}>
            Not loaded: {compendium.failed.map((key) => compendiumKind(key)?.label || key).join(', ')}.
          </Alert>
        ) : null}
        {results.length ? (
          <List dense disablePadding aria-label="Results">
            {page.visible.map((entry) => (
              <EntityRow
                key={entry.key}
                component={ListItemButton}
                surface="rule"
                selected={entry.key === selectedKey}
                onClick={() => setSelectedKey(entry.key)}
                title={entry.name}
                subtitle={[entry.subtitle, entry.source].filter(Boolean).join(' · ')}
                meta={<MiniBadge label={compendiumKind(entry.kind)?.single || entry.kind} color={COMPENDIUM_KIND_COLORS[entry.kind]} />}
              />
            ))}
          </List>
        ) : (
          <EmptyLine inList>Nothing found.</EmptyLine>
        )}
        <ShowMoreButton page={page} />
      </>
    );
  }

  // The way back to the list: always in the panel, where the entry replaces
  // the results; on the page only on a phone, where it does too.
  const detail = selected ? (
    <Box sx={detailSx}>
      <Button
        size="small"
        startIcon={<ArrowLeft size={ICON_SIZES.sm} />}
        onClick={() => setSelectedKey(null)}
        sx={{ mb: 1, display: panel ? undefined : { md: 'none' } }}
      >
        Back to results
      </Button>
      <CompendiumDetail key={selected.key} entry={selected} legendaryGroups={compendium.legendaryGroups} />
    </Box>
  ) : null;

  if (panel) {
    return (
      <Box sx={fillColumnSx}>
        {showList ? search : null}
        <Box {...(showList ? page.listProps : {})} sx={scrollPaneSx}>{showList ? list : detail}</Box>
      </Box>
    );
  }

  return (
    <Box sx={fillColumnSx}>
      {search}
      <Box sx={pageBodySx}>
        <Box {...page.listProps} sx={[scrollPaneSx, pageListSx, selected && { display: { xs: 'none', md: 'block' } }]}>{list}</Box>
        <Box sx={[scrollPaneSx, pageDetailSx, !selected && { display: { xs: 'none', md: 'block' } }]}>
          {detail || <EmptyLine inList>Pick an entry to read it.</EmptyLine>}
        </Box>
      </Box>
    </Box>
  );
}

// Wrapped, not scrolled: in one scrolling row the toggles shrank to their
// first letter on a phone or in the panel.
const kindRowSx = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 0.75,
};

const detailSx = {
  p: 2,
};

const pageBodySx = {
  flex: 1,
  minHeight: 0,
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', md: 'minmax(280px, 380px) 1fr' },
};

const pageListSx = {
  borderRight: { md: INK_EDGE },
};

const pageDetailSx = {
  minWidth: 0,
};
