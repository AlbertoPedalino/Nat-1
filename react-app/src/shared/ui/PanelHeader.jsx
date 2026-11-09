import { Box, Typography } from '@mui/material';
import { UI_COLORS } from './colors.js';
import { UI_FONTS, FONT_SIZES, LETTER_SPACINGS } from './fonts.js';

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
  fontFamily: UI_FONTS.display,
  fontSize: FONT_SIZES.xs,
  fontWeight: 700,
  letterSpacing: LETTER_SPACINGS.xxl,
  textTransform: 'uppercase',
  color: 'primary.main',
};

// The caption over a group of controls or a list (a selector's name, a
// history's title): small, uppercase, quiet.
export const captionLabelSx = {
  fontFamily: UI_FONTS.display,
  fontSize: FONT_SIZES.sm,
  letterSpacing: LETTER_SPACINGS.lg,
  textTransform: 'uppercase',
  color: 'text.secondary',
};

// The smallest caption, inside a result line (a step's kind, a field name).
export const microLabelSx = {
  fontFamily: UI_FONTS.display,
  fontSize: FONT_SIZES.xs,
  letterSpacing: LETTER_SPACINGS.md,
  textTransform: 'uppercase',
  color: 'text.secondary',
};

// The heading of a group of rows on a sheet tab (a spell level, an inventory
// section, a feature list): uppercase, over a rule. `color` tints the text,
// `rule` the line under it (null: no line).
export function sheetSectionHeaderSx({ color = 'text.secondary', rule = 'divider' } = {}) {
  return {
    fontFamily: UI_FONTS.display,
    fontSize: FONT_SIZES.sm,
    fontWeight: 700,
    letterSpacing: LETTER_SPACINGS.xxl,
    textTransform: 'uppercase',
    color,
    ...(rule ? { borderBottom: 1, borderColor: rule, pb: '4px' } : {}),
  };
}

// A framed box on the sheet (Conditions, Reminders, Defenses, the ability
// scores, hit points): the header tint inside a thin border. Its title is
// sheetBoxTitleSx, the panel title's lettering.
export const sheetBoxSx = {
  bgcolor: UI_COLORS.surfaceHeader,
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
};

export const sheetBoxTitleSx = { ...panelTitleSx, mb: 0.4 };

// The line a list or panel shows when it has nothing in it.
export const emptyTextSx = { fontSize: FONT_SIZES.xl, color: 'text.secondary', fontStyle: 'italic' };

// A sheet readout: a big gold number over its tiny uppercase name (AC,
// Initiative, Speed).
export const statValueSx = {
  fontFamily: UI_FONTS.display,
  fontSize: FONT_SIZES.title,
  fontWeight: 700,
  color: UI_COLORS.accentText,
  lineHeight: 1,
};

export const statLabelSx = {
  fontFamily: UI_FONTS.display,
  fontSize: FONT_SIZES.micro,
  fontWeight: 700,
  letterSpacing: LETTER_SPACINGS.xl,
  textTransform: 'uppercase',
  color: 'text.secondary',
};

// The name at the start of a row of values on a card (Status, Uses, Free
// Cast).
export const inlineMetaLabelSx = {
  fontSize: FONT_SIZES.xxs,
  color: 'text.secondary',
  fontFamily: UI_FONTS.display,
  letterSpacing: LETTER_SPACINGS.lg,
  textTransform: 'uppercase',
};

// The small uppercase label of a section inside a panel.
export const sectionLabelSx = {
  fontFamily: UI_FONTS.display,
  fontSize: FONT_SIZES.xxxs,
  fontWeight: 700,
  letterSpacing: LETTER_SPACINGS.xxl,
  textTransform: 'uppercase',
};

export default function PanelHeader({ icon: Icon, title, tone = 'primary.main', children }) {
  return (
    <Box sx={{ ...panelBarSx, px: '0.8rem', py: '0.48rem', borderLeftColor: tone }}>
      {Icon ? <Icon size={14} /> : null}
      <Typography sx={{ ...panelTitleSx, color: tone }}>{title}</Typography>
      {children}
    </Box>
  );
}
