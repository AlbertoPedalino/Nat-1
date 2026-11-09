import { createTheme } from '@mui/material';
import { theme } from '../../../app/theme.js';
import { UI_COLORS, uiAlpha, OPACITY } from '../../../shared/ui/colors.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';

// The character builder's denser look: the page root's descendant defaults and
// the theme the builder renders under (CharBuilder's ThemeProvider).
export const builderRootSx = {
  minHeight: '100vh',
  bgcolor: 'background.default',
  '& .MuiPaper-root, & .MuiCard-root': {
    bgcolor: UI_COLORS.surfaceHeader,
    backgroundImage: 'none',
    borderColor: 'divider',
    borderRadius: 1,
  },
  // Builder component defaults live in `builderTheme` below. Theme overrides
  // keep specificity low so component `sx` can still set colors and sizing.
  '& .MuiButton-root': {
    minHeight: 0,
    borderRadius: 1,
    ...TEXT_STYLES.title,
    fontSize: FONT_SIZES.xs,
    px: 1,
    py: 0.5,
  },
  '& .MuiTab-root': {
    minHeight: 0,
    py: 0.75,
    px: 1,
    ...TEXT_STYLES.title,
    fontSize: FONT_SIZES.xs,
    color: 'text.secondary',
  },
  '& .MuiTabs-indicator': { bgcolor: 'primary.main' },
  '& .MuiInputBase-root': {
    bgcolor: UI_COLORS.surfaceDeep,
    borderRadius: 1,
    fontSize: FONT_SIZES.md,
  },
  '& .MuiInputBase-input': {
    py: 1,
    fontSize: FONT_SIZES.md,
  },
  '& .MuiAlert-root': {
    py: 0.25,
    px: 1,
    fontSize: FONT_SIZES.md,
    bgcolor: UI_COLORS.surfaceHeader,
    border: `1px solid ${uiAlpha(UI_COLORS.accent, OPACITY.fill)}`,
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
export const builderTheme = createTheme(theme, {
  components: {
    MuiTypography: {
      styleOverrides: {
        h1: { ...TEXT_STYLES.figure, fontSize: FONT_SIZES.lead, lineHeight: 1.15 },
        h2: { ...TEXT_STYLES.figure, fontSize: FONT_SIZES.xl, lineHeight: 1.2 },
        body1: { fontSize: FONT_SIZES.xl },
        body2: { fontSize: FONT_SIZES.md },
        caption: { fontSize: FONT_SIZES.xs },
        overline: { ...TEXT_STYLES.figure, fontSize: FONT_SIZES.xxs, lineHeight: 1.6 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          height: 19,
          borderRadius: 0.375,
          ...TEXT_STYLES.title,
          fontSize: FONT_SIZES.xxs,
          backgroundColor: uiAlpha(UI_COLORS.accent, OPACITY.soft),
          borderColor: uiAlpha(UI_COLORS.accent, OPACITY.line),
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          padding: '4.4px 7.2px',
          backgroundColor: UI_COLORS.surfaceHeader,
          '&:hover:not(.Mui-selected)': {
            backgroundColor: UI_COLORS.surfaceRaised,
          },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          color: UI_COLORS.textSecondary,
        },
      },
    },
  },
});
