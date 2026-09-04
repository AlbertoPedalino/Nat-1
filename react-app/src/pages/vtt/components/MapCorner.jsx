import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { Images, X } from 'lucide-react';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import { MapPanel } from './ScenePanels.jsx';

// How far under the top of the strip a panel starts: the icon button, plus the
// gap that keeps it from touching one.
export const ICON_STRIP = 38;

// Everything about the scene behind one icon: its pictures, atmosphere, grid
// and playable edge. They were split across two corners for a while and
// finishing a single thought meant crossing the map.
export default function MapCorner({
  scene,
  busy,
  open = false,
  onOpenChange,
  onShownImageChange,
  onUploadMap,
  onUploadBackground,
  onRemoveMap,
  onRemoveBackground,
  onAddImage,
  onGridChange,
  onAtmosphereChange,
  onPlayAreaChange,
  onFitPlayArea,
}) {
  return (
    <Box sx={cornerSx}>
      {/* Only the icon sits on the map: the switch lives with the rest of the
          picture settings, one click away, instead of taking a permanent strip
          of the board. */}
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
        <Tooltip title={open ? 'Hide the scene settings' : 'Pictures, atmosphere, grid and play area'}>
          <IconButton
            size="small"
            aria-label="Picture settings"
            aria-expanded={open}
            onClick={() => onOpenChange?.(!open)}
            sx={buttonSx}
          >
            {open ? <X size={16} /> : <Images size={16} />}
          </IconButton>
        </Tooltip>
      </Stack>

      {open ? (
        <Box sx={panelSx}>
          <Typography sx={titleSx}>Scene</Typography>
          <MapPanel
            scene={scene}
            busy={busy}
            onUploadMap={onUploadMap}
            onUploadBackground={onUploadBackground}
            onRemoveMap={onRemoveMap}
            onRemoveBackground={onRemoveBackground}
            onAddImage={onAddImage}
            onGridChange={onGridChange}
            onAtmosphereChange={onAtmosphereChange}
            onPlayAreaChange={onPlayAreaChange}
            onFitPlayArea={onFitPlayArea}
            onShownImageChange={onShownImageChange}
          />
        </Box>
      ) : null}
    </Box>
  );
}

// Only as wide as its icon, and as tall as the strip it stands in: the panel
// floats under the icon rather than sitting in the flow, so opening the
// pictures never shoves the hexcrawl button along the top of the map, and the
// full height is what the panel measures its own against.
const cornerSx = {
  position: 'relative',
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

// Scrollable rather than tall: in fullscreen a panel that runs past the bottom
// of the map has no page to scroll behind it. Bounded by the map rather than by
// the window — the map is a cell in the page and is usually much shorter, which
// is what let this panel grow until its own edge cut it off. The strip it hangs
// from is that height, so `100%` here is the map, less the icon it hangs under.
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
