import { Box } from '@mui/material';
import { UI_COLORS } from './colors.js';
import { FONT_SIZES, LINE_HEIGHTS } from './fonts.js';
import { TEXT_STYLES } from './textStyles.js';
import { INK_EDGE, inkShadow } from './shadows.js';
import { inkOn } from './pressable.js';
import { SEAL_RADIUS } from './shapes.js';
import { asArray } from '../lists.js';

// How many there are, beside a title or a label (a panel's entries, a group's
// encounters, the markers behind Manage): the figure on a small wax seal
// (SEAL_RADIUS) in `tone`, edged in ink with its solid shadow, instead of
// "(n)". Every count of the app is one; none while there is nothing to count.
// Read aloud as before, "Reminders (2)": the seal is only seen, its words
// only heard, so the label and its figure never run together.
export default function CountSeal({ count, tone = UI_COLORS.accent, sx }) {
  if (!count) return null;
  return (
    <>
      <Box component="span" sx={SPOKEN_ONLY_SX}>{` (${count})`}</Box>
      <Box component="span" aria-hidden sx={[sealSx(tone), ...asArray(sx)]}>{count}</Box>
    </>
  );
}

// Heard, not seen.
const SPOKEN_ONLY_SX = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
};

function sealSx(tone) {
  return {
    ...TEXT_STYLES.label,
    display: 'inline-grid',
    placeItems: 'center',
    minWidth: 22,
    height: 20,
    px: 0.5,
    flexShrink: 0,
    fontSize: FONT_SIZES.xs,
    lineHeight: LINE_HEIGHTS.none,
    fontVariantNumeric: 'tabular-nums',
    color: inkOn(tone),
    bgcolor: tone,
    border: INK_EDGE,
    borderRadius: SEAL_RADIUS,
    boxShadow: inkShadow(UI_COLORS.edge, 2),
  };
}
