import { Box, Typography } from '@mui/material';
import { UI_COLORS } from './colors.js';
import { FONT_SIZES, FONT_WEIGHTS, LINE_HEIGHTS } from './fonts.js';
import { TEXT_STYLES } from './textStyles.js';
import { SURFACES } from './surfaces.js';
import { ICON_SIZES } from './iconSizes.js';

// The title bar of a sheet panel (Saving Throws, Skills, Senses, Movement,
// Proficiencies) and of SheetDialog: a dark bar with a gold left accent, an
// icon and an uppercase Cinzel title. `tone` recolours the accent and the
// title (Movement turns orange under a penalty); `children` go at the end.

export const panelBarSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  bgcolor: UI_COLORS.surfaceHeader,
  borderBottom: 1,
  borderColor: 'divider',
  borderLeft: 3,
  borderLeftColor: 'primary.main',
};

export const panelTitleSx = {
  ...TEXT_STYLES.label,
  fontSize: FONT_SIZES.xs,
  color: 'primary.main',
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
export const statValueSx = {
  ...TEXT_STYLES.figure,
  fontSize: FONT_SIZES.title,
  color: UI_COLORS.accentText,
  lineHeight: LINE_HEIGHTS.none,
};

export const statLabelSx = {
  ...TEXT_STYLES.label,
  fontSize: FONT_SIZES.micro,
  color: 'text.secondary',
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
export default function PanelHeader({ icon: Icon, title, tone = 'primary.main', titleSx, children }) {
  return (
    <Box sx={{ ...panelBarSx, px: '0.8rem', py: '0.48rem', borderLeftColor: tone }}>
      {Icon ? <Icon size={ICON_SIZES.sm} /> : null}
      <Typography sx={{ ...panelTitleSx, ...titleSx, color: tone }}>{title}</Typography>
      {children}
    </Box>
  );
}
