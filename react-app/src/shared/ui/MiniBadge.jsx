import { Box } from '@mui/material';
import { FONT_SIZES, LINE_HEIGHTS } from './fonts.js';
import { TEXT_STYLES } from './textStyles.js';

// Shared mini chip/badge: a small bordered, tinted label. One look for every
// spell-row tag — cast time, Concentration/Ritual, source, modifiers — across
// the sheet spell card and the builder/dialog/spellbook rows. Callers vary only
// `label`/`color`/`bg`; the shape lives here so the chip reads identically
// everywhere. `bg` defaults to transparent; `sx` allows rare per-use tweaks.
export default function MiniBadge({ label, color, bg = 'transparent', title, sx }) {
  return (
    <Box
      component="span"
      title={title}
      sx={{
        flexShrink: 0,
        border: 1,
        borderColor: color,
        color,
        bgcolor: bg,
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
