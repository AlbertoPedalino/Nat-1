import { Box, Button, DialogContentText } from '@mui/material';
import { Trash2 } from 'lucide-react';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { ErrorLine } from '../../../shared/ui/LoadStatus.jsx';
import SheetDialog, { CancelButton } from '../../../shared/ui/SheetDialog.jsx';

// Asking before the selected pieces are taken off the map: a map dialog, named
// by its title and described by its question (the dialog's own aria wiring
// gives the title the labelling id).
export default function DeletePiecesDialog({
  open, pieces, busy, error, container, onCancel, onConfirm,
}) {
  return (
    <SheetDialog
      surface="map"
      open={open}
      onClose={onCancel}
      container={container}
      maxWidth="xs"
      aria-labelledby="delete-pieces-title"
      aria-describedby="delete-pieces-description"
      title="Delete selected pieces?"
      actions={(
        <>
          <CancelButton autoFocus disabled={busy} onClick={onCancel} />
          <Button
            color="error"
            variant="contained"
            startIcon={<Trash2 size={ICON_SIZES.md} />}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? 'Deleting…' : 'Delete'}
          </Button>
        </>
      )}
    >
      <Box aria-busy={busy}>
        <DialogContentText id="delete-pieces-description">
          {pieces.length === 1
            ? `Remove ${pieces[0]?.label || 'this piece'} from the map?`
            : `Remove ${pieces.length} selected pieces from the map?`}
          {' '}This cannot be undone.
        </DialogContentText>
        {error ? <ErrorLine sx={{ mt: 2 }}>{error}</ErrorLine> : null}
      </Box>
    </SheetDialog>
  );
}
