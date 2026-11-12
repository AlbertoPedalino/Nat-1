import { SURFACES } from '../../../shared/ui/surfaces.js';
import { panelScreentone } from '../../../shared/ui/PanelHeader.jsx';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import { SHEET_SIDE_BY_SIDE_QUERY } from '../../../shared/vtt/sheets/sheetLayout.js';
import { normalizeHexColor, OPACITY, UI_COLORS } from '../../../shared/ui/colors.js';
import { FONT_SIZES, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import { UI_SHADOWS } from '../../../shared/ui/shadows.js';
import { CONTROL_HEIGHTS } from '../../../shared/ui/controlHeights.js';
import { TEXT_STYLES, ONE_LINE_SX } from '../../../shared/ui/textStyles.js';

// The GM needs to see what is still hidden from the party without being blind
// to the map underneath; a player gets the real thing.
export const GM_FOG_OPACITY = 0.55;
export const PLAYER_FOG_OPACITY = 1;

// The scene's bar (its name and the presenter's buttons) is a panel bar: the
// diagonal screentone over the map surface, the solid ink shadow.
export const sceneTopbarSx = {
  ...SURFACES.map,
  bgcolor: UI_COLORS.surfaceHeader,
  backgroundImage: panelScreentone(VTT_COLORS.accent),
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 1,
  px: { xs: 1, md: 1.25 },
  py: 0.75,
  borderRadius: 1,
};

// Shrinks rather than grows: the presenter controls belong next to the name the
// GM is reading, not pushed against the far edge of the bar.
export const sceneIdentitySx = {
  display: 'flex',
  alignItems: 'center',
  gap: 0.25,
  flex: '0 1 auto',
  minWidth: 0,
};

// The scene's name (the campaign's, for a player): lettered like a character's
// name and a panel's title, the comic's shout face.
export const sceneTitleSx = {
  ...ONE_LINE_SX,
  ...TEXT_STYLES.shout,
  color: 'primary.main',
  fontSize: { xs: FONT_SIZES.body, md: FONT_SIZES.lead },
  lineHeight: LINE_HEIGHTS.tight,
};

export const scenePresenterActionsSx = {
  alignItems: 'center',
  flexWrap: 'wrap',
  pl: { xs: 0, md: 1.25 },
  borderLeft: { xs: 0, md: `1px solid ${vttAlpha(VTT_COLORS.accent, OPACITY.fill)}` },
  '& .MuiButton-root': {
    minHeight: CONTROL_HEIGHTS.lg,
    fontSize: FONT_SIZES.sm,
    whiteSpace: 'nowrap',
  },
};

// A footnote on the title rather than a control of its own: small, riding the
// top of the text, and only fully lit once it is pointed at.
export const sceneRenameButtonSx = {
  width: 18,
  height: 18,
  p: 0,
  alignSelf: 'flex-start',
  mt: -0.25,
  color: vttAlpha(VTT_COLORS.white, OPACITY.edge),
  '&:hover': {
    color: 'gmboard.vtt.accent',
    bgcolor: 'gmboard.vtt.accentWash',
  },
};

export const sceneViewSwitchSx = {
  ml: 'auto',
  pl: { xs: 0, md: 0.5 },
  order: { md: 2 },
};

// On a desktop the wrapper disappears and its children sit in the bar as
// before. Below md it becomes its own full-width row under the name, with the
// live controls on the left and Player view + Sheet on the right; the buttons
// lose their leading icons and some padding so the four fit a phone's width.
export const sceneGmControlsSx = (theme) => ({
  display: { xs: 'flex', md: 'contents' },
  flexBasis: '100%',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 0.75,
  minWidth: 0,
  // Phones only: tablets keep the buttons as they are. `&&` outranks the
  // presenter group's own button rule, which is inserted after this one.
  [theme.breakpoints.down('sm')]: {
    '&& .MuiButton-root': {
      minWidth: 0,
      px: 0.75,
      fontSize: FONT_SIZES.xs,
    },
    '& .MuiButton-startIcon': {
      display: 'none',
    },
  },
});

// A player's bar keeps the Sheet button on the name's row.
export const sceneControlsPassThroughSx = {
  display: 'contents',
};

// The player preview sits with the sheet switch and takes its height, so the
// two read as one pair of view controls.
export const viewButtonSx = {
  height: CONTROL_HEIGHTS.xl,
  fontSize: FONT_SIZES.sm,
  whiteSpace: 'nowrap',
};

// A player's bar holds only the name and this button, so on a phone or tablet
// it belongs at the far edge too, not pressed against the campaign's name.
export const scenePlayerViewSwitchSx = {
  ml: 'auto',
  pl: 0.5,
  order: { md: 2 },
};

export const spectatorRootSx = {
  position: 'fixed',
  inset: 0,
  width: '100vw',
  height: '100vh',
  overflow: 'hidden',
  bgcolor: 'common.black',
};

export const editorRootSx = {
  flex: 1,
  // Without this a flex child refuses to shrink below its content, and the map
  // would push the page taller instead of fitting inside it.
  minHeight: 0,
};

export const contentLayoutSx = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  gap: 1,
  flex: 1,
  minHeight: 0,
  // Stretched, not top-aligned: the cell has to be as tall as the row for the
  // map inside it to have a height to fill.
  alignItems: 'stretch',
};

export const contentLayoutOpenSx = {
  gridTemplateColumns: 'minmax(0, 1fr)',
  columnGap: 1,
  rowGap: 1,
  // Leave part of the actual workspace available for the sheet, even when
  // browser chrome and wrapped controls leave little height in landscape.
  // A viewport-only map height can cover the whole scroll area; map gestures
  // then intercept every touch and the sheet below is unreachable. A fifth is
  // enough for the sheet's header and a swipe; at 65% the map of a phone was
  // a small square (user report 2026-10-26).
  overflowX: 'hidden',
  overflowY: 'auto',
  gridTemplateRows: '80% max-content',
  alignContent: 'start',
  [SHEET_SIDE_BY_SIDE_QUERY]: {
    gridTemplateColumns: 'var(--sheet-grid-columns)',
    columnGap: 0,
    gridTemplateRows: 'minmax(0, 1fr)',
    alignContent: 'stretch',
    overflowY: 'hidden',
  },
};

export const viewportCellSx = {
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
};

export const sheetViewSx = {
  minWidth: 0,
  minHeight: 'auto',
  // The workspace owns scrolling while stacked. A hidden overflow container
  // with overscroll containment traps swipes before they reach that workspace.
  overflow: 'clip',
  [SHEET_SIDE_BY_SIDE_QUERY]: {
    minHeight: 0,
    height: '100%',
    overflow: 'auto',
    overscrollBehavior: 'contain',
    contain: 'layout paint',
  },
  border: '2px solid',
  borderColor: 'gmboard.vtt.accentBorderStrong',
  borderRadius: 1.5,
  bgcolor: vttAlpha(VTT_COLORS.black, OPACITY.veil),
  backgroundImage: `linear-gradient(145deg, ${vttAlpha(VTT_COLORS.white, OPACITY.faint)}, transparent 42%)`,
  boxShadow: UI_SHADOWS.overlay,
  isolation: 'isolate',
  '& > *': {
    width: '100%',
    maxWidth: 760,
    mx: 'auto',
  },
};

export const sheetLoadingSx = {
  minHeight: 420,
  display: 'grid',
  placeItems: 'center',
};

// Half-transparent version of a stroke colour, for the layers not being edited.
export function fade(color) {
  const hex = normalizeHexColor(color, VTT_COLORS.accent);
  return `${hex}55`;
}
