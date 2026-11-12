import { useState } from 'react';
import { Box, Button, Tooltip } from '@mui/material';
import { SlidersHorizontal } from 'lucide-react';
import InitiativeLaunchDialog from './InitiativeLaunchDialog.jsx';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';

// The button beside a Launch that launches with initiative advantage or
// disadvantage, with the dialog it opens: the builder's Launch and a library
// card's both take it, so they look and ask the same. `onLaunch(initiative)`
// launches once the dialog is confirmed (it closes itself first); `disabled`
// when the encounter cannot be launched; `size` is the Launch's beside it.
// The tooltip is shown on a disabled button too, through its span.
export default function InitiativeLaunchButton({
  encounter, players, onLaunch, disabled = false, size = 'medium',
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
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
            <SlidersHorizontal size={size === 'small' ? ICON_SIZES.sm : ICON_SIZES.md} />
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
    </>
  );
}
