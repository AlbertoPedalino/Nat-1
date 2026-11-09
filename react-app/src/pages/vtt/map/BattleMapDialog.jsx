import { Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import {
  battleMapDialogActionsSx,
  battleMapDialogContentSx,
  battleMapDialogPaperSx,
  battleMapDialogTitleSx,
} from './battleMapSurface.js';
import { asArray } from '../../../shared/lists.js';

// A dialog over the battle map, on the map's translucent black-and-gold
// surface (battleMapSurface.js): title, content, actions. `titleSx` and
// `paperSx` add to the surface's own; `contentProps` go to the content
// (dividers, aria-busy); every other prop is the MUI Dialog's.
export default function BattleMapDialog({
  title, titleSx, titleId, paperSx, contentProps, actions = null, children, slotProps, ...dialogProps
}) {
  return (
    <Dialog
      fullWidth
      {...dialogProps}
      slotProps={{
        ...slotProps,
        paper: { ...slotProps?.paper, sx: [battleMapDialogPaperSx, ...asArray(paperSx)] },
      }}
    >
      <DialogTitle id={titleId} sx={[battleMapDialogTitleSx, titleSx]}>{title}</DialogTitle>
      <DialogContent {...contentProps} sx={battleMapDialogContentSx}>{children}</DialogContent>
      {actions ? <DialogActions sx={battleMapDialogActionsSx}>{actions}</DialogActions> : null}
    </Dialog>
  );
}
