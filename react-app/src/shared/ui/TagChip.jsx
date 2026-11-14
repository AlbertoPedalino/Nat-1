import { Chip } from '@mui/material';
import { Radio } from 'lucide-react';
import { ICON_SIZES } from './iconSizes.js';
import { UI_COLORS } from './colors.js';
import { INK_EDGE } from './shadows.js';
import { FONT_SIZES } from './fonts.js';
import { CONTROL_HEIGHTS } from './controlHeights.js';
import { chipSolidStyle } from './entityColors.js';
import { TEXT_STYLES } from './textStyles.js';
import { asArray } from '../lists.js';

// The comic sticker chip: a fact that stands on its own and is only read (a
// count, a difficulty, a resistance, "Live", "Read only"): the one solid chip
// (chipSolidStyle), filled in its `tone` with the ink on it, as every mark on
// a piece of the map; no tone leaves it a neutral sticker. A chip that is
// clicked is the theme's raised Chip; a tag on a row is a MiniBadge. Callers
// vary only label, icon, tone and size; `sx` is for placement (a margin, a
// width). A table or a scene being played now is a LiveTag.
const SIZES = Object.freeze({
  small: { height: CONTROL_HEIGHTS.sm, fontSize: FONT_SIZES.xs },
  medium: { height: CONTROL_HEIGHTS.md, fontSize: FONT_SIZES.sm },
});

function lookOf(tone) {
  if (!tone) return { backgroundColor: UI_COLORS.surfaceRaised, color: UI_COLORS.textPrimary };
  return chipSolidStyle(tone);
}

export default function TagChip({ label, icon, tone = null, size = 'small', component, sx }) {
  const chipSx = {
    // The tag's lettering: the figure's face, the chip's ink (no outline).
    ...TEXT_STYLES.tag,
    ...SIZES[size],
    maxWidth: '100%',
    flexShrink: 0,
    border: INK_EDGE,
    ...lookOf(tone),
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

// A table or a scene being played now: the success chip with the radio's
// waves, as the battle map's Live button.
export function LiveTag({ label = 'Live', component, sx }) {
  return (
    <TagChip
      label={label}
      tone={UI_COLORS.success}
      icon={<Radio size={ICON_SIZES.xs} />}
      component={component}
      sx={sx}
    />
  );
}
