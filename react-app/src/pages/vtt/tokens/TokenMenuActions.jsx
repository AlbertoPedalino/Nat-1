import { Button, Stack } from '@mui/material';
import { ScrollText, Trash2 } from 'lucide-react';

// The piece menu's bottom row: Done, and Sheet / Stat block / Remove when this
// user may use them. Each one closes the menu.
export default function TokenMenuActions({
  token, canRemove, onClose, onSheet, onStatBlock, onDelete,
}) {
  return (
    <Stack direction="row" spacing={0.6}>
      <Button size="small" variant="outlined" onClick={onClose} sx={{ ...menuButtonSx, flex: 1 }}>Done</Button>
      {onSheet ? (
        <Button
          size="small"
          variant="outlined"
          startIcon={<ScrollText size={14} />}
          onClick={() => { onSheet(token); onClose(); }}
          sx={menuButtonSx}
        >
          Sheet
        </Button>
      ) : null}
      {onStatBlock ? (
        <Button
          size="small"
          variant="outlined"
          startIcon={<ScrollText size={14} />}
          onClick={() => { onStatBlock(token); onClose(); }}
          sx={menuButtonSx}
        >
          Stat block
        </Button>
      ) : null}
      {/* A player may take back what they put down — their own piece or a
          marker they dropped — and the delete policy says the same. */}
      {canRemove ? (
        <Button
          size="small"
          variant="outlined"
          color="error"
          startIcon={<Trash2 size={14} />}
          onClick={() => { onDelete(token); onClose(); }}
          sx={menuButtonSx}
        >
          Remove
        </Button>
      ) : null}
    </Stack>
  );
}

const menuButtonSx = {
  minHeight: 28,
  py: 0.25,
  fontSize: '0.62rem',
};
