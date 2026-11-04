import { useState } from 'react';
import { IconButton, Popover, Tooltip } from '@mui/material';
import { Dices } from 'lucide-react';
import RollLogPanel from './RollLogPanel.jsx';
import { battleMapDialogPaperSx, mapIconButtonSx } from '../map/battleMapSurface.js';

// The roll log behind a dice icon in the map's top-right corner, beside the
// tools toggle and shaped like it: what everyone at the table reaches for most,
// so it is never inside the rail, and being on the map it stays in fullscreen.
export default function RollsButton({ feed, onCustomRoll, onClear }) {
  const [anchor, setAnchor] = useState(null);
  const close = () => setAnchor(null);

  return (
    <>
      <Tooltip title="Rolls">
        <IconButton
          size="small"
          aria-label="Rolls"
          aria-haspopup="dialog"
          aria-expanded={anchor ? 'true' : undefined}
          onClick={(event) => setAnchor(anchor ? null : event.currentTarget)}
          sx={anchor ? openButtonSx : mapIconButtonSx}
        >
          <Dices size={16} />
        </IconButton>
      </Tooltip>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: paperSx } }}
      >
        <RollLogPanel
          feed={feed}
          onCustomRoll={(formula) => {
            onCustomRoll(formula);
            close();
          }}
          onClear={onClear}
        />
      </Popover>
    </>
  );
}

// While the log is open the gold edge is lit.
const openButtonSx = { ...mapIconButtonSx, borderColor: 'primary.main' };

const paperSx = {
  ...battleMapDialogPaperSx,
  mt: 0.75,
  p: 1.25,
  width: { xs: 'calc(100vw - 32px)', sm: 330 },
  maxHeight: '60vh',
  overflowY: 'auto',
};
