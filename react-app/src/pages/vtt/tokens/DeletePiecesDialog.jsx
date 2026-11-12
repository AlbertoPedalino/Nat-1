import { Button, DialogContentText } from '@mui/material';
import { Trash2 } from 'lucide-react';
import BattleMapDialog from '../map/BattleMapDialog.jsx';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { ErrorLine } from '../../../shared/ui/LoadStatus.jsx';
import { CancelButton } from '../../../shared/ui/SheetDialog.jsx';

export default function DeletePiecesDialog({
  open, pieces, busy, error, container, onCancel, onConfirm,
}) {
  return (
    <BattleMapDialog
      open={open}
      onClose={onCancel}
      container={container}
      maxWidth="xs"
      aria-labelledby="delete-pieces-title"
      aria-describedby="delete-pieces-description"
      titleId="delete-pieces-title"
      title="Delete selected pieces?"
      contentProps={{ 'aria-busy': busy }}
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
      <DialogContentText id="delete-pieces-description" sx={{ pt: 2 }}>
        {pieces.length === 1
          ? `Remove ${pieces[0]?.label || 'this piece'} from the map?`
          : `Remove ${pieces.length} selected pieces from the map?`}
        {' '}This cannot be undone.
      </DialogContentText>
      {error ? <ErrorLine sx={{ mt: 2 }}>{error}</ErrorLine> : null}
    </BattleMapDialog>
  );
}
