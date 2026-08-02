import { useState } from 'react';
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { Images, X } from 'lucide-react';
import { MapPanel } from './ScenePanels.jsx';

// Everything about the pictures behind one icon: which one is up, and the panel
// that uploads, replaces and adds them. They were split across two corners for a
// while and finishing a single thought meant crossing the map.
export default function MapCorner({
  scene,
  busy,
  onShownImageChange,
  onUploadMap,
  onUploadBackground,
  onAddImage,
  onGridChange,
  onPlayAreaChange,
  onFitPlayArea,
}) {
  const [open, setOpen] = useState(false);

  return (
    <Stack spacing={0.75} sx={{ alignItems: 'flex-start' }}>
      {/* Only the icon sits on the map: the switch lives with the rest of the
          picture settings, one click away, instead of taking a permanent strip
          of the board. */}
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
        <Tooltip title={open ? 'Hide the picture settings' : 'Pictures, grid and play area'}>
          <IconButton
            size="small"
            aria-label="Picture settings"
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
            sx={buttonSx}
          >
            {open ? <X size={16} /> : <Images size={16} />}
          </IconButton>
        </Tooltip>
      </Stack>

      {open ? (
        <Box sx={panelSx}>
          <Typography sx={titleSx}>Pictures</Typography>
          <MapPanel
            scene={scene}
            busy={busy}
            onUploadMap={onUploadMap}
            onUploadBackground={onUploadBackground}
            onAddImage={onAddImage}
            onGridChange={onGridChange}
            onPlayAreaChange={onPlayAreaChange}
            onFitPlayArea={onFitPlayArea}
            onShownImageChange={onShownImageChange}
          />
        </Box>
      ) : null}
    </Stack>
  );
}

const buttonSx = {
  color: '#e8c96a',
  bgcolor: 'rgba(15,14,13,0.85)',
  border: '1px solid rgba(232,201,106,0.35)',
  '&:hover': { bgcolor: 'rgba(15,14,13,0.95)' },
};

// Scrollable rather than tall: in fullscreen a panel that runs past the bottom
// of the map has no page to scroll behind it.
const panelSx = {
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
