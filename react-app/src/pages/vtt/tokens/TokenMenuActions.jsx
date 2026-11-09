import { Button, Stack } from '@mui/material';
import { ScrollText, Trash2 } from 'lucide-react';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';

// The piece menu's bottom row: Done, and Sheet / Stat block / Remove when this
// user may use them. Each one closes the menu.
export default function TokenMenuActions({
  token, canRemove, onClose, onSheet, onStatBlock, onDelete,
}) {
  return (
    <Stack direction="row" spacing={0.5}>
      <Button size="small" variant="outlined" onClick={onClose} sx={{ ...menuButtonSx, flex: 1 }}>Done</Button>
      {onSheet ? (
        <Button
          size="small"
          variant="outlined"
          startIcon={<ScrollText size={ICON_SIZES.sm} />}
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
          startIcon={<ScrollText size={ICON_SIZES.sm} />}
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
          startIcon={<Trash2 size={ICON_SIZES.sm} />}
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
  fontSize: FONT_SIZES.xs,
};
