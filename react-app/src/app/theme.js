import { createTheme, lighten } from '@mui/material';
import { UI_FONTS, FONT_SIZES } from '../shared/ui/fonts.js';
import { activePortalContainer } from '../shared/ui/portalContainer.js';

import { chipTintStyle } from '../shared/ui/entityColors.js';
import { VTT_COLORS, vttAlpha } from '../shared/vtt/colors.js';
import { UI_COLORS, uiAlpha } from '../shared/ui/colors.js';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: UI_COLORS.page,
      paper: UI_COLORS.surface,
    },
    primary: {
      main: UI_COLORS.accent,
      contrastText: UI_COLORS.onAccent,
    },
    secondary: {
      main: UI_COLORS.secondary,
    },
    error: {
      main: UI_COLORS.danger,
    },
    warning: {
      main: UI_COLORS.warning,
    },
    success: {
      main: UI_COLORS.success,
    },
    info: {
      main: UI_COLORS.info,
    },
    text: {
      primary: UI_COLORS.textPrimary,
      secondary: UI_COLORS.textSecondary,
    },
    divider: uiAlpha(UI_COLORS.accent, 0.22),
    // Default token color for player-character combatants without a custom color.
    pcToken: UI_COLORS.pcToken,
    // GM Board semantic tokens, read in sx as 'gmboard.<group>.<key>'. Status
    // groups (difficulty, results, weather, badges, overlays) are interface
    // roles from UI_COLORS; treasure tiers and item rarity keep their own
    // conventional colours, which are game data rather than interface style.
    gmboard: {
      tier: {
        1: { border: '#c04040', color: '#ff8080', dim: '#8b3030' },
        2: { border: '#c07030', color: '#ffb060', dim: '#7a5530' },
        3: { border: '#b0a030', color: '#ffe060', dim: '#7a7030' },
        4: { border: '#40a0a0', color: '#a0ffff', dim: '#507878' },
      },
      difficulty: {
        High: UI_COLORS.danger,
        Moderate: UI_COLORS.warning,
        Low: UI_COLORS.success,
      },
      rarity: {
        Legendary: '#e8a030',
        'Very Rare': '#a070d0',
        Rare: '#4080c0',
        Uncommon: '#50a850',
        Common: '#7a6040',
        '—': '#7a6040',
      },
      // Origin badges in the instance picker (cloud vs local-only sheets).
      badge: {
        cloud: UI_COLORS.infoText,
      },
      panelOverlay: uiAlpha(UI_COLORS.black, 0.2),
      headerOverlay: uiAlpha(UI_COLORS.black, 0.3),
      rowDivider: uiAlpha(UI_COLORS.accentMuted, 0.12),
      weather: {
        Clear: UI_COLORS.accent,
        Rain: UI_COLORS.info,
        Snow: UI_COLORS.secondaryText,
      },
      result: {
        encounter: UI_COLORS.danger,
        loot: UI_COLORS.accent,
        camp: UI_COLORS.success,
        environment: UI_COLORS.warning,
        trap: UI_COLORS.dangerDeep,
        none: UI_COLORS.textFaint,
        trigger: UI_COLORS.accent,
        safe: UI_COLORS.success,
      },
      // Battle-map chrome. Canvas drawing colours stay next to the rendering
      // code because they are pixels, while reusable surfaces and status
      // colours belong here so every VTT control changes as one theme.
      vtt: {
        accent: VTT_COLORS.accent,
        accentHighlight: VTT_COLORS.accentHighlight,
        accentBorder: vttAlpha(VTT_COLORS.accent, 0.25),
        accentBorderStrong: vttAlpha(VTT_COLORS.accent, 0.42),
        accentTint: vttAlpha(VTT_COLORS.accent, 0.16),
        accentWash: vttAlpha(VTT_COLORS.accent, 0.08),
        surface: vttAlpha(VTT_COLORS.surface, 0.9),
        surfaceSolid: VTT_COLORS.surface,
        backdrop: vttAlpha(VTT_COLORS.black, 0.62),
        inset: vttAlpha(VTT_COLORS.black, 0.3),
        success: VTT_COLORS.success,
        danger: VTT_COLORS.danger,
      },
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: UI_FONTS.body,
    h1: {
      fontSize: FONT_SIZES.hero,
      fontWeight: 700,
      letterSpacing: 0,
    },
    h2: {
      fontSize: FONT_SIZES.title,
      fontWeight: 700,
      letterSpacing: 0,
    },
    button: {
      textTransform: 'none',
      letterSpacing: 0,
      fontWeight: 700,
    },
  },
  components: {
    MuiModal: {
      defaultProps: { container: activePortalContainer },
    },
    MuiPopover: {
      defaultProps: { container: activePortalContainer },
    },
    MuiPopper: {
      defaultProps: { container: activePortalContainer },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 0,
        },
        scrollButtons: {
          width: 28,
          minHeight: 0,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 0,
          minWidth: 0,
          padding: '6px 10px',
          fontSize: FONT_SIZES.xs,
          lineHeight: 1.2,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: `1px solid ${uiAlpha(UI_COLORS.accent, 0.18)}`,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          maxWidth: '100%',
          minWidth: 0,
          flexShrink: 1,
          fontWeight: 700,
          border: '1px solid transparent',
          // Clickable colored chips act as toggles: selected state gets a
          // solid fill so it stands apart from the tinted resting style.
          '&.MuiChip-clickable.MuiChip-colorPrimary': {
            backgroundColor: UI_COLORS.accent,
            borderColor: UI_COLORS.accent,
            color: UI_COLORS.onAccent,
            '&:hover': { backgroundColor: lighten(UI_COLORS.accent, 0.18) },
          },
          '&.MuiChip-clickable.MuiChip-colorSecondary': {
            backgroundColor: UI_COLORS.secondary,
            borderColor: UI_COLORS.secondary,
            color: UI_COLORS.onSecondary,
            '&:hover': { backgroundColor: lighten(UI_COLORS.secondary, 0.18) },
          },
        },
        label: {
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
        },
        colorDefault: chipTintStyle(UI_COLORS.textPrimary, { bgAlpha: 0.10, borderAlpha: 0.32 }),
        colorPrimary: chipTintStyle(UI_COLORS.accent, { text: UI_COLORS.accentText }),
        colorSecondary: chipTintStyle(UI_COLORS.secondary, { text: UI_COLORS.secondaryText }),
        colorError: chipTintStyle(UI_COLORS.danger, { text: UI_COLORS.dangerText }),
        colorWarning: chipTintStyle(UI_COLORS.warning, { text: UI_COLORS.warningText }),
        colorSuccess: chipTintStyle(UI_COLORS.success, { text: UI_COLORS.successText }),
      },
    },
    MuiStack: {
      styleOverrides: {
        root: {
          minWidth: 0,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          minWidth: 0,
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          minWidth: 0,
        },
      },
    },
  },
});
