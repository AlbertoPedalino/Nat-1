import { useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import CompendiumBrowser from './CompendiumBrowser.jsx';
import BooksBrowser from './BooksBrowser.jsx';

// Search and Books, as tabs. Both stay mounted, so switching back keeps the
// search typed or the page being read. The books load only once opened.
export default function CompendiumHome({ compendium, layout = 'page', autoFocus = false }) {
  const [tab, setTab] = useState('search');
  const [booksOpened, setBooksOpened] = useState(false);
  const choose = (_event, value) => {
    setTab(value);
    if (value === 'books') setBooksOpened(true);
  };
  return (
    <Box sx={rootSx}>
      <Tabs value={tab} onChange={choose} variant="fullWidth" sx={tabsSx}>
        <Tab value="search" label="Search" />
        <Tab value="books" label="Books" />
      </Tabs>
      <Box sx={[paneSx, tab !== 'search' && hiddenSx]} role="tabpanel" aria-label="Search">
        <CompendiumBrowser compendium={compendium} layout={layout} autoFocus={autoFocus} />
      </Box>
      <Box sx={[paneSx, tab !== 'books' && hiddenSx]} role="tabpanel" aria-label="Books">
        {booksOpened ? <BooksBrowser layout={layout} compendium={compendium} /> : null}
      </Box>
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
