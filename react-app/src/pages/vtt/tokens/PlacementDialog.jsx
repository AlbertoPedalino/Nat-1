import SheetDialog from '../../../shared/ui/SheetDialog.jsx';
import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import { OPACITY } from '../../../shared/ui/colors.js';
import { DURATIONS } from '../../../shared/ui/motion.js';

// The shell of a dialog pieces are dragged out of onto the map (an encounter,
// a creature from the bestiary): a map dialog (SheetDialog, `surface="map"`)
// that lets the board behind it take the drop. While a piece is being placed
// (`placing`) the dialog fades out, still mounted and stationary, so the board
// shows and the pointer sequence is not disturbed. `title`, `maxWidth`,
// `actions` and `children` are the dialog's.
export default function PlacementDialog({ open, onClose, placing, title, maxWidth = 'sm', actions, children }) {
  return (
    <SheetDialog
      surface="map"
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      sx={dropDialogSx}
      slotProps={{
        backdrop: { sx: dropBackdropSx },
        paper: { sx: placing ? { ...fadeSx, ...placingSx } : fadeSx },
      }}
      title={title}
      actions={actions}
    >
      {children}
    </SheetDialog>
  );
}

// The dialog stays open while a piece is dragged, but only its paper should
// intercept the pointer. Outside it, the map remains a real drop target.
const dropDialogSx = {
  pointerEvents: 'none',
  '& .MuiDialog-paper': { pointerEvents: 'auto' },
};

const dropBackdropSx = {
  pointerEvents: 'none',
  bgcolor: vttAlpha(VTT_COLORS.black, OPACITY.fill),
};

// Always set, so the paper fades both ways.
const fadeSx = { transition: `opacity ${DURATIONS.fast}ms ease` };

const placingSx = {
  opacity: 0,
  pointerEvents: 'none',
};
