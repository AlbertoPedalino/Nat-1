import { useState } from 'react';
import { Button, Popover } from '@mui/material';
import { Dices } from 'lucide-react';
import RollLogPanel from './RollLogPanel.jsx';
import { battleMapDialogPaperSx } from '../map/battleMapSurface.js';

// The roll log behind a button, for the scene bar: what everyone at the table
// reaches for most, so it sits by the name rather than among the map tools. A
// fullscreen map paints no bar, so there the rail offers the same panel instead.
export default function RollsButton({ feed, onCustomRoll, onClear, sx }) {
  const [anchor, setAnchor] = useState(null);
  const close = () => setAnchor(null);

  return (
    <>
      <Button
        size="small"
        variant={anchor ? 'contained' : 'outlined'}
        startIcon={<Dices size={14} />}
        aria-haspopup="dialog"
        aria-expanded={anchor ? 'true' : undefined}
        onClick={(event) => setAnchor(anchor ? null : event.currentTarget)}
        sx={sx}
      >
        Rolls
      </Button>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
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

const paperSx = {
  ...battleMapDialogPaperSx,
  mt: 0.75,
  p: 1.25,
  width: { xs: 'calc(100vw - 32px)', sm: 330 },
  maxHeight: '60vh',
  overflowY: 'auto',
};
