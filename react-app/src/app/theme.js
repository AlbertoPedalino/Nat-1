import { createTheme, lighten } from '@mui/material';
import { UI_FONTS, FONT_SIZES, FONT_WEIGHTS, LINE_HEIGHTS } from '../shared/ui/fonts.js';
import { activePortalContainer } from '../shared/ui/portalContainer.js';

import { chipTintStyle } from '../shared/ui/entityColors.js';
import { VTT_COLORS, vttAlpha } from '../shared/vtt/colors.js';
import { UI_COLORS, uiAlpha, OPACITY } from '../shared/ui/colors.js';
import { UI_SHADOWS } from '../shared/ui/shadows.js';
import { TEXT_STYLES } from '../shared/ui/textStyles.js';
import { CONTROL_HEIGHTS } from '../shared/ui/controlHeights.js';
import { PRESSABLE_EDGE_SX } from '../shared/ui/pressable.js';

const SELECTED_OPTION_SX = {
  color: UI_COLORS.accentText,
  backgroundColor: uiAlpha(UI_COLORS.accent, OPACITY.fill),
  borderColor: uiAlpha(UI_COLORS.accent, OPACITY.strong),
};
const SELECTED_ROW_SX = {
  color: UI_COLORS.textPrimary,
  backgroundColor: uiAlpha(UI_COLORS.accent, OPACITY.shade),
  boxShadow: `inset 3px 0 0 ${UI_COLORS.accent}`,
};

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
    divider: uiAlpha(UI_COLORS.textSecondary, OPACITY.shade),
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
      panelOverlay: uiAlpha(UI_COLORS.black, OPACITY.shade),
      headerOverlay: uiAlpha(UI_COLORS.black, OPACITY.line),
      rowDivider: uiAlpha(UI_COLORS.accentMuted, OPACITY.tint),
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
        accentBorder: vttAlpha(VTT_COLORS.accent, OPACITY.shade),
        accentBorderStrong: vttAlpha(VTT_COLORS.accent, OPACITY.edge),
        accentTint: vttAlpha(VTT_COLORS.accent, OPACITY.fill),
        accentWash: vttAlpha(VTT_COLORS.accent, OPACITY.soft),
        surface: vttAlpha(VTT_COLORS.surface, OPACITY.solid),
        surfaceSolid: VTT_COLORS.surface,
        backdrop: vttAlpha(VTT_COLORS.black, OPACITY.strong),
        inset: vttAlpha(VTT_COLORS.black, OPACITY.line),
        success: VTT_COLORS.success,
        danger: VTT_COLORS.danger,
      },
    },
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: UI_FONTS.body,
    // Headings are titles: the display face, as TEXT_STYLES.title.
    h1: {
      ...TEXT_STYLES.title,
      fontSize: FONT_SIZES.hero,
    },
    h2: {
      ...TEXT_STYLES.title,
      fontSize: FONT_SIZES.title,
    },
    button: {
      textTransform: 'none',
      letterSpacing: 0,
      fontWeight: FONT_WEIGHTS.bold,
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
    // Controls. Their look is set here, once: a page's sx only places and
    // sizes them. `size="small"` is the dense default of the sheet and tools.
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        sizeSmall: { fontSize: FONT_SIZES.xl },
        sizeMedium: { fontSize: FONT_SIZES.xxl },
        sizeLarge: { fontSize: FONT_SIZES.body },
        // An outlined button is the raised button too, on the raised surface:
        // the ink edge and the press, its text in its colour.
        outlined: {
          ...PRESSABLE_EDGE_SX,
          backgroundColor: UI_COLORS.surfaceRaised,
          '&:hover': { ...PRESSABLE_EDGE_SX['&:hover'], borderColor: UI_COLORS.edge, backgroundColor: lighten(UI_COLORS.surfaceRaised, 0.06) },
        },
        // A filled button is drawn and raised (shared/ui/pressable.js).
        contained: PRESSABLE_EDGE_SX,
      },
    },
    // A group of buttons is one raised button: the group carries the shadow
    // and the press, its halves stay flat inside it (Roll | Log, the rests).
    MuiButtonGroup: {
      styleOverrides: {
        root: ({ ownerState }) => (ownerState.variant === 'text' ? {} : { boxShadow: UI_SHADOWS.press }),
        grouped: {
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
          '&:active': { transform: 'none', boxShadow: 'none' },
        },
      },
    },
    // A chosen option (toggle buttons, segmented choices): an accent wash
    // with accent text and edge.
    MuiToggleButton: {
      styleOverrides: {
        root: {
          color: UI_COLORS.textSecondary,
          border: `2px solid ${UI_COLORS.edge}`,
          '&.Mui-selected': SELECTED_OPTION_SX,
          '&.Mui-selected:hover': { backgroundColor: uiAlpha(UI_COLORS.accent, OPACITY.shade) },
        },
      },
    },
    // A chosen row (lists, menus): an accent wash with a bar on its left edge.
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': SELECTED_ROW_SX,
          '&.Mui-selected:hover': { backgroundColor: uiAlpha(UI_COLORS.accent, OPACITY.line) },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          '&.Mui-selected': SELECTED_ROW_SX,
          '&.Mui-selected:hover': { backgroundColor: uiAlpha(UI_COLORS.accent, OPACITY.line) },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        notchedOutline: { borderColor: UI_COLORS.edge, borderWidth: 2 },
        root: {
          backgroundColor: UI_COLORS.surfaceHeader,
          '&:hover:not(.Mui-focused):not(.Mui-disabled):not(.Mui-error) .MuiOutlinedInput-notchedOutline': {
            borderColor: UI_COLORS.textSecondary,
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: UI_COLORS.surfaceRaised,
          color: UI_COLORS.textPrimary,
          border: `2px solid ${UI_COLORS.edge}`,
          boxShadow: UI_SHADOWS.float,
          fontSize: FONT_SIZES.sm,
        },
        arrow: { color: UI_COLORS.surfaceRaised },
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
          ...TEXT_STYLES.title,
          fontSize: FONT_SIZES.xs,
          lineHeight: LINE_HEIGHTS.tight,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: `2px solid ${UI_COLORS.edge}`,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        sizeSmall: { height: CONTROL_HEIGHTS.sm },
        root: {
          maxWidth: '100%',
          minWidth: 0,
          flexShrink: 1,
          fontWeight: FONT_WEIGHTS.bold,
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
        colorDefault: chipTintStyle(UI_COLORS.textPrimary, { bgAlpha: OPACITY.soft, borderAlpha: OPACITY.line }),
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
        // An outlined surface is drawn with the ink edge, as SURFACES.panel.
        outlined: {
          border: `2px solid ${UI_COLORS.edge}`,
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
