import { Box } from '@mui/material';
import { usePortrait } from './usePortraits.js';
import { UI_COLORS } from '../../ui/colors.js';
import { inkPieceShadow } from '../../ui/shadows.js';

// The round badge that stands for a character: their portrait if they have one,
// and the class icon in their chosen colour if they do not, inked as their
// piece on the battle map is.
//
// Display only. Choosing a portrait belongs to the sheet, which is the one
// place a character is edited; everywhere else — an encounter, a battle map —
// only shows what the sheet decided.
export default function PortraitBadge({ path, size, color, children, sx, ...props }) {
  const portrait = usePortrait(path);

  return (
    <Box
      {...props}
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: 4,
        // The player's own colour, kept as a ring rather than only as the disc
        // behind the face: it is how a character is picked out at a glance, and
        // a portrait would otherwise hide it.
        borderColor: color || 'divider',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        overflow: 'hidden',
        // The colour still shows behind a portrait that has not arrived yet, so
        // the badge never flashes as a hole in the layout.
        bgcolor: color || UI_COLORS.surfaceRaised,
        // Inked like the character's piece on the battle map (characterPieceSx):
        // the same cut-out, wherever the character is shown.
        boxShadow: inkPieceShadow(),
        ...sx,
      }}
    >
      {portrait ? (
        <Box
          component="img"
          src={portrait}
          alt=""
          draggable={false}
          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : children}
    </Box>
  );
}
