import { createElement } from 'react';
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
import { focusRingSx } from '../shared/ui/interactive.js';
import { INK_EDGE, inkShadow } from '../shared/ui/shadows.js';
import { DIALOG_MOTION, DURATIONS } from '../shared/ui/motion.js';
import {
  BOOKMARK_MARK, BOOKMARK_TAB, SEAL_RADIUS, SLIDER_THUMB, SWITCH,
} from '../shared/ui/shapes.js';
import { CheckMark, SealMark } from '../shared/ui/ChoiceMarks.jsx';
import { RARITY_COLORS } from '../shared/character/inventory/itemRarity.js';

// A chosen row, on `base`: the surface it lies on (the paper of a list, the
// raised surface of a menu). The accent is a wash over that base, not in
// place of it (surfaces.js tintedSurfaceSx), and under the cursor the same
// wash a step stronger; on its left edge the gold bookmark (BOOKMARK_MARK)
// that marks the open tab and the menu item under the pointer, one sign for
// "this one". `markOnHover` shows the bookmark under the pointer too (a
// menu's items). CSS names: the theme's overrides do not read `bgcolor`.
function selectedRowSx(base, { markOnHover = false } = {}) {
  const mark = { width: BOOKMARK_MARK.width };
  return {
    position: 'relative',
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: BOOKMARK_MARK.inset,
      bottom: BOOKMARK_MARK.inset,
      width: 0,
      borderRadius: BOOKMARK_MARK.radius,
      backgroundColor: UI_COLORS.accent,
      transition: `width ${DURATIONS.fast}ms ease`,
    },
    ...(markOnHover ? { '&:hover::before, &.Mui-focusVisible::before': mark } : null),
    '&.Mui-selected': {
      color: UI_COLORS.textPrimary,
      backgroundColor: base,
      backgroundImage: washImage(UI_COLORS.accent, OPACITY.shade),
    },
    '&.Mui-selected::before': mark,
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
        // Every scrollbar of the app drawn in its own ink: a gold thumb edged
        // in ink on a sunken track, not the system's grey. The colours are
        // inherited from the root (the standard properties, Chrome and
        // Firefox); the thin width is set on every scroller; WebKit (Safari)
        // takes its own pseudo-elements.
        // Selected text in gold with the ink on it, and the caret of every
        // field in gold, instead of the system's blue.
        html: { scrollbarColor: `${UI_COLORS.accent} ${UI_COLORS.surfaceSunken}`, caretColor: UI_COLORS.accent },
        '::selection': { backgroundColor: UI_COLORS.accent, color: UI_COLORS.edge },
        '*': { scrollbarWidth: 'thin' },
        '*::-webkit-scrollbar': { width: 12, height: 12 },
        '*::-webkit-scrollbar-track, *::-webkit-scrollbar-corner': { backgroundColor: UI_COLORS.surfaceSunken },
        '*::-webkit-scrollbar-thumb': { backgroundColor: UI_COLORS.accent, border: INK_EDGE, borderRadius: 8 },
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
    // Every button, link and control MUI draws takes the app's keyboard focus
    // (focusRingSx: the gold ring).
    MuiButtonBase: {
      styleOverrides: { root: focusRingSx() },
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
    // A menu item lies on the floating surface of its menu (SURFACES.floating);
    // the one under the pointer shows the bookmark too.
    MuiMenuItem: {
      styleOverrides: {
        root: selectedRowSx(UI_COLORS.surfaceRaised, { markOnHover: true }),
      },
    },
    // Every checkbox and radio drawn in ink (ChoiceMarks): a box, or a seal,
    // gold once chosen.
    MuiCheckbox: {
      defaultProps: {
        icon: createElement(CheckMark),
        checkedIcon: createElement(CheckMark, { checked: true }),
        disableRipple: true,
      },
    },
    MuiRadio: {
      defaultProps: {
        icon: createElement(SealMark),
        checkedIcon: createElement(SealMark, { checked: true }),
        disableRipple: true,
      },
    },
    // A link in the text: an underline drawn in gold, thick and set off from
    // the letters, thicker under the pointer.
    MuiLink: {
      styleOverrides: {
        root: {
          color: UI_COLORS.accentText,
          textDecorationColor: UI_COLORS.accent,
          textDecorationThickness: 2,
          textUnderlineOffset: 3,
          '&:hover': { color: UI_COLORS.accent, textDecorationThickness: 3 },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        notchedOutline: { borderColor: UI_COLORS.edge, borderWidth: 2 },
        root: {
          backgroundColor: UI_COLORS.surfaceHeader,
          transition: `box-shadow ${DURATIONS.fast}ms ease`,
          '&:hover:not(.Mui-focused):not(.Mui-disabled):not(.Mui-error) .MuiOutlinedInput-notchedOutline': {
            borderColor: UI_COLORS.textSecondary,
          },
          // The field being written in: edged in gold with its solid shadow,
          // so where the caret is reads at a glance.
          '&.Mui-focused:not(.Mui-error)': { boxShadow: inkShadow(UI_COLORS.edge, 3) },
          '&.Mui-focused:not(.Mui-error) .MuiOutlinedInput-notchedOutline': { borderColor: UI_COLORS.accent, borderWidth: 2 },
          // An example of what to write is quieter than what is written.
          '& input::placeholder, & textarea::placeholder': { fontStyle: TEXT_STYLES.note.fontStyle },
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
    // Every tab bar is a notebook's bookmarks (BOOKMARK_TAB, shapes.js): each
    // tab a raised tab edged in ink, standing on the bar's ruled line; the
    // open one taller, in gold, instead of an underline.
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 0,
          borderBottom: INK_EDGE,
        },
        flexContainer: {
          gap: BOOKMARK_TAB.gap,
          alignItems: 'flex-end',
          paddingLeft: 4,
          paddingRight: 4,
        },
        indicator: { display: 'none' },
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
          padding: '6px 12px 7px',
          marginTop: BOOKMARK_TAB.rise,
          ...TEXT_STYLES.label,
          fontSize: CONTROL_FONT_SIZES.normal,
          lineHeight: LINE_HEIGHTS.tight,
          color: UI_COLORS.textSecondary,
          backgroundColor: UI_COLORS.surfaceRaised,
          border: INK_EDGE,
          borderBottom: 0,
          borderRadius: BOOKMARK_TAB.radius,
          transition: ['color', 'background-color', 'padding', 'margin'].map((name) => `${name} ${DURATIONS.fast}ms ease`).join(', '),
          '&:hover': { color: UI_COLORS.textPrimary },
          '&.Mui-selected': {
            color: UI_COLORS.onAccent,
            backgroundColor: UI_COLORS.accent,
            marginTop: 0,
            paddingTop: 6 + BOOKMARK_TAB.rise,
          },
        },
      },
    },
    // Every on/off switch (ToggleRow) drawn in ink (SWITCH, shapes.js): a
    // sunken track that turns gold when on, a thumb edged in ink with its
    // solid shadow, sliding over with a little spring. Both sizes alike.
    MuiSwitch: {
      styleOverrides: {
        root: {
          width: SWITCH.width,
          height: SWITCH.height,
          padding: 0,
          overflow: 'visible',
          '&.MuiSwitch-sizeSmall': { width: SWITCH.width, height: SWITCH.height, padding: 0 },
        },
        switchBase: {
          padding: SWITCH.inset,
          color: UI_COLORS.textSecondary,
          transition: `transform ${DURATIONS.slow}ms cubic-bezier(.3, 1.6, .5, 1)`,
          '.MuiSwitch-sizeSmall &': { padding: SWITCH.inset },
          '&.Mui-checked': {
            transform: `translateX(${SWITCH.width - SWITCH.thumb - SWITCH.inset * 2}px)`,
            color: UI_COLORS.accentHighlight,
            '& + .MuiSwitch-track': { backgroundColor: UI_COLORS.accent, opacity: 1 },
          },
          '&.Mui-disabled + .MuiSwitch-track': { opacity: OPACITY.edge },
        },
        thumb: {
          width: SWITCH.thumb,
          height: SWITCH.thumb,
          boxSizing: 'border-box',
          border: INK_EDGE,
          boxShadow: inkShadow(UI_COLORS.edge, 2),
          '.MuiSwitch-sizeSmall &': { width: SWITCH.thumb, height: SWITCH.thumb },
        },
        track: {
          boxSizing: 'border-box',
          borderRadius: SWITCH.height / 2,
          border: INK_EDGE,
          backgroundColor: UI_COLORS.surfaceSunken,
          opacity: 1,
        },
      },
    },
    // Every slider (LabeledSlider): an ink track filled in gold, its thumb a
    // wax seal (SLIDER_THUMB, SEAL_RADIUS) with its solid shadow.
    MuiSlider: {
      styleOverrides: {
        root: { color: UI_COLORS.accent },
        rail: { backgroundColor: UI_COLORS.surfaceSunken, opacity: 1, border: INK_EDGE, boxSizing: 'content-box' },
        track: { border: INK_EDGE, boxSizing: 'content-box' },
        thumb: {
          width: SLIDER_THUMB.size,
          height: SLIDER_THUMB.size,
          borderRadius: SEAL_RADIUS,
          backgroundColor: UI_COLORS.accent,
          border: INK_EDGE,
          boxShadow: inkShadow(UI_COLORS.edge, 2),
          '&:hover, &.Mui-focusVisible, &.Mui-active': {
            boxShadow: `${inkShadow(UI_COLORS.edge, 2)}, 0 0 0 6px ${uiAlpha(UI_COLORS.accent, OPACITY.fill)}`,
          },
          '&::before': { boxShadow: 'none' },
        },
      },
    },
    // A dialog pops open, a little past its size and back, as a toast lands.
    MuiDialog: {
      styleOverrides: {
        paper: {
          animation: `gbDialogPop ${DIALOG_MOTION.pop}ms cubic-bezier(.3, 1.6, .5, 1)`,
          '@keyframes gbDialogPop': {
            '0%': { transform: 'scale(0.86)' },
            '100%': { transform: 'scale(1)' },
          },
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
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
