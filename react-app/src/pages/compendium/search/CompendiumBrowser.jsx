import { useDeferredValue, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  List,
  ListItemButton,
  Stack,
  Typography,
} from '@mui/material';
import { ArrowLeft } from 'lucide-react';
import SearchField from '../../../shared/ui/SearchField.jsx';
import FilterToggles from '../../../shared/ui/FilterToggles.jsx';
import ShowMoreButton from '../../../shared/ui/ShowMoreButton.jsx';
import { usePagedList } from '../../../shared/ui/usePagedList.js';
import { emptyTextSx } from '../../../shared/ui/PanelHeader.jsx';
import { COMPENDIUM_KIND_COLORS, chipTintStyle } from '../../../shared/ui/entityColors.js';
import { COMPENDIUM_KINDS, compendiumKind, searchCompendium } from './compendiumIndex.js';
import CompendiumDetail from '../detail/CompendiumDetail.jsx';
import LoadStatus, { isLoadPending } from '../../../shared/ui/LoadStatus.jsx';
import { entryNameSx, fillColumnSx, rowChipSx } from '../compendiumStyles.js';

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
    <Stack spacing={1} sx={searchBarSx}>
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
              <ListItemButton
                key={entry.key}
                selected={entry.key === selectedKey}
                onClick={() => setSelectedKey(entry.key)}
                sx={resultSx}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" sx={entryNameSx}>{entry.name}</Typography>
                  <Typography variant="caption" noWrap component="div" sx={{ color: 'text.secondary' }}>
                    {[entry.subtitle, entry.source].filter(Boolean).join(' · ')}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  variant="outlined"
                  label={compendiumKind(entry.kind)?.single || entry.kind}
                  sx={[rowChipSx, chipTintStyle(COMPENDIUM_KIND_COLORS[entry.kind])]}
                />
              </ListItemButton>
            ))}
          </List>
        ) : (
          <Typography sx={statusSx}>Nothing found.</Typography>
        )}
        <ShowMoreButton page={page} />
      </>
    );
  }

  const detail = selected ? (
    <Box sx={detailSx}>
      {panel ? (
        <Button size="small" startIcon={<ArrowLeft size={14} />} onClick={() => setSelectedKey(null)} sx={{ mb: 1 }}>
          Back to results
        </Button>
      ) : null}
      <CompendiumDetail key={selected.key} entry={selected} legendaryGroups={compendium.legendaryGroups} />
    </Box>
  ) : null;

  if (panel) {
    return (
      <Box sx={fillColumnSx}>
        {showList ? search : null}
        <Box {...(showList ? page.listProps : {})} sx={scrollSx}>{showList ? list : detail}</Box>
      </Box>
    );
  }

  return (
    <Box sx={fillColumnSx}>
      {search}
      <Box sx={pageBodySx}>
        <Box {...page.listProps} sx={[scrollSx, pageListSx, selected && { display: { xs: 'none', md: 'block' } }]}>{list}</Box>
        <Box sx={[scrollSx, pageDetailSx, !selected && { display: { xs: 'none', md: 'block' } }]}>
          {selected ? (
            <>
              <Button
                size="small"
                startIcon={<ArrowLeft size={14} />}
                onClick={() => setSelectedKey(null)}
                sx={{ mb: 1, display: { md: 'none' } }}
              >
                Back to results
              </Button>
              {detail}
            </>
          ) : (
            <Typography sx={statusSx}>Pick an entry to read it.</Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}

const searchBarSx = {
  p: 1.5,
  borderBottom: '1px solid',
  borderColor: 'divider',
  flexShrink: 0,
};

// Wrapped, not scrolled: in one scrolling row the toggles shrank to their
// first letter on a phone or in the panel.
const kindRowSx = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 0.75,
};

const statusSx = { ...emptyTextSx, p: 2 };

const resultSx = {
  gap: 1,
  alignItems: 'center',
  borderBottom: '1px solid',
  borderColor: 'divider',
};

const scrollSx = {
  minHeight: 0,
  overflowY: 'auto',
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
  borderRight: { md: '1px solid' },
  borderColor: { md: 'divider' },
};

const pageDetailSx = {
  minWidth: 0,
};
