import { Box } from '@mui/material';
import { UI_COLORS } from './colors.js';
import { INK_EDGE, inkShadow } from './shadows.js';
import { CHOICE_MARK, SEAL_RADIUS } from './shapes.js';
import { DURATIONS } from './motion.js';

// The marks of a choice, drawn in the app's ink and set by the theme on every
// checkbox and radio (MuiCheckbox, MuiRadio): a box edged in ink with its solid
// shadow, gold once ticked, the tick drawn in ink; a radio the same on the
// seal's edge (SEAL_RADIUS), a dot of ink once chosen. Sizes from shapes.js.

export function CheckMark({ checked = false }) {
  return (
    <Box component="span" aria-hidden sx={[markSx(1), checked && CHECKED_SX]}>
      {checked ? <Box component="span" sx={TICK_SX} /> : null}
    </Box>
  );
}

export function SealMark({ checked = false }) {
  return (
    <Box component="span" aria-hidden sx={[markSx(SEAL_RADIUS), checked && CHECKED_SX]}>
      {checked ? <Box component="span" sx={DOT_SX} /> : null}
    </Box>
  );
}

function markSx(radius) {
  return {
    width: CHOICE_MARK.size,
    height: CHOICE_MARK.size,
    display: 'grid',
    placeItems: 'center',
    boxSizing: 'border-box',
    border: INK_EDGE,
    borderRadius: radius,
    backgroundColor: UI_COLORS.surfaceRaised,
    boxShadow: inkShadow(UI_COLORS.edge, 2),
    transition: `background-color ${DURATIONS.fast}ms ease`,
  };
}

const CHECKED_SX = { backgroundColor: UI_COLORS.accent };

// The tick and the dot snap in, a little past their size and back.
const SNAP = {
  animation: `gbChoiceSnap ${DURATIONS.slow}ms cubic-bezier(.3, 1.8, .5, 1)`,
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
};

const TICK_SX = {
  width: '55%',
  height: '30%',
  borderLeft: INK_EDGE,
  borderBottom: INK_EDGE,
  transform: 'translateY(-15%) rotate(-45deg)',
  ...SNAP,
  '@keyframes gbChoiceSnap': { from: { opacity: 0, scale: '0.3' } },
};

const DOT_SX = {
  width: '40%',
  height: '40%',
  borderRadius: '50%',
  backgroundColor: UI_COLORS.edge,
  ...SNAP,
  '@keyframes gbChoiceSnap': { from: { opacity: 0, scale: '0.3' } },
};
