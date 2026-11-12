import { Button } from '@mui/material';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { goldToggleSx } from './actionButton.js';
import { TEXT_STYLES } from './textStyles.js';
import { FONT_SIZES } from './fonts.js';
import { ICON_SIZES } from './iconSizes.js';
import { asArray } from '../lists.js';

// The labelled button that opens and closes what sits under it (a combatant's
// HP modifiers or marker rows, the item filters, a panel that folds away): its
// chevron says which way it goes, `aria-expanded` says it to a screen reader,
// and the label says what it hides, so a bare chevron never stands alone. The
// body it opens is a CollapsibleBody; the caller keeps `open`.
//
// `count` is added to the label as "(n)" when there is one. `tone` is its
// look: 'toggle' (the raised gold toggle, lit while open — or while `lit`, a
// filter that is set) or 'quiet' (a small text line inside a dense card).
// `icon` leads the label when the button names its kind (the filters' sliders);
// the chevron then follows it; a caller that names the open state by its
// label alone ("Close") passes no icon then. `disabled` greys it while what it
// opens cannot be used (a token editor while the scene is busy). `sx` is for
// placement only.
const QUIET_SX = Object.freeze({
  flex: '0 0 auto',
  minWidth: 0,
  px: 0.5,
  py: 0,
  color: 'text.secondary',
  ...TEXT_STYLES.label,
  fontSize: FONT_SIZES.xs,
  '&:hover': { color: 'text.primary' },
});

const ICON_GAP_SX = Object.freeze({ '& .MuiButton-startIcon': { mr: 0.5 } });

export default function DisclosureButton({
  open, onToggle, label, count = 0, tone = 'toggle', lit = false, icon = null, disabled = false, sx,
}) {
  const chevron = open ? <ChevronUp size={ICON_SIZES.sm} /> : <ChevronDown size={ICON_SIZES.sm} />;
  const look = tone === 'quiet' ? QUIET_SX : goldToggleSx(open || lit);
  return (
    <Button
      size="small"
      aria-expanded={open}
      disabled={disabled}
      onClick={onToggle}
      startIcon={icon ?? chevron}
      endIcon={icon ? chevron : undefined}
      sx={[look, ICON_GAP_SX, ...asArray(sx)]}
    >
      {count ? `${label} (${count})` : label}
    </Button>
  );
}
