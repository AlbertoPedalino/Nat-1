import { createTheme } from '@mui/material';
import { theme } from '../../../app/theme.js';
import { UI_COLORS, uiAlpha } from '../../../shared/ui/colors.js';
import { UI_FONTS } from '../../../shared/ui/fonts.js';

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
    fontSize: '0.62rem',
    letterSpacing: '0.04em',
    px: 1,
    py: 0.38,
  },
  '& .MuiTab-root': {
    minHeight: 0,
    py: 0.75,
    px: 1.05,
    fontFamily: UI_FONTS.display,
    fontSize: '0.6rem',
    letterSpacing: '0.06em',
    color: 'text.secondary',
  },
  '& .MuiTabs-indicator': { bgcolor: 'primary.main' },
  '& .MuiInputBase-root': {
    bgcolor: UI_COLORS.surfaceDeep,
    borderRadius: 1,
    fontSize: '0.74rem',
  },
  '& .MuiInputBase-input': {
    py: '7px',
    fontSize: '0.74rem',
  },
  '& .MuiAlert-root': {
    py: 0.35,
    px: 1,
    fontSize: '0.7rem',
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
const CINZEL = UI_FONTS.display;
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
        h1: { fontFamily: CINZEL, fontSize: '1.08rem', lineHeight: 1.15, fontWeight: 800 },
        h2: { fontFamily: CINZEL, fontSize: '0.82rem', lineHeight: 1.2, fontWeight: 800 },
        body1: { fontSize: '0.8rem' },
        body2: { fontSize: '0.72rem' },
        caption: { fontSize: '0.62rem' },
        overline: { fontFamily: CINZEL, fontSize: '0.56rem', lineHeight: 1.6, fontWeight: 800 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          height: 19,
          borderRadius: '3px',
          fontFamily: CINZEL,
          fontSize: '0.54rem',
          letterSpacing: '0.04em',
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
