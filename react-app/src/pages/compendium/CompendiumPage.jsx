import { Box } from '@mui/material';
import AppTopBar, { APP_TOP_BAR_HEIGHT } from '../../app/navigation/AppTopBar.jsx';
import CompendiumHome from './CompendiumHome.jsx';
import { useCompendium } from './loadCompendium.js';

// Spells, items, monsters and rules of the supported manuals, in one search,
// and the manuals themselves to read.
export default function CompendiumPage() {
  const compendium = useCompendium();
  return (
    <Box sx={rootSx}>
      <AppTopBar home />
      <Box sx={bodySx}>
        <CompendiumHome compendium={compendium} layout="page" autoFocus />
      </Box>
    </Box>
  );
}

const rootSx = {
  height: '100dvh',
  display: 'flex',
  flexDirection: 'column',
  bgcolor: 'background.default',
};

const bodySx = {
  flex: 1,
  minHeight: 0,
  pt: APP_TOP_BAR_HEIGHT,
};
