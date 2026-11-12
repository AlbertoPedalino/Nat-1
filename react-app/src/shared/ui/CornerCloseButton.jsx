import { IconButton } from '@mui/material';
import { X } from 'lucide-react';
import TipIconButton from './TipIconButton.jsx';
import { ICON_SIZES } from './iconSizes.js';
import { asArray } from '../lists.js';

// The X in the top-right corner of a box that carries its own header (a
// title-less SheetDialog, a side panel, a stat block, a combatant's card):
// small, quiet, over the content. `label` is its name for a screen reader
// ("Close statblock"); `tooltip` also shows a tip over it. `danger` is the X
// that removes rather than closes (a combatant), red under the cursor. The box
// it sits in is `position: relative`; `sx` is for placement only (a tighter
// corner on a dense card).
const CORNER_SX = Object.freeze({ position: 'absolute', top: 8, right: 8, zIndex: 1, color: 'text.secondary' });
const DANGER_SX = Object.freeze({ '&:hover': { color: 'error.main' } });

export default function CornerCloseButton({ onClose, label = 'Close', tooltip, danger = false, sx }) {
  const buttonProps = {
    size: 'small',
    color: danger ? 'error' : 'default',
    onClick: onClose,
    sx: [CORNER_SX, danger ? DANGER_SX : null, ...asArray(sx)],
  };
  const icon = <X size={ICON_SIZES.md} />;
  if (tooltip) return <TipIconButton title={tooltip} ariaLabel={label} {...buttonProps}>{icon}</TipIconButton>;
  return <IconButton aria-label={label} {...buttonProps}>{icon}</IconButton>;
}
