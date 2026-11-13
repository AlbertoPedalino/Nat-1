import { ChevronDown, ChevronUp } from 'lucide-react';
import TipIconButton from './TipIconButton.jsx';
import { ICON_SIZES } from './iconSizes.js';

// The chevron at the end of a row that opens its details (a builder choice, a
// class, a plan to replicate), where clicking the row itself chooses it: the
// raised icon button, named for what it opens ("Expand Fighter"), saying
// which way it goes. A labelled opener is a DisclosureButton instead.
export default function RowExpandButton({ open, onToggle, label, disabled = false }) {
  const name = `${open ? 'Collapse' : 'Expand'} ${label}`;
  return (
    <TipIconButton
      title={name}
      size="small"
      disabled={disabled}
      aria-expanded={open}
      onClick={onToggle}
      sx={{ alignSelf: 'center', flexShrink: 0, mx: 0.5 }}
    >
      {open ? <ChevronUp size={ICON_SIZES.md} /> : <ChevronDown size={ICON_SIZES.md} />}
    </TipIconButton>
  );
}
