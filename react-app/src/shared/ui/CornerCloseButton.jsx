import { X } from 'lucide-react';
import TipIconButton from './TipIconButton.jsx';
import { ICON_SIZES } from './iconSizes.js';
import { asArray } from '../lists.js';

// The X that closes what it sits on (a dialog's title bar, a toast, a side
// panel, a floating sheet): the icon button every box closes with, named by
// its tooltip. `label` is that name ("Close the compendium"); `danger` is the
// X that removes rather than closes (a combatant), red under the cursor. `sx`
// places it (a map surface takes mapIconButtonSx through it).
const DANGER_SX = Object.freeze({ '&:hover': { color: 'error.main' } });

export function CloseButton({ onClose, label = 'Close', danger = false, iconSize = ICON_SIZES.md, sx }) {
  return (
    <TipIconButton title={label} size="small" onClick={onClose} sx={[danger ? DANGER_SX : null, ...asArray(sx)]}>
      <X size={iconSize} />
    </TipIconButton>
  );
}

// The same X in the top-right corner of a box that carries its own header (a
// title-less SheetDialog, a side panel, a stat block, a combatant's card, the
// dice toast), over the content. The box it sits in is `position: relative`;
// `sx` is for placement only (a tighter corner on a dense card).
const CORNER_SX = Object.freeze({ position: 'absolute', top: 8, right: 8, zIndex: 1 });

export default function CornerCloseButton({ onClose, label = 'Close', danger = false, iconSize, sx }) {
  return <CloseButton onClose={onClose} label={label} danger={danger} iconSize={iconSize} sx={[CORNER_SX, ...asArray(sx)]} />;
}
