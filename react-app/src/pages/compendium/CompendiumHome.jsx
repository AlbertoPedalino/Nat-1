import { useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import CompendiumBrowser from './search/CompendiumBrowser.jsx';
import Catalog from './catalogs/Catalog.jsx';
import { CATALOG_TABS } from './catalogs/catalogColumns.jsx';
import BookLinks from './books/BookLinks.jsx';
import { fillColumnSx } from './compendiumStyles.js';

const TABS = [
  { key: 'search', label: 'Search' },
  ...CATALOG_TABS,
  { key: 'books', label: 'Books' },
];

// Search, the spell, monster and item catalogs and the books, as tabs. A tab is mounted the
// first time it is opened and kept, so switching back keeps its search and
// filters. Books are links to their 5etools pages.
export default function CompendiumHome({ compendium, layout = 'page', autoFocus = false }) {
  const [tab, setTab] = useState('search');
  const [opened, setOpened] = useState(() => new Set(['search']));
  const choose = (_event, value) => {
    setTab(value);
    setOpened((current) => (current.has(value) ? current : new Set([...current, value])));
  };
  const pane = (tabDef) => {
    if (tabDef.key === 'search') return <CompendiumBrowser compendium={compendium} layout={layout} autoFocus={autoFocus} />;
    if (tabDef.key === 'books') return <BookLinks />;
    return <Catalog compendium={compendium} definition={tabDef.definition} columns={tabDef.columns} layout={layout} />;
  };
  return (
    <Box sx={fillColumnSx}>
      <Tabs
        value={tab}
        onChange={choose}
        variant="scrollable"
        scrollButtons={false}
        sx={tabsSx}
      >
        {TABS.map(({ key, label }) => <Tab key={key} value={key} label={label} />)}
      </Tabs>
      {TABS.map((tabDef) => (
        <Box key={tabDef.key} sx={[paneSx, tab !== tabDef.key && hiddenSx]} role="tabpanel" aria-label={tabDef.label}>
          {opened.has(tabDef.key) ? pane(tabDef) : null}
        </Box>
      ))}
    </Box>
  );
}

const tabsSx = {
  minHeight: 40,
  flexShrink: 0,
  borderBottom: '1px solid',
  borderColor: 'divider',
  '& .MuiTab-root': { minHeight: 40 },
};

const paneSx = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
};

const hiddenSx = { display: 'none' };
