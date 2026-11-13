import { Box } from '@mui/material';
import { X } from 'lucide-react';
import { CloseButton } from './CornerCloseButton.jsx';
import { iconButtonLook } from './pressable.js';
import { ICON_SIZES } from './iconSizes.js';

// The head of every bubble (a roll's toast, an app notice, a map bubble over
// a piece or a hex) and the bubble's X. The X belongs to the bubble: it sits
// in the bubble's top-right corner, the same small X in the same place in
// every bubble (the bubble is the positioned box it hangs from). The whole
// head — every line of it, not only the first — keeps clear of that corner,
// so the X covers no word.
//
// `onClose` makes the X the button that closes the bubble. `hint` draws the
// same X only, on a bubble that closes on a tap anywhere (a map bubble is
// itself the button, and a button inside a button is no button at all).
// `centered` keeps a centred head centred: it leaves the same room on the
// left. `sx` places the head in its bubble.
const X_SX = Object.freeze({ position: 'absolute', top: 6, right: 6, zIndex: 3, p: 0.5 });
const MARK_SX = Object.freeze({ ...iconButtonLook(1), display: 'inline-flex', pointerEvents: 'none' });
// The corner the X takes, measured from the bubble's edge (6px off it, a 24px
// box), less the narrowest bubble padding (10px), with a little air.
const X_ROOM = 3.5;

export default function BubbleHeader({ children, onClose, hint = false, centered = false, sx }) {
  const close = onClose
    ? <CloseButton onClose={onClose} iconSize={ICON_SIZES.xs} sx={X_SX} />
    : hint
      ? <Box component="span" aria-hidden sx={[MARK_SX, X_SX]}><X size={ICON_SIZES.xs} /></Box>
      : null;
  return (
    <>
      {close}
      <Box sx={[close ? { pr: X_ROOM, ...(centered ? { pl: X_ROOM } : null) } : null, sx]}>{children}</Box>
    </>
  );
}
