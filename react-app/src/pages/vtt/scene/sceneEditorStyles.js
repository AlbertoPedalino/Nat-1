import { battleMapSurfaceSx } from '../map/battleMapSurface.js';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import { SHEET_SIDE_BY_SIDE_QUERY } from '../../../shared/vtt/sheets/sheetLayout.js';

export const sceneTopbarSx = {
  ...battleMapSurfaceSx,
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 1,
  px: { xs: 1, md: 1.25 },
  py: 0.85,
  borderRadius: 1,
  boxShadow: `0 8px 24px ${vttAlpha(VTT_COLORS.black, 0.22)}`,
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

export const sceneTitleSx = {
  color: 'primary.main',
  fontSize: { xs: '0.98rem', md: '1.08rem' },
  lineHeight: 1.2,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export const scenePresenterActionsSx = {
  alignItems: 'center',
  flexWrap: 'wrap',
  pl: { xs: 0, md: 1.25 },
  borderLeft: { xs: 0, md: `1px solid ${vttAlpha(VTT_COLORS.gold, 0.16)}` },
  '& .MuiButton-root': {
    minHeight: 30,
    fontSize: '0.67rem',
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
  color: vttAlpha(VTT_COLORS.white, 0.42),
  '&:hover': {
    color: 'gmboard.vtt.gold',
    bgcolor: 'gmboard.vtt.goldWash',
  },
};

export const sceneViewSwitchSx = {
  ml: { xs: 0, md: 'auto' },
  pl: { xs: 0, md: 0.5 },
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
  border: '1px solid',
  borderColor: 'gmboard.vtt.goldBorderStrong',
  borderRadius: 1.5,
  bgcolor: vttAlpha(VTT_COLORS.overlaySurface, 0.88),
  backgroundImage: `linear-gradient(145deg, ${vttAlpha(VTT_COLORS.white, 0.025)}, transparent 42%)`,
  boxShadow: `0 18px 52px ${vttAlpha(VTT_COLORS.black, 0.46)}`,
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
  const hex = typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color) ? color : VTT_COLORS.gold;
  return `${hex}55`;
}
