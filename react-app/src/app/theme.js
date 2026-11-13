import { createTheme, lighten } from '@mui/material';
import { UI_FONTS, FONT_SIZES, FONT_WEIGHTS, LINE_HEIGHTS, CONTROL_FONT_SIZES } from '../shared/ui/fonts.js';
import { activePortalContainer } from '../shared/ui/portalContainer.js';

import { chipTintStyle } from '../shared/ui/entityColors.js';
import { VTT_COLORS, vttAlpha } from '../shared/vtt/colors.js';
import { UI_COLORS, uiAlpha, OPACITY } from '../shared/ui/colors.js';
import { TEXT_STYLES } from '../shared/ui/textStyles.js';
import { CONTROL_HEIGHTS } from '../shared/ui/controlHeights.js';
import { KEY_BAR_SX, PRESSABLE_EDGE_SX, iconButtonLook, pressableSx } from '../shared/ui/pressable.js';
import { SURFACES, washImage } from '../shared/ui/surfaces.js';
import { RARITY_COLORS } from '../shared/character/inventory/itemRarity.js';

// A chosen row, on `base`: the surface it lies on (the paper of a list, the
// raised surface of a menu). The accent is a wash over that base, not in
// place of it (surfaces.js tintedSurfaceSx), and under the cursor the same
// wash a step stronger. CSS names: the theme's overrides do not read `bgcolor`.
function selectedRowSx(base) {
  return {
    '&.Mui-selected': {
      color: UI_COLORS.textPrimary,
      backgroundColor: base,
      backgroundImage: washImage(UI_COLORS.accent, OPACITY.shade),
      boxShadow: `inset 3px 0 0 ${UI_COLORS.accent}`,
    },
    '&.Mui-selected:hover': {
      backgroundColor: base,
      backgroundImage: washImage(UI_COLORS.accent, OPACITY.line),
    },
  };
}

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
      // Item rarity's tiers (shared/character/inventory/itemRarity.js).
      rarity: RARITY_COLORS,
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
        surface: VTT_COLORS.surface,
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
    // Headings are lettered like a panel's title: TEXT_STYLES.heading.
    h1: {
      ...TEXT_STYLES.heading,
      fontSize: FONT_SIZES.hero,
    },
    h2: {
      ...TEXT_STYLES.heading,
      fontSize: FONT_SIZES.title,
    },
    // Everything clicked (buttons, toggle keys, tabs, clickable chips) is
    // lettered one way: the display face's spaced capitals (TEXT_STYLES.label).
    // A line of description inside a button takes BUTTON_DESCRIPTION_SX
    // (shared/ui/actionButton.js); its name stays in these capitals.
    button: {
      ...TEXT_STYLES.label,
    },
  },
  components: {
    // The page's halftone behind every route (SURFACES.page).
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          // The rulebook face's figures stand on the line (it draws old-style
          // ones by default), and line up in columns.
          fontVariantNumeric: 'lining-nums tabular-nums',
          // Alegreya, the face of the interface's text, draws its lower case
          // short (x-height 0.46 of the size): everything inherits it raised
          // to 0.52, a little larger than the sans it replaced. The roles in
          // other faces set their own (TEXT_STYLES), so only Alegreya grows.
          fontSizeAdjust: 'ex-height 0.52',
          backgroundColor: UI_COLORS.page,
          backgroundImage: SURFACES.page.backgroundImage,
          backgroundSize: SURFACES.page.backgroundSize,
        },
      },
    },
    MuiModal: {
      defaultProps: { container: activePortalContainer },
    },
    // Everything that floats for a moment — a menu (the roll-with menu of a
    // held roller among them), a select's list, a popover, an autocomplete
    // list, a tooltip — is the one floating surface (SURFACES.floating).
    MuiPopover: {
      defaultProps: { container: activePortalContainer },
      styleOverrides: { paper: SURFACES.floating },
    },
    MuiAutocomplete: {
      styleOverrides: { paper: SURFACES.floating },
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
        // A control's label has two sizes: CONTROL_FONT_SIZES.normal on every
        // button, tab and key, .small on a row of filters or tags.
        sizeSmall: { fontSize: CONTROL_FONT_SIZES.normal },
        sizeMedium: { fontSize: CONTROL_FONT_SIZES.normal },
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
        root: ({ ownerState }) => (ownerState.variant === 'text' ? {} : KEY_BAR_SX),
        grouped: {
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none', transform: 'none' },
          '&:active': { transform: 'none', boxShadow: 'none' },
        },
      },
    },
    // A chosen option (toggle buttons, segmented choices): an accent wash
    // with accent text and edge.
    // A group of toggle buttons is one raised bar of keys (as the Rest
    // group): the bar casts the solid shadow, each key is on the raised
    // surface, the chosen one filled in its colour (as toggleSx).
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: KEY_BAR_SX,
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          color: UI_COLORS.textSecondary,
          border: `2px solid ${UI_COLORS.edge}`,
          backgroundColor: UI_COLORS.surfaceRaised,
          '&:hover': { backgroundColor: lighten(UI_COLORS.surfaceRaised, 0.08) },
          '&.Mui-selected': { backgroundColor: UI_COLORS.accent, color: UI_COLORS.onAccent },
          '&.Mui-selected:hover': { backgroundColor: lighten(UI_COLORS.accent, 0.12) },
        },
      },
      variants: [
        { props: { color: 'error' }, style: { '&.Mui-selected, &.Mui-selected:hover': { backgroundColor: UI_COLORS.danger, color: UI_COLORS.edge } } },
        { props: { color: 'success' }, style: { '&.Mui-selected, &.Mui-selected:hover': { backgroundColor: UI_COLORS.success, color: UI_COLORS.edge } } },
        { props: { color: 'warning' }, style: { '&.Mui-selected, &.Mui-selected:hover': { backgroundColor: UI_COLORS.warning, color: UI_COLORS.edge } } },
      ],
    },
    // Every icon button stands raised (iconButtonLook): pressed, like every
    // button. A remove keeps its red, a primary one its accent; one that is
    // part of something else lies flat by its own sx (pressable.js).
    MuiIconButton: {
      styleOverrides: {
        root: ({ theme }) => ({ ...iconButtonLook(theme.shape.borderRadius), padding: theme.spacing(0.5) }),
      },
      variants: [
        { props: { color: 'error' }, style: { color: UI_COLORS.danger, '&:hover': { color: UI_COLORS.danger } } },
        { props: { color: 'primary' }, style: { color: UI_COLORS.accentText, '&:hover': { color: UI_COLORS.accent } } },
      ],
    },
    // A chosen row (lists, menus): an accent wash with a bar on its left edge.
    MuiListItemButton: {
      styleOverrides: {
        root: selectedRowSx(UI_COLORS.surface),
      },
    },
    // A menu item lies on the floating surface of its menu (SURFACES.floating).
    MuiMenuItem: {
      styleOverrides: {
        root: selectedRowSx(UI_COLORS.surfaceRaised),
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
          ...SURFACES.floating,
          color: UI_COLORS.textPrimary,
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
          ...TEXT_STYLES.label,
          fontSize: CONTROL_FONT_SIZES.normal,
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
      // A chip that can be clicked (a level, a filter, a toggle) is the
      // raised, drawn button: at rest on the raised surface, picked filled in
      // its colour (shared/ui/pressable.js). A chip that is only a tag stays
      // the flat tint below. As variants these weigh what the chip's base
      // style does, so a chip's own sx (a toggled condition's colour) wins.
      variants: [
        { props: ({ ownerState }) => ownerState.clickable, style: { ...pressableSx(UI_COLORS.surfaceRaised), ...TEXT_STYLES.label } },
        { props: ({ ownerState }) => ownerState.clickable && ownerState.color === 'primary', style: pressableSx(UI_COLORS.accent) },
        { props: ({ ownerState }) => ownerState.clickable && ownerState.color === 'secondary', style: pressableSx(UI_COLORS.secondary) },
      ],
      styleOverrides: {
        sizeSmall: { height: CONTROL_HEIGHTS.sm },
        root: {
          maxWidth: '100%',
          minWidth: 0,
          flexShrink: 1,
          fontWeight: FONT_WEIGHTS.bold,
          border: '1px solid transparent',
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
