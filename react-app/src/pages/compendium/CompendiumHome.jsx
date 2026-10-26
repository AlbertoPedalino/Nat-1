import { useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import CompendiumBrowser from './CompendiumBrowser.jsx';
import { EquipmentCatalog, MagicItemCatalog } from './ItemCatalogs.jsx';
import BookLinks from './BookLinks.jsx';

const TABS = [
  { key: 'search', label: 'Search' },
  { key: 'magic', label: 'Magic Items' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'books', label: 'Books' },
];

// Search, the two item catalogs and the books, as tabs. A tab is mounted the
// first time it is opened and kept, so switching back keeps its search and
// filters. Books are links to their 5etools pages.
export default function CompendiumHome({ compendium, layout = 'page', autoFocus = false }) {
  const [tab, setTab] = useState('search');
  const [opened, setOpened] = useState(() => new Set(['search']));
  const choose = (_event, value) => {
    setTab(value);
    setOpened((current) => (current.has(value) ? current : new Set([...current, value])));
  };
  const panes = {
    search: <CompendiumBrowser compendium={compendium} layout={layout} autoFocus={autoFocus} />,
    magic: <MagicItemCatalog compendium={compendium} layout={layout} />,
    equipment: <EquipmentCatalog compendium={compendium} layout={layout} />,
    books: <BookLinks />,
  };
  return (
    <Box sx={rootSx}>
      <Tabs
        value={tab}
        onChange={choose}
        variant={layout === 'panel' ? 'scrollable' : 'fullWidth'}
        scrollButtons={false}
        sx={tabsSx}
      >
        {TABS.map(({ key, label }) => <Tab key={key} value={key} label={label} />)}
      </Tabs>
      {TABS.map(({ key, label }) => (
        <Box key={key} sx={[paneSx, tab !== key && hiddenSx]} role="tabpanel" aria-label={label}>
          {opened.has(key) ? panes[key] : null}
        </Box>
      ))}
    </Box>
  );
}

const rootSx = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  height: '100%',
};

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
