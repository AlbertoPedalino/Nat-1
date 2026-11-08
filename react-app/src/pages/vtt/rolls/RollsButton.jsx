import { useState } from 'react';
import { Box, IconButton, Popover, Tooltip } from '@mui/material';
import { Dices, ScrollText } from 'lucide-react';
import CustomRollDialog from '../../../shared/character/dice/CustomRollDialog.jsx';
import RollLogPanel from './RollLogPanel.jsx';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import {
  battleMapDialogActionsSx,
  battleMapDialogContentSx,
  battleMapDialogPaperSx,
  battleMapDialogTitleSx,
  mapIconButtonSx,
} from '../map/battleMapSurface.js';

// The map's dice, in its top-right corner beside the tools toggle: one joined
// control, rolling first and the log second — as on the character sheet — so
// the roll is one click away and the log does not stand in front of it. Being
// on the map, both stay in fullscreen.
export default function RollsButton({ feed, onCustomRoll, onClear }) {
  const [anchor, setAnchor] = useState(null);
  const [rollerOpen, setRollerOpen] = useState(false);
  const close = () => setAnchor(null);

  return (
    <>
      <Box role="group" aria-label="Dice" sx={groupSx}>
        {onCustomRoll ? (
          <Tooltip title="Roll dice">
            <IconButton size="small" aria-label="Roll dice" onClick={() => setRollerOpen(true)} sx={segmentSx}>
              <Dices size={16} />
            </IconButton>
          </Tooltip>
        ) : null}
        <Tooltip title="Roll log">
          <IconButton
            size="small"
            aria-label="Roll log"
            aria-haspopup="dialog"
            aria-expanded={anchor ? 'true' : undefined}
            onClick={(event) => setAnchor(anchor ? null : event.currentTarget)}
            sx={{ ...segmentSx, ...(anchor ? openSx : null) }}
          >
            <ScrollText size={16} />
          </IconButton>
        </Tooltip>
      </Box>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: paperSx } }}
      >
        <RollLogPanel feed={feed} onClear={onClear} />
      </Popover>
      <CustomRollDialog
        open={rollerOpen}
        onClose={() => setRollerOpen(false)}
        onRoll={onCustomRoll}
        // The map is often fullscreen, and a dialog on the body is not painted
        // at all when it is.
        slotProps={{ paper: { sx: battleMapDialogPaperSx } }}
        titleSx={battleMapDialogTitleSx}
        contentSx={battleMapDialogContentSx}
        actionsSx={battleMapDialogActionsSx}
      />
    </>
  );
}

// The map's icon button chrome around both halves, the halves split by a rule.
const groupSx = {
  display: 'inline-flex',
  alignItems: 'stretch',
  borderRadius: 999,
  overflow: 'hidden',
  bgcolor: mapIconButtonSx.bgcolor,
  border: mapIconButtonSx.border,
  '& > * + *': { borderLeft: `1px solid ${vttAlpha(VTT_COLORS.gold, 0.35)}` },
};

const segmentSx = {
  color: VTT_COLORS.gold,
  borderRadius: 0,
  px: 0.9,
  '&:hover': { bgcolor: vttAlpha(VTT_COLORS.ink, 0.95) },
};

// While the log is open its half is lit.
const openSx = { bgcolor: vttAlpha(VTT_COLORS.gold, 0.16) };

const paperSx = {
  ...battleMapDialogPaperSx,
  mt: 0.75,
  p: 1.25,
  width: { xs: 'calc(100vw - 32px)', sm: 330 },
  maxHeight: '60vh',
  overflowY: 'auto',
};
