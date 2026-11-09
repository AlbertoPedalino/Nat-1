import { useState } from 'react';
import {
  Button, Divider, ListItemIcon, ListItemText, Menu, MenuItem, Stack, Tooltip,
} from '@mui/material';
import {
  ChevronDown, Lock, LockOpen, MonitorOff, MonitorPlay, Radio, RadioTower,
} from 'lucide-react';
import { battleMapDialogPaperSx } from '../map/battleMapSurface.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';

// Everything that decides what the table sees, in one place: whether this scene
// is the live one, whether the picture is frozen while the GM prepares the next,
// and whether a projector follows it. The GM's own preview of the player view
// is not here — it changes nothing for anyone else.
//
// Freeze stays a button of its own because it is pressed again and again during
// a session; the projector is opened once an evening, so it waits in the menu
// behind Live together with going off air.
export default function LiveControls({
  isLive,
  projectorFollowing,
  projectorAttached,
  onToggleLive,
  onToggleFreeze,
  onOpenProjector,
  onStopProjector,
}) {
  const [anchor, setAnchor] = useState(null);
  const close = () => setAnchor(null);
  const run = (action) => () => {
    close();
    action();
  };

  if (!isLive) {
    return (
      <Button
        size="small"
        color="inherit"
        variant="outlined"
        startIcon={<Radio size={ICON_SIZES.sm} />}
        aria-pressed={false}
        onClick={onToggleLive}
      >
        Go live
      </Button>
    );
  }

  return (
    <Stack direction="row" spacing={0.5}>
      <Tooltip title={projectorAttached ? 'Live, with the projector following' : 'Live: projector and going off air'}>
        <Button
          size="small"
          color="success"
          variant="contained"
          startIcon={<Radio size={ICON_SIZES.sm} />}
          endIcon={<ChevronDown size={ICON_SIZES.xs} />}
          aria-label="Live"
          aria-pressed
          aria-haspopup="menu"
          aria-controls={anchor ? 'scene-live-menu' : undefined}
          aria-expanded={anchor ? 'true' : undefined}
          onClick={(event) => setAnchor(event.currentTarget)}
        >
          Live
          {/* The projector is a second screen nobody in the room can miss, but
              the GM's bar should still say it is attached. */}
          {projectorAttached ? <MonitorPlay size={ICON_SIZES.xs} aria-hidden /> : null}
        </Button>
      </Tooltip>
      <Tooltip
        title={projectorFollowing
          ? 'Freeze the current picture for players and the projector while you prepare another view'
          : 'Publish your prepared picture and let the projector follow your camera again'}
      >
        <Button
          size="small"
          variant={projectorFollowing ? 'outlined' : 'contained'}
          startIcon={projectorFollowing ? <Lock size={ICON_SIZES.sm} /> : <LockOpen size={ICON_SIZES.sm} />}
          aria-label={projectorFollowing ? 'Freeze view' : 'Unfreeze view'}
          aria-pressed={!projectorFollowing}
          onClick={onToggleFreeze}
        >
          {projectorFollowing ? 'Freeze view' : 'Unfreeze view'}
        </Button>
      </Tooltip>
      <Menu
        id="scene-live-menu"
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={close}
        slotProps={{ paper: { sx: menuPaperSx } }}
      >
        {projectorAttached ? (
          <MenuItem onClick={run(onStopProjector)}>
            <ListItemIcon sx={iconSx}><MonitorOff size={ICON_SIZES.sm} /></ListItemIcon>
            <ListItemText primary="Stop projector mode" secondary="Closes the projector tab" />
          </MenuItem>
        ) : (
          <MenuItem onClick={run(onOpenProjector)}>
            <ListItemIcon sx={iconSx}><MonitorPlay size={ICON_SIZES.sm} /></ListItemIcon>
            <ListItemText primary="Projector mode" />
          </MenuItem>
        )}
        <Divider />
        <MenuItem onClick={run(onToggleLive)}>
          <ListItemIcon sx={iconSx}><RadioTower size={ICON_SIZES.sm} /></ListItemIcon>
          <ListItemText primary="Stop live" secondary="Players no longer see this scene" />
        </MenuItem>
      </Menu>
    </Stack>
  );
}

const menuPaperSx = {
  ...battleMapDialogPaperSx,
  minWidth: 220,
};

const iconSx = {
  minWidth: 28,
  color: 'primary.main',
};
