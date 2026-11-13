import { Box } from '@mui/material';
import { X } from 'lucide-react';
import { CloseButton } from './CornerCloseButton.jsx';
import { iconButtonLook } from './pressable.js';
import { ICON_SIZES } from './iconSizes.js';

// The head of every bubble (a roll's toast, an app notice, a map bubble over
// a piece or a hex): its first lines, and beside them the bubble's X — in the
// layout, never laid over it, so the X covers no word however many lines the
// head has. The same small X in the same place in every bubble.
//
// `onClose` makes the X the button that closes the bubble. `hint` draws the
// same X only, on a bubble that closes on a tap anywhere (a map bubble is
// itself the button, and a button inside a button is no button at all).
// `centered` keeps a centred head centred: it leaves on the left the room the
// X takes on the right. `sx` places the head in its bubble.
const X_SX = Object.freeze({ flexShrink: 0, p: 0.5 });
const MARK_SX = Object.freeze({ ...iconButtonLook(1), display: 'inline-flex', pointerEvents: 'none' });
// What the X takes beside the head: its box (12px icon, 4px padding a side,
// 2px edge a side) and the gap before it.
const X_ROOM = 3.5;

export default function BubbleHeader({ children, onClose, hint = false, centered = false, sx }) {
  const close = onClose
    ? <CloseButton onClose={onClose} iconSize={ICON_SIZES.xs} sx={X_SX} />
    : hint
      ? <Box component="span" aria-hidden sx={[MARK_SX, X_SX]}><X size={ICON_SIZES.xs} /></Box>
      : null;
  return (
    <Box sx={[{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }, sx]}>
      <Box sx={{ flex: 1, minWidth: 0, ...(centered && close ? { pl: X_ROOM } : null) }}>{children}</Box>
      {close}
    </Box>
  );
}
