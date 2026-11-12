import { Box, Typography } from '@mui/material';
import { UI_COLORS, uiAlpha, OPACITY } from './colors.js';
import { FONT_SIZES, FONT_WEIGHTS, LINE_HEIGHTS } from './fonts.js';
import { TEXT_STYLES } from './textStyles.js';
import { SURFACES } from './surfaces.js';
import { ICON_SIZES } from './iconSizes.js';
import { UI_SHADOWS } from './shadows.js';

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

// A panel bar's screentone: fine diagonal hatching in the panel's own colour,
// so each kind of panel carries its texture. `tone` is a palette colour (hex).
export function panelScreentone(tone = UI_COLORS.accent) {
  const ink = String(tone).startsWith('#') ? tone : UI_COLORS.accent;
  return `repeating-linear-gradient(-45deg, ${uiAlpha(ink, OPACITY.soft)} 0 2px, transparent 2px 7px)`;
}

// The icon's badge in a panel bar: the tone filled, edged in ink, its game
// drawing large enough to read (PANEL_BADGE_ICON).
export const PANEL_BADGE_ICON = ICON_SIZES.xxl;
// The badge's outer size: its icon, 2px of padding and 2px of edge a side. A
// bar without a badge (a stat tile's) holds this height to line up with one.
export const PANEL_BADGE_BOX = PANEL_BADGE_ICON + 8;

// The room round a panel bar's badge, the same for every bar (a PanelHeader,
// the sheet's tab bar).
export const panelBarPadSx = { px: '0.8rem', py: '0.36rem' };

export function panelBadgeSx(tone = 'primary.main') {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    p: 0.25,
    borderRadius: 1,
    bgcolor: tone,
    color: UI_COLORS.edge,
    border: 2,
    borderColor: UI_COLORS.edge,
    flexShrink: 0,
  };
}

export const panelTitleSx = {
  ...TEXT_STYLES.shout,
  fontSize: FONT_SIZES.xxl,
  color: 'primary.main',
};

// A main panel (a sheet panel, a builder step's panel): the comic panel's
// thicker ink frame and its solid shadow. Boxes inside it keep the thinner
// edge, so the panels read first.
export const panelFrameSx = {
  border: `3px solid ${UI_COLORS.edge}`,
  boxShadow: UI_SHADOWS.panel,
  overflow: 'hidden',
};

// The name on a card or row (an action, a chosen species or background): the
// body face, bold, a step over the body text.
export const cardTitleSx = {
  fontSize: FONT_SIZES.lg,
  fontWeight: FONT_WEIGHTS.bold,
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

// The line a list or panel shows when it has nothing in it.
export const emptyTextSx = { ...TEXT_STYLES.note, fontSize: FONT_SIZES.xl };

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
    <Box sx={{ ...panelBarSx, ...panelBarPadSx, backgroundImage: panelScreentone(tone) }}>
      {Icon ? <Box sx={panelBadgeSx(tone)}><Icon size={PANEL_BADGE_ICON} /></Box> : null}
      <Typography sx={{ ...panelTitleSx, ...titleSx, color: tone }}>{title}</Typography>
      {children}
    </Box>
  );
}
