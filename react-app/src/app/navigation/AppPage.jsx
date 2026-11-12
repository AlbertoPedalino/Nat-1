import { Box } from '@mui/material';
import AppTopBar, { APP_TOP_BAR_HEIGHT } from './AppTopBar.jsx';
import { SURFACES } from '../../shared/ui/surfaces.js';
import { asArray } from '../../shared/lists.js';

// The frame of every page: the page's paper behind it, the app's top bar
// over it (`topBar` holds AppTopBar's props: home, backTo, backLabel, start,
// compendium, cloudMenuProps, children…), room under the bar, and the page's
// content in one centred column. A restyle of the page, its gutters or the
// room under the bar is made here, and no page draws a bar or a paper of its
// own (tests/logic/shared/oneDefinition.pages.test.js).
//
// `maxWidth` is the column's width. The gutters are roomy by default (a
// list, a message); `dense` takes the tool pages' narrower ones (a board, a
// builder, the compendium) and `tight` the narrowest, for the battle map,
// where every pixel is map. `center` sets the content in the middle of what
// is left under the bar (the home's cover, a not-found message). `fill`
// makes the page exactly as tall as the window, its column a flex column
// filling it, for a page whose parts scroll inside (the compendium, an open
// scene). `fullBleed` drops the column: the content spans the page and lays
// out its own bands (the character sheet's header band and its centred
// column, the projector's black screen).
//
// `topBar={false}` leaves the bar out, with the room under it: a map
// covering the window (where the browser has no Fullscreen API the fixed bar
// would sit over the map's controls) or a projector. `embedded` is the page
// drawn inside another page's panel (the sheet beside the battle map or in
// the encounter's side panel): no bar, no window height, and no second
// <main>, since the host page has one. `sx` adds to the page box; `after` is
// what lives outside the column (dialogs, toasts).
export default function AppPage({
  topBar = null, maxWidth = 860, dense = false, tight = false, center = false, fill = false,
  fullBleed = false, embedded = false, sx, after = null, children,
}) {
  const withBar = !embedded && topBar !== false;
  const gutters = tight ? TIGHT_GUTTERS : dense ? DENSE_GUTTERS : ROOMY_GUTTERS;
  return (
    <Box sx={[pageSx, embedded ? embeddedPageSx : windowPageSx, withBar && barRoomSx, fill && fillPageSx, ...asArray(sx)]}>
      {withBar ? <AppTopBar {...topBar} /> : null}
      <Box
        component={embedded ? 'div' : 'main'}
        sx={fullBleed
          ? [fill && fillColumnSx]
          : [columnSx, gutters, { maxWidth }, center && centerSx, fill && fillColumnSx]}
      >
        {children}
      </Box>
      {after}
    </Box>
  );
}

const pageSx = {
  ...SURFACES.page,
  minWidth: 0,
};

const windowPageSx = { minHeight: '100vh' };

// The width of the panel it sits in, whatever that panel's own layout.
const embeddedPageSx = { width: 1 };

const barRoomSx = { pt: APP_TOP_BAR_HEIGHT };

// `dvh` rather than `vh`: on a phone `100vh` counts the strip behind the
// address bar, so the bottom of the page was under the browser's own chrome.
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

const TIGHT_GUTTERS = { px: { xs: 1, md: 2 }, py: 1 };

const centerSx = {
  minHeight: `calc(100vh - ${APP_TOP_BAR_HEIGHT})`,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
};

// A flex column, so a part with `flex: 1` (the scene editor) takes what the
// window leaves; `minHeight: 0` lets the column shrink to the window instead
// of pushing the page taller.
const fillColumnSx = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
};
