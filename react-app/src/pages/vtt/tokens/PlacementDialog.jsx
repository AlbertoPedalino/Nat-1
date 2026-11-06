import { Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import {
  battleMapDialogActionsSx,
  battleMapDialogContentSx,
  battleMapDialogPaperSx,
  battleMapDialogPlacingPaperSx,
  battleMapDialogTitleSx,
  battleMapDropBackdropSx,
  battleMapDropDialogSx,
} from '../map/battleMapSurface.js';

// The shell of a dialog pieces are dragged out of onto the map: while a piece is
// being placed (`placing`) the dialog fades out, still mounted, so the board
// shows and the pointer sequence is not disturbed.
export default function PlacementDialog({ open, onClose, placing, title, maxWidth = 'sm', actions, children }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={maxWidth}
      sx={battleMapDropDialogSx}
      slotProps={{
        paper: { sx: [battleMapDialogPaperSx, placing && battleMapDialogPlacingPaperSx] },
        backdrop: { sx: battleMapDropBackdropSx },
      }}
    >
      <DialogTitle sx={battleMapDialogTitleSx}>{title}</DialogTitle>
      <DialogContent dividers sx={battleMapDialogContentSx}>{children}</DialogContent>
      <DialogActions sx={battleMapDialogActionsSx}>{actions}</DialogActions>
    </Dialog>
  );
}
