import { Box, alpha } from '@mui/material';
import { FONT_SIZES, LINE_HEIGHTS } from './fonts.js';
import { TEXT_STYLES } from './textStyles.js';
import { OPACITY } from './colors.js';

// The badge's wash: its own colour, faint. A colour MUI cannot read (a theme
// path) gets no wash.
function tint(color) {
  try { return alpha(color, OPACITY.fill); } catch { return 'transparent'; }
}

// The badge: a small bordered, tinted label for an attribute of a row — a
// source, a level, a cast time, Concentration/Ritual, an item or action tag —
// on the sheet and in the builder alike. Something that stands on its own or
// is clicked (a counter, a filter, a condition, a state) is a Chip instead.
// Callers vary only `label`/`color` (and `bg` for a different wash); the shape
// lives here so every badge reads the same. `sx` allows rare per-use tweaks.
export default function MiniBadge({ label, color, bg, title, sx }) {
  return (
    <Box
      component="span"
      title={title}
      sx={{
        flexShrink: 0,
        border: 1,
        borderColor: color,
        color,
        bgcolor: bg ?? tint(color),
        borderRadius: 0.375,
        px: 0.75,
        py: 0.25,
        ...TEXT_STYLES.figure,
        fontSize: FONT_SIZES.xxs,
        lineHeight: LINE_HEIGHTS.snug,
        ...sx,
      }}
    >
      {label}
    </Box>
  );
}
