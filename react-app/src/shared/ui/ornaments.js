import { UI_COLORS } from './colors.js';

// The interface's small fantasy ornaments, drawn in the same ink as
// everything else: a gilded gem (a lozenge of the accent in an ink edge) set
// on the ends of a panel's title bar and in the middle of a section's rule,
// as a rulebook sets its headings. One recipe, so a restyle reaches every gem.

// A gem `size` px across before it is turned on its point, centred on the
// point (`left`, `top`) of the box it is drawn in. Spread as a pseudo-element.
function gem(size, { left, top, right }) {
  return {
    content: '""',
    position: 'absolute',
    width: size,
    height: size,
    ...(right != null ? { right } : { left }),
    top,
    marginTop: `${-size / 2 - 2}px`,
    ...(right != null ? { marginRight: `${-size / 2 - 2}px` } : { marginLeft: `${-size / 2 - 2}px` }),
    transform: 'rotate(45deg)',
    bgcolor: UI_COLORS.accent,
    border: 2,
    borderColor: UI_COLORS.edge,
    boxSizing: 'content-box',
    pointerEvents: 'none',
  };
}

// The studs on a title bar: a gem on each end, half sunk into the panel's
// frame, so the bar reads as a cartouche across the panel.
export const BAR_STUDS_SX = Object.freeze({
  position: 'relative',
  '&::before': gem(7, { left: 0, top: '50%' }),
  '&::after': gem(7, { right: 0, top: '50%' }),
});

// A gem in the middle of a heading's rule (spread with the rule itself):
// the box's own bottom border carries it.
export const RULE_GEM_SX = Object.freeze({
  position: 'relative',
  '&::after': gem(5, { left: '50%', top: '100%' }),
});
