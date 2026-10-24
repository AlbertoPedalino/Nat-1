import { useDeferredValue, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, List, ListItemButton, Stack, Typography,
} from '@mui/material';
import { ArrowLeft } from 'lucide-react';
import SearchField from '../../shared/ui/SearchField.jsx';
import { COMPENDIUM_KIND_COLORS, chipTintStyle } from '../../shared/ui/entityColors.js';
import { COMPENDIUM_KINDS, compendiumKind, searchCompendium } from './compendiumIndex.js';
import CompendiumDetail from './CompendiumDetail.jsx';

const RESULT_LIMIT = 120;

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
    () => searchCompendium(compendium.index, deferredQuery, { kind, limit: RESULT_LIMIT }),
    [compendium.index, deferredQuery, kind],
  );
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
        <Chip
          size="small"
          label="All"
          variant={kind === 'all' ? 'filled' : 'outlined'}
          color={kind === 'all' ? 'primary' : 'default'}
          onClick={() => setKind('all')}
          aria-pressed={kind === 'all'}
        />
        {COMPENDIUM_KINDS.map((option) => (
          <Chip
            key={option.key}
            size="small"
            label={option.label}
            variant="outlined"
            onClick={() => setKind(kind === option.key ? 'all' : option.key)}
            aria-pressed={kind === option.key}
            sx={kind === option.key ? chipTintStyle(COMPENDIUM_KIND_COLORS[option.key], { bgAlpha: 0.32 }) : null}
          />
        ))}
      </Box>
    </Stack>
  );

  let list;
  if (compendium.status === 'loading') {
    list = (
      <Stack direction="row" spacing={1} sx={statusSx}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">Loading the books…</Typography>
      </Stack>
    );
  } else if (compendium.status === 'error') {
    list = <Alert severity="error" sx={{ m: 1 }}>The compendium could not be loaded. Check the connection and reopen it.</Alert>;
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
            {results.map((entry) => (
              <ListItemButton
                key={entry.key}
                selected={entry.key === selectedKey}
                onClick={() => setSelectedKey(entry.key)}
                sx={resultSx}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" sx={resultNameSx}>{entry.name}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap component="div">
                    {[entry.subtitle, entry.source].filter(Boolean).join(' · ')}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  variant="outlined"
                  label={compendiumKind(entry.kind)?.single || entry.kind}
                  sx={[kindChipSx, chipTintStyle(COMPENDIUM_KIND_COLORS[entry.kind])]}
                />
              </ListItemButton>
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={statusSx}>Nothing found.</Typography>
        )}
        {results.length === RESULT_LIMIT ? (
          <Typography variant="caption" color="text.secondary" sx={statusSx}>
            Showing the first {RESULT_LIMIT}: type more to narrow it down.
          </Typography>
        ) : null}
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
      <Box sx={panelRootSx}>
        {showList ? search : null}
        <Box sx={scrollSx}>{showList ? list : detail}</Box>
      </Box>
    );
  }

  return (
    <Box sx={pageRootSx}>
      {search}
      <Box sx={pageBodySx}>
        <Box sx={[scrollSx, pageListSx, selected && { display: { xs: 'none', md: 'block' } }]}>{list}</Box>
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
            <Typography variant="body2" color="text.secondary" sx={statusSx}>
              Pick an entry to read it.
            </Typography>
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

const kindRowSx = {
  display: 'flex',
  gap: 0.75,
  overflowX: 'auto',
  pb: 0.25,
  scrollbarWidth: 'thin',
};

const statusSx = {
  p: 2,
  alignItems: 'center',
};

const resultSx = {
  gap: 1,
  alignItems: 'center',
  borderBottom: '1px solid',
  borderColor: 'divider',
};

const resultNameSx = {
  fontWeight: 700,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const kindChipSx = {
  flexShrink: 0,
  height: 20,
  fontSize: '0.65rem',
};

const scrollSx = {
  minHeight: 0,
  overflowY: 'auto',
};

const detailSx = {
  p: 2,
};

const panelRootSx = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  height: '100%',
};

const pageRootSx = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  height: '100%',
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
