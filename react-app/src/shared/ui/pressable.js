import { getContrastRatio, lighten } from '@mui/material';
import { UI_COLORS, OPACITY } from './colors.js';
import { INK_EDGE, UI_SHADOWS } from './shadows.js';
import { DURATIONS } from './motion.js';
import { LINE_HEIGHTS } from './fonts.js';

// The drawn, raised button: an ink edge, a solid shadow under it, pushed down
// while pressed. The one recipe for every filled button: the theme's
// contained buttons take the edge (PRESSABLE_EDGE_SX) over their own colour,
// and a button of any colour (a roll on a card) takes pressableSx(fill).
// It hops up a little under the cursor and squashes when pressed.
// How anything pressed moves: a hop under the cursor, a squash while
// pressed (none for reduced motion). The raised button below takes it with
// its shadows; a pressed panel (a stat tile) takes it alone.
export const PRESS_MOTION_SX = Object.freeze({
  transition: `transform ${DURATIONS.fast}ms ease, box-shadow ${DURATIONS.fast}ms ease, background-color ${DURATIONS.fast}ms ease, border-color ${DURATIONS.fast}ms ease`,
  '&:hover': { transform: 'translateY(-1px)' },
  '&:active': { transform: 'translateY(1px) scale(0.97)' },
  '@media (prefers-reduced-motion: reduce)': { '&:hover': { transform: 'none' }, '&:active': { transform: 'none' } },
});

// A bar of keys pressed one at a time (a button group as the Rest one, a
// toggle group, the dice pill): the bar is raised as one button, its keys
// lie in it.
export const KEY_BAR_SX = Object.freeze({ boxShadow: UI_SHADOWS.press });

export const PRESSABLE_EDGE_SX = Object.freeze({
  ...PRESS_MOTION_SX,
  border: INK_EDGE,
  boxShadow: UI_SHADOWS.press,
  '&:hover': { ...PRESS_MOTION_SX['&:hover'], boxShadow: UI_SHADOWS.lifted },
  '&:active': { ...PRESS_MOTION_SX['&:active'], boxShadow: UI_SHADOWS.pressed },
});

// The ink that reads best on `fill`: the edge colour on a light fill, the
// primary text on a dark one.
export function inkOn(fill) {
  return getContrastRatio(fill, UI_COLORS.edge) >= getContrastRatio(fill, UI_COLORS.textPrimary)
    ? UI_COLORS.edge
    : UI_COLORS.textPrimary;
}

// A button that cannot be pressed now (a core book always in use, an action
// not available yet): it keeps its fill and its ink, so it reads as before,
// lies flat — no shadow, nothing to press — and is quieter. MUI's own
// disabled grey would write its label in a pale grey over the fill (white on
// gold). The one disabled look of every raised button and icon button.
export const UNPRESSABLE_SX = Object.freeze({ boxShadow: 'none', opacity: OPACITY.strong });

// A raised button filled with `fill`, its label in the ink that reads on it.
export function pressableSx(fill) {
  const ink = inkOn(fill);
  return {
    ...PRESSABLE_EDGE_SX,
    color: ink,
    // Plain CSS names, so the recipe also works in the theme's overrides
    // (where the sx shorthand `bgcolor` is not read).
    backgroundColor: fill,
    '&:hover': { ...PRESSABLE_EDGE_SX['&:hover'], backgroundColor: lighten(fill, 0.12) },
    '&.Mui-disabled': { ...UNPRESSABLE_SX, color: ink },
  };
}

// Every icon button (rename, delete, close, a stepper's −/+): the raised,
// drawn button on the raised surface, its icon quiet until the cursor lights
// it in the accent. Raised because it is pressed, like every button. The
// theme gives it to every IconButton (`radius` in px there; a multiple of the
// theme radius in sx), so a screen never draws its own; a remove (`danger`,
// TipIconButton's) keeps its red. In plain CSS names, so it works in both.
//
// A surface of its own (the battle map's glass: mapIconButtonSx) is passed as
// `surface`, its icon colour as `tone` (kept under the cursor too), and
// `solidHover` keeps that surface under the cursor rather than lightening it,
// where a lighter wash would show the board through.
export function iconButtonLook(radius = 1, { surface = UI_COLORS.surfaceRaised, tone = null, solidHover = false } = {}) {
  return {
    ...PRESSABLE_EDGE_SX,
    borderRadius: radius,
    backgroundColor: surface,
    color: tone || UI_COLORS.textSecondary,
    '&:hover': {
      ...PRESSABLE_EDGE_SX['&:hover'],
      backgroundColor: solidHover ? surface : lighten(surface, 0.08),
      color: tone || UI_COLORS.accent,
    },
    '&.Mui-disabled': { ...UNPRESSABLE_SX, color: tone || UI_COLORS.textSecondary },
  };
}

// An icon button that is part of something else, not a button of its own:
// the clear X inside a search field, the 5etools link beside a name, a key
// inside a raised bar (the dice pill), a drag or resize grip. Flat: what it
// sits in is the thing pressed. The only icon buttons without the raised look.
export const PART_ICON_BUTTON_SX = Object.freeze({
  border: 'none',
  boxShadow: 'none',
  backgroundColor: 'transparent',
  '&:hover': { boxShadow: 'none', transform: 'none', backgroundColor: 'transparent' },
  '&:active': { boxShadow: 'none', transform: 'none' },
});

// The small square button of a −/+ stepper (hit points, XP, a quantity): the
// icon button sized to `size`, its icon in `tone`, red under the cursor when
// `danger`. Every stepper in the app takes it.
export function stepButtonSx(size = 20, { tone = null, danger = false } = {}) {
  const look = iconButtonLook(1);
  return {
    ...look,
    width: size,
    height: size,
    minWidth: 0,
    p: 0,
    flex: '0 0 auto',
    color: tone || 'text.secondary',
    '&:hover': {
      ...look['&:hover'],
      color: danger ? UI_COLORS.danger : (tone || UI_COLORS.accent),
    },
  };
}

// A row you roll by clicking it (a saving throw, a skill): a button, raised
// like every button — the ink edge on the raised surface, the solid shadow
// under it — that hops under the cursor and squashes when pressed.
export const ROLL_ROW_SX = Object.freeze({
  ...pressableSx(UI_COLORS.surfaceRaised),
  color: 'inherit',
  borderRadius: 1,
  cursor: 'pointer',
});

// The modifier on such a row: plain figures in a fixed-width cell, so a column
// of them lines up; a mark on its corner (advantage) is laid over it.
export const ROLL_FIGURE_SX = Object.freeze({
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 30,
  flexShrink: 0,
  lineHeight: LINE_HEIGHTS.normal,
});

export const ROLL_FIGURE_MARK_STYLE = Object.freeze({ position: 'absolute', top: -5, right: -6 });

// A toggle (an item's Equip, Stash, Attune or hand, a notes page): the
// raised, drawn button, filled in its tone while on, on the raised surface
// while off — as a clickable chip is in the theme.
export function toggleSx(active, tone = UI_COLORS.accent) {
  return pressableSx(active ? tone : UI_COLORS.surfaceRaised);
}
