import { Box } from '@mui/material';

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
        borderRadius: '3px',
        px: '6px',
        py: '1px',
        fontFamily: '"Cinzel", Georgia, serif',
        fontSize: '0.56rem',
        fontWeight: 700,
        lineHeight: 1.3,
        ...sx,
      }}
    >
      {label}
    </Box>
  );
}
