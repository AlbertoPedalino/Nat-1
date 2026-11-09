import { createTheme } from '@mui/material';
import { theme } from '../../../app/theme.js';
import { UI_COLORS, uiAlpha } from '../../../shared/ui/colors.js';
import { UI_FONTS, FONT_SIZES, LETTER_SPACINGS } from '../../../shared/ui/fonts.js';

// The character builder's denser look: the page root's descendant defaults and
// the theme the builder renders under (CharBuilder's ThemeProvider).
export const builderRootSx = {
  minHeight: '100vh',
  bgcolor: 'background.default',
  '& .MuiPaper-root, & .MuiCard-root': {
    bgcolor: UI_COLORS.headerBg,
    backgroundImage: 'none',
    borderColor: 'divider',
    borderRadius: 1,
  },
  // Builder component defaults live in `builderTheme` below. Theme overrides
  // keep specificity low so component `sx` can still set colors and sizing.
  '& .MuiButton-root': {
    minHeight: 0,
    borderRadius: 1,
    fontFamily: UI_FONTS.display,
    fontSize: FONT_SIZES.xs,
    letterSpacing: LETTER_SPACINGS.sm,
    px: 1,
    py: 0.38,
  },
  '& .MuiTab-root': {
    minHeight: 0,
    py: 0.75,
    px: 1.05,
    fontFamily: UI_FONTS.display,
    fontSize: FONT_SIZES.xs,
    letterSpacing: LETTER_SPACINGS.md,
    color: 'text.secondary',
  },
  '& .MuiTabs-indicator': { bgcolor: 'primary.main' },
  '& .MuiInputBase-root': {
    bgcolor: UI_COLORS.surfaceDeep,
    borderRadius: 1,
    fontSize: FONT_SIZES.md,
  },
  '& .MuiInputBase-input': {
    py: '7px',
    fontSize: FONT_SIZES.md,
  },
  '& .MuiAlert-root': {
    py: 0.35,
    px: 1,
    fontSize: FONT_SIZES.md,
    bgcolor: UI_COLORS.headerBg,
    border: `1px solid ${uiAlpha(UI_COLORS.primary, 0.18)}`,
    color: 'text.secondary',
  },
  '& .MuiCardContent-root': {
    p: 0.75,
    '&:last-child': { pb: 0.75 },
  },
};

// Builder-scoped component defaults use theme overrides instead of descendant
// selectors in `builderRootSx`. This keeps component `sx` authoritative for
// custom colors/sizes. Scoped to the builder via the ThemeProvider in render.
const BUILDER_SELECTED_SX = {
  color: UI_COLORS.textPrimary,
  backgroundColor: uiAlpha(UI_COLORS.primary, 0.20),
  boxShadow: `inset 3px 0 0 ${UI_COLORS.primary}`,
};
const BUILDER_SELECTED_HOVER_BG = uiAlpha(UI_COLORS.primary, 0.28);
export const builderTheme = createTheme(theme, {
  components: {
    MuiTypography: {
      styleOverrides: {
        h1: { fontFamily: UI_FONTS.display, fontSize: FONT_SIZES.lead, lineHeight: 1.15, fontWeight: 800 },
        h2: { fontFamily: UI_FONTS.display, fontSize: FONT_SIZES.xl, lineHeight: 1.2, fontWeight: 800 },
        body1: { fontSize: FONT_SIZES.xl },
        body2: { fontSize: FONT_SIZES.md },
        caption: { fontSize: FONT_SIZES.xs },
        overline: { fontFamily: UI_FONTS.display, fontSize: FONT_SIZES.xxs, lineHeight: 1.6, fontWeight: 800 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          height: 19,
          borderRadius: 0.375,
          fontFamily: UI_FONTS.display,
          fontSize: FONT_SIZES.xxs,
          letterSpacing: LETTER_SPACINGS.sm,
          backgroundColor: uiAlpha(UI_COLORS.gold, 0.08),
          borderColor: uiAlpha(UI_COLORS.gold, 0.28),
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          padding: '4.4px 7.2px',
          backgroundColor: UI_COLORS.headerBg,
          '&.Mui-selected': BUILDER_SELECTED_SX,
          '&.Mui-selected:hover': {
            backgroundColor: BUILDER_SELECTED_HOVER_BG,
          },
          '&:hover': {
            backgroundColor: UI_COLORS.surfaceRaised,
          },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          color: UI_COLORS.textSecondary,
          '&.Mui-selected': BUILDER_SELECTED_SX,
          '&.Mui-selected:hover': {
            backgroundColor: BUILDER_SELECTED_HOVER_BG,
          },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          '&.Mui-selected': BUILDER_SELECTED_SX,
          '&.Mui-selected:hover': {
            backgroundColor: BUILDER_SELECTED_HOVER_BG,
          },
        },
      },
    },
  },
});
