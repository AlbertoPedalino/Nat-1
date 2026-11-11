import { getContrastRatio, lighten } from '@mui/material';
import { UI_COLORS } from './colors.js';
import { INK_EDGE, UI_SHADOWS } from './shadows.js';
import { DURATIONS } from './motion.js';

// The drawn, raised button: an ink edge, a solid shadow under it, pushed down
// while pressed. The one recipe for every filled button: the theme's
// contained buttons take the edge (PRESSABLE_EDGE_SX) over their own colour,
// and a button of any colour (a roll on a card) takes pressableSx(fill).
// It hops up a little under the cursor and squashes when pressed.
export const PRESSABLE_EDGE_SX = Object.freeze({
  border: INK_EDGE,
  boxShadow: UI_SHADOWS.press,
  transition: `transform ${DURATIONS.fast}ms ease, box-shadow ${DURATIONS.fast}ms ease, background-color ${DURATIONS.fast}ms ease`,
  '&:hover': { boxShadow: UI_SHADOWS.lifted, transform: 'translateY(-1px)' },
  '&:active': { transform: 'translateY(1px) scale(0.97)', boxShadow: UI_SHADOWS.pressed },
  '@media (prefers-reduced-motion: reduce)': { '&:hover': { transform: 'none' }, '&:active': { transform: 'none' } },
});

// The ink that reads best on `fill`: the edge colour on a light fill, the
// primary text on a dark one.
export function inkOn(fill) {
  return getContrastRatio(fill, UI_COLORS.edge) >= getContrastRatio(fill, UI_COLORS.textPrimary)
    ? UI_COLORS.edge
    : UI_COLORS.textPrimary;
}

// A raised button filled with `fill`, its label in the ink that reads on it.
export function pressableSx(fill) {
  return {
    ...PRESSABLE_EDGE_SX,
    color: inkOn(fill),
    // Plain CSS names, so the recipe also works in the theme's overrides
    // (where the sx shorthand `bgcolor` is not read).
    backgroundColor: fill,
    '&:hover': { ...PRESSABLE_EDGE_SX['&:hover'], backgroundColor: lighten(fill, 0.12) },
  };
}
