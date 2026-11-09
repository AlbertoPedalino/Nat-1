import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import { mapIconButtonSx } from './battleMapSurface.js';
import { UI_FONTS, FONT_SIZES, LETTER_SPACINGS } from '../../../shared/ui/fonts.js';
import { UI_SHADOWS } from '../../../shared/ui/shadows.js';

// Styles of the battle-map viewport: host, covering overlay, play area,
// placement target, selection marquee and toolbar, corner and fullscreen
// buttons, picture and layer switches.

// Where the browser refuses real fullscreen, the map takes the window instead.
// Below MUI's modal layer on purpose: a dialog opened from the map still has to
// come out on top of it.
export const coveringSx = {
  position: 'fixed',
  inset: 0,
  zIndex: 1200,
  // `dvh`, not `%`: a fixed box measured against the initial containing block is
  // as tall as the page believes the window to be, which on a phone includes the
  // strip behind the browser's own bars — and the controls along the bottom of
  // the map went under them.
  height: '100dvh',
  maxHeight: 'none',
  borderRadius: 0,
};

export const hostSx = {
  position: 'relative',
  overflow: 'hidden',
  // Takes what the page has left rather than subtracting a hand-counted number
  // of pixels from the window. The old `calc(100vh - 164px)` was the app bar
  // plus the padding plus the title row added up by hand: it broke whenever the
  // title wrapped, and on a phone `100vh` includes the strip behind the address
  // bar, so the bottom of the board sat under the browser's own chrome.
  flex: 1,
  height: '100%',
  // Every ancestor already opts into shrinking. A fixed 320 px floor overflowed
  // the short height of a phone in landscape, so the viewport was clipped before
  // its bottom-left and bottom-right controls.
  minHeight: 0,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
  // Match the fully covered player fog exactly. When a map ends, the empty
  // viewport is therefore indistinguishable from unexplored territory and
  // gives the table no silhouette of the image bounds.
  bgcolor: VTT_COLORS.black,
  touchAction: 'none',
  overscrollBehavior: 'none',
  // The fullscreen element keeps its own height rule, or the map would sit in a
  // letterboxed strip in the middle of a black screen. The webkit spelling is
  // still what Safari matches.
  '&:fullscreen': { width: '100vw', height: '100vh', maxHeight: 'none', borderRadius: 0 },
  '&:-webkit-full-screen': { width: '100vw', height: '100vh', maxHeight: 'none', borderRadius: 0 },
};

export const fillViewportSx = {
  width: '100vw',
  height: '100vh',
  minHeight: 0,
  maxHeight: 'none',
  border: 0,
  borderRadius: 0,
};

export const placementTargetSx = {
  outline: `2px dashed ${vttAlpha(VTT_COLORS.gold, 0.78)}`,
  outlineOffset: -5,
  boxShadow: `inset 0 0 34px ${vttAlpha(VTT_COLORS.gold, 0.12)}`,
};

export const placementTargetHintSx = {
  position: 'absolute',
  top: 10,
  left: '50%',
  zIndex: 9,
  transform: 'translateX(-50%)',
  px: 1.25,
  py: 0.55,
  borderRadius: 10,
  bgcolor: vttAlpha(VTT_COLORS.ink, 0.92),
  color: VTT_COLORS.gold,
  border: `1px solid ${vttAlpha(VTT_COLORS.gold, 0.62)}`,
  boxShadow: UI_SHADOWS.float,
  fontFamily: UI_FONTS.display,
  fontSize: FONT_SIZES.xs,
  fontWeight: 700,
  letterSpacing: LETTER_SPACINGS.md,
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
};

export const selectionMarqueeSx = {
  position: 'absolute',
  zIndex: 5,
  pointerEvents: 'none',
  boxSizing: 'border-box',
  border: `1px solid ${VTT_COLORS.gold}`,
  bgcolor: vttAlpha(VTT_COLORS.gold, 0.16),
  boxShadow: `0 0 0 1px ${vttAlpha(VTT_COLORS.black, 0.5)}`,
};

export const selectionToolbarSx = {
  position: 'absolute',
  left: '50%',
  top: 8,
  zIndex: 7,
  transform: 'translateX(-50%)',
  alignItems: 'center',
  px: 1,
  py: 0.5,
  borderRadius: 1,
  bgcolor: vttAlpha(VTT_COLORS.ink, 0.94),
  border: `1px solid ${vttAlpha(VTT_COLORS.gold, 0.45)}`,
  boxShadow: 4,
};

export const selectionCountSx = {
  color: VTT_COLORS.gold,
  fontFamily: UI_FONTS.display,
  fontSize: FONT_SIZES.sm,
  fontWeight: 700,
  whiteSpace: 'nowrap',
};

export const playAreaSvgSx = {
  position: 'absolute',
  inset: 0,
  overflow: 'hidden',
  pointerEvents: 'none',
};

export const playAreaStrokeProps = {
  fill: 'none',
  stroke: vttAlpha(VTT_COLORS.gold, 0.7),
  strokeWidth: 2,
  strokeDasharray: '7 5',
};

// The fullscreen Sheet: dark glass, gold edge, the tools toggle's height.
export const fullscreenSheetButtonSx = {
  height: 32,
  minWidth: 88,
  borderColor: vttAlpha(VTT_COLORS.gold, 0.42),
  bgcolor: vttAlpha(VTT_COLORS.ink, 0.82),
  fontFamily: UI_FONTS.display,
  fontSize: FONT_SIZES.xs,
  letterSpacing: LETTER_SPACINGS.lg,
  '&:hover': { bgcolor: vttAlpha(VTT_COLORS.ink, 0.96) },
};

// Above the rail (top 48), which hangs just below the tools toggle.
export const cornerButtonsSx = {
  position: 'absolute',
  top: 8,
  right: 8,
  zIndex: 7,
  alignItems: 'center',
};

// Bottom right, above everything, and out of the way of the pieces.
export const fullscreenBtnSx = { ...mapIconButtonSx, position: 'absolute', zIndex: 6, right: 8, bottom: 8 };

// Top left, and everything about pictures with it: the switch and the panel
// that manages them are one job, and splitting them across two corners meant
// crossing the map to finish a single thought.
export const imageSwitchSx = {
  position: 'absolute',
  left: 8,
  top: 8,
  // Bounded at the bottom as well, so the panel it holds has a height to measure
  // itself against. Sized against the window instead, the panel grew past the
  // map it lives in and the map's own edge cut it off — the page has no scroll
  // to reach the rest with, and in fullscreen there is no page at all.
  bottom: 8,
  display: 'flex',
  // Stretched rather than top-aligned: a child with `height: 100%` needs a
  // parent whose height is definite, and that is the whole trick here.
  alignItems: 'stretch',
  zIndex: 6,
  // Now that it runs the height of the map, the strip must not take the clicks
  // along it: it is a place to stand, not a control. What it holds opts back in.
  pointerEvents: 'none',
  cursor: 'default',
};

// Bottom left, opposite it, where a constant piece of state belongs.
export const layerSwitchSx = {
  position: 'absolute',
  left: 8,
  bottom: 8,
  zIndex: 6,
  borderRadius: 1,
  cursor: 'default',
};

// Bottom centre, clear of the layer switch on the left and the fullscreen
// button on the right; on a narrow map it rises above the layer switch instead.
export const backgroundStripSx = {
  position: 'absolute',
  left: '50%',
  transform: 'translateX(-50%)',
  bottom: { xs: 52, md: 8 },
  zIndex: 6,
  display: 'flex',
  justifyContent: 'center',
  width: 'max-content',
  maxWidth: { xs: 'calc(100% - 16px)', md: 'calc(100% - 400px)' },
  cursor: 'default',
};

export const placeholderSx = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'text.secondary',
  fontStyle: 'italic',
  textAlign: 'center',
  px: 2,
};

export const distanceSx = {
  position: 'absolute',
  left: 0,
  top: 0,
  px: 0.75,
  borderRadius: 1,
  bgcolor: vttAlpha(VTT_COLORS.ink, 0.9),
  color: VTT_COLORS.gold,
  fontFamily: UI_FONTS.display,
  fontSize: FONT_SIZES.sm,
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
};

export const placementCountSx = {
  position: 'absolute',
  right: -8,
  bottom: -8,
  minWidth: 24,
  height: 24,
  px: 0.5,
  borderRadius: 12,
  bgcolor: VTT_COLORS.gold,
  color: VTT_COLORS.ink,
  border: `1px solid ${VTT_COLORS.ink}`,
  fontSize: FONT_SIZES.md,
  fontWeight: 900,
  lineHeight: '22px',
  textAlign: 'center',
};
