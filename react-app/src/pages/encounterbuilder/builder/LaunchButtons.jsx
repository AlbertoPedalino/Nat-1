import { useState } from 'react';
import { Box, Button, Tooltip } from '@mui/material';
import { SlidersHorizontal } from 'lucide-react';
import InitiativeLaunchDialog from './InitiativeLaunchDialog.jsx';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { GAME_ICONS } from '../../../shared/ui/gameIcons.js';

// Launch, and beside it the launch with initiative advantage or disadvantage
// (the dialog it opens): the builder's Encounter panel and every library card
// take this pair, so a launch looks and asks the same wherever it starts.
// `onLaunch(initiative)` launches (none for a plain Launch; the dialog closes
// itself first); `disabled` when the encounter cannot be launched; `size` is
// both buttons'; `grow` lets Launch take the row's width (the builder panel).
// The tooltip is shown on a disabled button too, through its span.
// The Launch button itself: the launch pair's, and the confirming button of
// the initiative dialog.
export function LaunchButton({ size = 'medium', ...props }) {
  return (
    <Button variant="contained" size={size} startIcon={<GAME_ICONS.encounter size={size === 'small' ? ICON_SIZES.sm : ICON_SIZES.md} />} {...props}>
      Launch
    </Button>
  );
}

export default function LaunchButtons({
  encounter, players, onLaunch, disabled = false, size = 'medium', grow = false,
}) {
  const [open, setOpen] = useState(false);
  const icon = size === 'small' ? ICON_SIZES.sm : ICON_SIZES.md;
  return (
    <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'stretch', flex: grow ? 1 : '0 0 auto', minWidth: 0 }}>
      <LaunchButton size={size} onClick={() => onLaunch()} disabled={disabled} sx={grow ? { flex: 1, minWidth: 0 } : null} />
      <Tooltip title="Launch with initiative advantage / disadvantage">
        <Box component="span" sx={{ display: 'flex', flexShrink: 0 }}>
          <Button
            variant="outlined"
            size={size}
            aria-label="Launch with initiative options"
            onClick={() => setOpen(true)}
            disabled={disabled}
            sx={{ minWidth: 0, px: 1.25 }}
          >
            <SlidersHorizontal size={icon} />
          </Button>
        </Box>
      </Tooltip>
      <InitiativeLaunchDialog
        open={open}
        onClose={() => setOpen(false)}
        encounter={encounter}
        players={players}
        onLaunch={(initiative) => {
          setOpen(false);
          onLaunch(initiative);
        }}
      />
    </Box>
  );
}
