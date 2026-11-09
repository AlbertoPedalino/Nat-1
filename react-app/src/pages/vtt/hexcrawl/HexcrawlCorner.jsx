import { useState } from 'react';
import {
  Box, IconButton, Stack, Tooltip, Typography,
} from '@mui/material';
import { Hexagon, Settings, X } from 'lucide-react';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import HexcrawlPanel from './HexcrawlPanel.jsx';
import HexcrawlSettingsDialog from './HexcrawlSettingsDialog.jsx';
import { ICON_STRIP } from '../scene/MapCorner.jsx';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { OPACITY } from '../../../shared/ui/colors.js';
import { SURFACES } from '../../../shared/ui/surfaces.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';

// Top left, beside the picture settings: the hexcrawl is how this map is played
// rather than a tool you pick up, so it belongs with the scene's own settings
// and not in the rail of brushes and rulers.
//
// The corner reports; the gear opens the settings, centred and full size, for
// the moments the table decides something has changed.
export default function HexcrawlCorner({ open = false, onOpenChange, ...props }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const openSettings = () => setSettingsOpen(true);

  return (
    <Box sx={cornerSx}>
      <Tooltip title={open ? 'Hide the hexcrawl' : 'Hexcrawl: time, weather, travel'}>
        <IconButton
          size="small"
          aria-label="Hexcrawl"
          aria-expanded={open}
          onClick={() => onOpenChange?.(!open)}
          sx={buttonSx}
        >
          {open ? <X size={ICON_SIZES.md} /> : <Hexagon size={ICON_SIZES.md} />}
        </IconButton>
      </Tooltip>

      {open ? (
        <Box sx={panelSx}>
          <Stack direction="row" sx={titleRowSx}>
            <Typography sx={titleSx}>Hexcrawl</Typography>
            <Tooltip title="Hexcrawl settings">
              <IconButton size="small" aria-label="Hexcrawl settings" onClick={openSettings} sx={settingsButtonSx}>
                <Settings size={ICON_SIZES.sm} />
              </IconButton>
            </Tooltip>
          </Stack>
          <HexcrawlPanel {...props} onOpenSettings={openSettings} />
        </Box>
      ) : null}

      <HexcrawlSettingsDialog
        {...props}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
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
  ...SURFACES.mapControl,
  pointerEvents: 'auto',
  color: VTT_COLORS.accent,
  '&:hover': { bgcolor: vttAlpha(VTT_COLORS.surface, OPACITY.solid) },
};

// Scrollable rather than tall, for the same reason as the picture panel: in
// fullscreen there is no page behind it to scroll, and the map is shorter than
// the window anyway.
const panelSx = {
  ...SURFACES.mapControl,
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
  boxShadow: 6,
};

const titleSx = {
  ...TEXT_STYLES.title,
  fontSize: FONT_SIZES.md,
  color: 'primary.main',
};

const settingsButtonSx = { color: 'text.secondary', p: 0.5, '&:hover': { color: 'primary.main' } };

const titleRowSx = { alignItems: 'center', justifyContent: 'space-between', mb: 0.75 };
