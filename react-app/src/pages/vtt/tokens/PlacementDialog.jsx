import BattleMapDialog from '../map/BattleMapDialog.jsx';
import {
  battleMapDialogPlacingPaperSx,
  battleMapDropBackdropSx,
  battleMapDropDialogSx,
} from '../map/battleMapSurface.js';

// The shell of a dialog pieces are dragged out of onto the map: while a piece is
// being placed (`placing`) the dialog fades out, still mounted, so the board
// shows and the pointer sequence is not disturbed.
export default function PlacementDialog({ open, onClose, placing, title, maxWidth = 'sm', actions, children }) {
  return (
    <BattleMapDialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      sx={battleMapDropDialogSx}
      paperSx={placing ? battleMapDialogPlacingPaperSx : null}
      slotProps={{ backdrop: { sx: battleMapDropBackdropSx } }}
      title={title}
      contentProps={{ dividers: true }}
      actions={actions}
    >
      {children}
    </BattleMapDialog>
  );
}
