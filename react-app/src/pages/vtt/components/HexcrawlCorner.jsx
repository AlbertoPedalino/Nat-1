import {
  Box, IconButton, Tooltip, Typography,
} from '@mui/material';
import { Hexagon, X } from 'lucide-react';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import HexcrawlPanel from './HexcrawlPanel.jsx';
import { ICON_STRIP } from './MapCorner.jsx';

// Top left, beside the picture settings: the hexcrawl is how this map is played
// rather than a tool you pick up, so it belongs with the scene's own settings
// and not in the rail of brushes and rulers.
export default function HexcrawlCorner({ open = false, onOpenChange, ...props }) {
  return (
    <Box sx={cornerSx}>
      <Tooltip title={open ? 'Hide the hexcrawl settings' : 'Hexcrawl: season, terrain, travel'}>
        <IconButton
          size="small"
          aria-label="Hexcrawl settings"
          aria-expanded={open}
          onClick={() => onOpenChange?.(!open)}
          sx={buttonSx}
        >
          {open ? <X size={16} /> : <Hexagon size={16} />}
        </IconButton>
      </Tooltip>

      {open ? (
        <Box sx={panelSx}>
          <Typography sx={titleSx}>Hexcrawl</Typography>
          <HexcrawlPanel {...props} />
        </Box>
      ) : null}
    </Box>
  );
}

// Same as the picture corner: icon-wide in the flow, full height of the strip,
// panel floating under the icon.
const cornerSx = {
  position: 'relative',
  display: 'flex',
  alignItems: 'flex-start',
  height: '100%',
  minHeight: 0,
};

const buttonSx = {
  // The strip around it is click-through; the icon and the panel are not.
  pointerEvents: 'auto',
  color: VTT_COLORS.gold,
  bgcolor: vttAlpha(VTT_COLORS.ink, 0.85),
  border: `1px solid ${vttAlpha(VTT_COLORS.gold, 0.35)}`,
  '&:hover': { bgcolor: vttAlpha(VTT_COLORS.ink, 0.95) },
};

// Scrollable rather than tall, for the same reason as the picture panel: in
// fullscreen there is no page behind it to scroll, and the map is shorter than
// the window anyway.
const panelSx = {
  pointerEvents: 'auto',
  position: 'absolute',
  top: ICON_STRIP,
  left: 0,
  zIndex: 2,
  width: { xs: 240, sm: 290 },
  maxHeight: `calc(100% - ${ICON_STRIP}px)`,
  minHeight: 0,
  overflowY: 'auto',
  p: 1.25,
  borderRadius: 1,
  bgcolor: vttAlpha(VTT_COLORS.ink, 0.97),
  border: `1px solid ${vttAlpha(VTT_COLORS.gold, 0.3)}`,
  boxShadow: 6,
};

const titleSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.7rem',
  letterSpacing: '0.08em',
  color: 'primary.main',
  mb: 1,
};
