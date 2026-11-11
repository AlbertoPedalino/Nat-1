import { Box } from '@mui/material';
import AppTopBar, { APP_TOP_BAR_HEIGHT } from '../../app/navigation/AppTopBar.jsx';
import { CompendiumFrame } from './CompendiumHome.jsx';
import { useCompendium } from './data/loadCompendium.js';
import { SURFACES } from '../../shared/ui/surfaces.js';

// Spells, items, monsters and rules of the supported manuals, in one search,
// and links to the manuals on 5etools.
export default function CompendiumPage() {
  const compendium = useCompendium();
  return (
    <Box sx={rootSx}>
      <AppTopBar home compendium={false} />
      <Box sx={bodySx}>
        <CompendiumFrame compendium={compendium} layout="page" autoFocus sx={{ height: '100%' }} />
      </Box>
    </Box>
  );
}

const rootSx = {
  height: '100dvh',
  display: 'flex',
  flexDirection: 'column',
  ...SURFACES.page,
};

const bodySx = {
  flex: 1,
  minHeight: 0,
  pt: `calc(${APP_TOP_BAR_HEIGHT} + 8px)`,
  px: { xs: 1, sm: 2 },
  pb: { xs: 1, sm: 2 },
};
