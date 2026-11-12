import { Box } from '@mui/material';
import AppTopBar, { APP_TOP_BAR_HEIGHT } from './AppTopBar.jsx';
import { SURFACES } from '../../shared/ui/surfaces.js';
import { asArray } from '../../shared/lists.js';

// The frame of every page: the page's paper behind it, the app's top bar
// over it (`topBar` holds AppTopBar's props: home, backTo, backLabel,
// compendium, children…), room under the bar, and the page's content in one
// centred column. A restyle of the page, its gutters or the room under the
// bar is made here.
//
// `maxWidth` is the column's width. `dense` takes the tool pages' narrower
// gutters (a board, a builder, the compendium), where a roomy page (a list,
// a message) takes wider ones. `center` sets the content in the middle of
// what is left under the bar (the home's cover, a not-found message). `fill`
// makes the page exactly as tall as the window, its column filling it, for
// a page whose parts scroll inside (the compendium). `sx` adds to the page
// box; `after` is what lives outside the column (dialogs, toasts).
export default function AppPage({
  topBar = null, maxWidth = 860, dense = false, center = false, fill = false, sx, after = null, children,
}) {
  return (
    <Box sx={[pageSx, fill && fillPageSx, ...asArray(sx)]}>
      <AppTopBar {...topBar} />
      <Box
        component="main"
        sx={[columnSx, dense ? DENSE_GUTTERS : ROOMY_GUTTERS, { maxWidth }, center && centerSx, fill && fillColumnSx]}
      >
        {children}
      </Box>
      {after}
    </Box>
  );
}

const pageSx = {
  ...SURFACES.page,
  minHeight: '100vh',
  minWidth: 0,
  pt: APP_TOP_BAR_HEIGHT,
};

const fillPageSx = {
  height: '100dvh',
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
};

const columnSx = {
  width: 1,
  mx: 'auto',
  boxSizing: 'border-box',
};

const ROOMY_GUTTERS = { px: { xs: 2, sm: 3 }, py: { xs: 3, md: 4 } };

const DENSE_GUTTERS = { px: { xs: 1.25, md: 2 }, py: 2 };

const centerSx = {
  minHeight: `calc(100vh - ${APP_TOP_BAR_HEIGHT})`,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
};

const fillColumnSx = { flex: 1, minHeight: 0 };
