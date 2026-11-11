import { getContrastRatio, lighten } from '@mui/material';
import { UI_COLORS } from './colors.js';
import { UI_SHADOWS } from './shadows.js';

// The drawn, raised button: an ink edge, a solid shadow under it, pushed down
// while pressed. The one recipe for every filled button: the theme's
// contained buttons take the edge (PRESSABLE_EDGE_SX) over their own colour,
// and a button of any colour (a roll on a card) takes pressableSx(fill).
export const PRESSABLE_EDGE_SX = Object.freeze({
  border: `2px solid ${UI_COLORS.edge}`,
  boxShadow: UI_SHADOWS.press,
  '&:hover': { boxShadow: UI_SHADOWS.press },
  '&:active': { transform: 'translateY(1px)', boxShadow: UI_SHADOWS.pressed },
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
    bgcolor: fill,
    '&:hover': { ...PRESSABLE_EDGE_SX['&:hover'], bgcolor: lighten(fill, 0.12) },
  };
}
