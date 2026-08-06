import {
  Box, IconButton, Tooltip, Typography,
} from '@mui/material';
import { Hexagon, X } from 'lucide-react';
import HexcrawlPanel from './HexcrawlPanel.jsx';

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

// Same as the picture corner: icon-wide in the flow, panel floating under it.
const cornerSx = { position: 'relative', display: 'flex' };

const buttonSx = {
  color: '#e8c96a',
  bgcolor: 'rgba(15,14,13,0.85)',
  border: '1px solid rgba(232,201,106,0.35)',
  '&:hover': { bgcolor: 'rgba(15,14,13,0.95)' },
};

// Scrollable rather than tall, for the same reason as the picture panel: in
// fullscreen there is no page behind it to scroll.
const panelSx = {
  position: 'absolute',
  top: 'calc(100% + 6px)',
  left: 0,
  zIndex: 2,
  width: { xs: 260, sm: 320 },
  maxHeight: 'calc(100vh - 160px)',
  overflowY: 'auto',
  p: 1.25,
  borderRadius: 1,
  bgcolor: 'rgba(15,14,13,0.97)',
  border: '1px solid rgba(232,201,106,0.3)',
  boxShadow: 6,
};

const titleSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.7rem',
  letterSpacing: '0.08em',
  color: 'primary.main',
  mb: 1,
};
