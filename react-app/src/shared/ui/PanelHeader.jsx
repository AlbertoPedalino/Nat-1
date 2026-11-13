import { Box, Typography } from '@mui/material';
import { UI_COLORS, uiAlpha, OPACITY } from './colors.js';
import { FONT_SIZES, LINE_HEIGHTS } from './fonts.js';
import { TEXT_STYLES } from './textStyles.js';
import { SURFACES } from './surfaces.js';
import { ICON_SIZES } from './iconSizes.js';
import { UI_SHADOWS } from './shadows.js';
import { SEAL_RADIUS } from './radius.js';

// The title bar of a panel (Saving Throws, Skills, Senses, Movement,
// Proficiencies, a builder step) and of SheetDialog: a header-tint bar over an
// ink line, its icon on a small badge of the panel's colour, an uppercase
// title. `tone` colours the badge and the title (Movement turns orange under a
// penalty); `children` go at the end.

export const panelBarSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  bgcolor: UI_COLORS.surfaceHeader,
  borderBottom: 2,
  borderColor: UI_COLORS.edge,
};

// A panel's bar cut as a ribbon: each end notched in a swallowtail `notch`
// px deep, the notch inked like every edge, all inside the bar's own box (an
// ornament poking out of a panel is cut by its frame and grows scrollbars).
// Spread after the bar's padding: it widens the ends (`px`, theme units) to
// clear the notch.
function notchInk(side, notch) {
  const points = side === 'left' ? `0,0 ${notch},50 0,100` : `${notch},0 0,50 ${notch},100`;
  // Twice the ink edge: the clip cuts the outer half of the line away.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${notch} 100" preserveAspectRatio="none">`
    + `<polyline points="${points}" fill="none" stroke="${UI_COLORS.edge}" stroke-width="4" vector-effect="non-scaling-stroke" stroke-linejoin="miter"/></svg>`;
  return {
    content: '""',
    position: 'absolute',
    [side]: 0,
    top: 0,
    // Down over the bar's bottom border, as the clip is.
    bottom: -2,
    width: notch,
    backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
    backgroundSize: '100% 100%',
    pointerEvents: 'none',
  };
}
function ribbonSx(notch, px) {
  return {
    position: 'relative',
    px,
    clipPath: `polygon(0 0, 100% 0, calc(100% - ${notch}px) 50%, 100% 100%, 0 100%, ${notch}px 50%)`,
    '&::before': notchInk('left', notch),
    '&::after': notchInk('right', notch),
  };
}

const PANEL_RIBBON_SX = ribbonSx(10, 2.25);
// A stat tile's narrow bar: a shallow notch and slim ends, so its name
// (Armor Class, Inspiration) keeps the room.
const TILE_RIBBON_SX = ribbonSx(4, 0.625);

// A panel bar's screentone: fine diagonal hatching in the panel's own colour,
// so each kind of panel carries its texture. `tone` is a palette colour (hex).
export function panelScreentone(tone = UI_COLORS.accent) {
  const ink = String(tone).startsWith('#') ? tone : UI_COLORS.accent;
  return `repeating-linear-gradient(-45deg, ${uiAlpha(ink, OPACITY.soft)} 0 2px, transparent 2px 7px)`;
}

// The title bar of every panel, whole: the bar, its padding, its ribbon cut
// and its screentone in `tone`. PanelHeader, a stat tile (`tile`: a
// narrower notch), the sheet's tab bar and a dialog's title all take it, so a
// restyle of the bar reaches every one; nothing outside this file builds a
// panel's bar from the pieces.
export function panelTitleBarSx(tone = UI_COLORS.accent, { tile = false } = {}) {
  return {
    ...panelBarSx,
    ...panelBarPadSx,
    ...(tile ? TILE_RIBBON_SX : PANEL_RIBBON_SX),
    backgroundImage: panelScreentone(tone),
  };
}

// The icon's badge in a panel bar: a wax seal in the tone, edged in ink, its
// game drawing large enough to read (PANEL_BADGE_ICON).
export const PANEL_BADGE_ICON = ICON_SIZES.xl;
// The badge's outer size: its icon, 4px of padding (the seal is round: the
// drawing keeps clear of its edge) and 2px of edge a side. A bar without a
// badge (a stat tile's) holds this height to line up with one.
export const PANEL_BADGE_BOX = PANEL_BADGE_ICON + 12;

// The room round a panel bar's badge, the same for every bar (a PanelHeader,
// the sheet's tab bar).
const panelBarPadSx = { px: '0.8rem', py: '0.36rem' };

export function panelBadgeSx(tone = 'primary.main') {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    p: 0.5,
    borderRadius: SEAL_RADIUS,
    bgcolor: tone,
    color: UI_COLORS.edge,
    border: 2,
    borderColor: UI_COLORS.edge,
    // The seal's solid ink shadow, as under every drawn box.
    boxShadow: UI_SHADOWS.box,
    flexShrink: 0,
  };
}

export const panelTitleSx = {
  ...TEXT_STYLES.heading,
  fontSize: FONT_SIZES.body,
  color: 'primary.main',
};

// A stat tile's name: the panel title's size where the tile has room (Str,
// Dex), shrinking with the tile's own width where it has not (Prof. Bonus,
// Inspiration in their narrow row, any tile on a phone), so a name is never
// cut. The tile is its container (containerType on the tile's frame).
export const tileTitleSx = { ...panelTitleSx, fontSize: `min(${FONT_SIZES.xxl}, 14cqi)` };

// A main panel (a sheet panel, a builder step's panel): the comic panel's
// thicker ink frame and its solid shadow. Boxes inside it keep the thinner
// edge, so the panels read first.
//
// From md up each main panel is drawn on a layer of its own. Where a card
// opens or a list grows, the page is repainted in strips as wide as the
// window, panels that do not move included: on a 1920px desktop two of every
// three frames of a card's opening were dropped (24ms a frame). On their own
// layers the panels keep their drawing and only move: 13.3ms, none dropped.
// A layer is a containing block for `position: fixed`, so what floats over
// the page (menus, toasts, dialogs) portals out of the panel, as it already
// does. A phone, with one narrow column, was smooth without.
export const panelFrameSx = {
  border: `3px solid ${UI_COLORS.edge}`,
  boxShadow: UI_SHADOWS.panel,
  overflow: 'hidden',
  willChange: { md: 'transform' },
};

// The name on a card or row (an action, a chosen species or background): the
// body face, bold, a step over the body text.
export const cardTitleSx = {
  ...TEXT_STYLES.cardName,
  // Small capitals stand lower than capitals: a step up, as item and spell
  // cards already letter their names.
  fontSize: FONT_SIZES.xxl,
  color: 'text.primary',
};

// The body of a panel under its PanelHeader.
export const panelBodySx = { px: 1, py: 0.75 };

// The caption over a group of controls or a list (a selector's name, a
// history's title): small, uppercase, quiet.
export const captionLabelSx = {
  ...TEXT_STYLES.label,
  fontSize: FONT_SIZES.sm,
  color: 'text.secondary',
};

// The smallest caption, inside a result line (a step's kind, a field name).
export const microLabelSx = {
  ...TEXT_STYLES.label,
  fontSize: FONT_SIZES.xs,
  color: 'text.secondary',
};

// The heading of a group of rows on a sheet tab (a spell level, an inventory
// section, a feature list): uppercase, over a rule. `color` tints the text,
// `rule` the line under it (null: no line).
export function sheetSectionHeaderSx({ color = 'text.secondary', rule = 'divider' } = {}) {
  return {
    ...TEXT_STYLES.label,
    fontSize: FONT_SIZES.sm,
    color,
    ...(rule ? { borderBottom: 1, borderColor: rule, pb: 0.5 } : {}),
  };
}

// A framed box on the sheet (Conditions, Reminders, Defenses, the ability
// scores, hit points): the header tint inside a thin border. Its title is
// sheetBoxTitleSx, the panel title's lettering.
export const sheetBoxSx = {
  ...SURFACES.panel, 
};

export const sheetBoxTitleSx = { ...panelTitleSx, mb: 0.5 };

// A sheet readout: a big gold number over its tiny uppercase name (AC,
// Initiative, Speed).
// The side of a stat tile (Initiative, Proficiency Bonus, Inspiration) and the
// width of the AC shield beside them: big enough to find at a glance.
export const STAT_TILE_SIZE = 80;

export const statValueSx = {
  ...TEXT_STYLES.figure,
  fontSize: FONT_SIZES.display,
  color: UI_COLORS.accentText,
  lineHeight: LINE_HEIGHTS.none,
};

// The name at the start of a row of values on a card (Status, Uses, Free
// Cast).
export const inlineMetaLabelSx = {
  fontSize: FONT_SIZES.xxs,
  color: 'text.secondary',
  ...TEXT_STYLES.label,
};

// The small uppercase label of a section inside a panel.
export const sectionLabelSx = {
  ...TEXT_STYLES.label,
  fontSize: FONT_SIZES.xxxs,
};

// `titleSx` resizes the title for a page whose panels are its main content (the
// builder); the sheet keeps panelTitleSx as it is.
export default function PanelHeader({ icon: Icon, title, tone = UI_COLORS.accent, titleSx, children }) {
  return (
    <Box sx={panelTitleBarSx(tone)}>
      {Icon ? <Box sx={panelBadgeSx(tone)}><Icon size={PANEL_BADGE_ICON} /></Box> : null}
      <Typography sx={{ ...panelTitleSx, ...titleSx, color: tone }}>{title}</Typography>
      {children}
    </Box>
  );
}
