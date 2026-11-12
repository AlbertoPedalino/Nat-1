import { Chip, alpha } from '@mui/material';
import { UI_COLORS, OPACITY } from './colors.js';
import { inkOn } from './pressable.js';
import { INK_EDGE } from './shadows.js';
import { TEXT_STYLES } from './textStyles.js';
import { FONT_SIZES } from './fonts.js';
import { CONTROL_HEIGHTS } from './controlHeights.js';
import { asArray } from '../lists.js';

// The comic sticker chip: a fact that stands on its own and is only read (a
// count, a difficulty, a resistance, "Live", "READ ONLY"), drawn with the ink
// edge, flat as everything only read. `tone` tints it and writes its label;
// `filled` paints it solid in its tone (the stronger fact: an immunity, a
// full count); no tone leaves it a neutral sticker. A chip that is clicked is
// the theme's raised Chip; a tag on a row is a MiniBadge. Callers vary only
// label, icon, tone, filled and size; `sx` is for placement (a margin, a width).
const SIZES = Object.freeze({
  small: { height: CONTROL_HEIGHTS.sm, fontSize: FONT_SIZES.xs },
  medium: { height: CONTROL_HEIGHTS.md, fontSize: FONT_SIZES.sm },
});

function lookOf(tone, filled) {
  if (!tone) return { backgroundColor: UI_COLORS.surfaceRaised, color: UI_COLORS.textPrimary };
  if (filled) return { backgroundColor: tone, color: inkOn(tone) };
  return { backgroundColor: alpha(tone, OPACITY.line), color: tone };
}

export default function TagChip({ label, icon, tone = null, filled = false, size = 'small', component, sx }) {
  const chipSx = {
    ...TEXT_STYLES.title,
    ...SIZES[size],
    maxWidth: '100%',
    flexShrink: 0,
    border: INK_EDGE,
    ...lookOf(tone, filled),
    '& .MuiChip-icon': { color: 'inherit', ml: 0.75, mr: -0.25 },
  };
  return (
    <Chip
      component={component}
      size={size}
      icon={icon}
      label={label}
      sx={[chipSx, ...asArray(sx)]}
    />
  );
}
