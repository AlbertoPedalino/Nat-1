import { useState } from 'react';
import { Box, Button, Collapse } from '@mui/material';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { CONTROL_HEIGHTS } from '../../../shared/ui/controlHeights.js';
import { goldToggleSx } from '../../../shared/ui/actionButton.js';

// The shared frame for a combatant's marker rows — conditions and reminders today.
// Both are the same shape: pills that stay visible so the initiative list can be
// scanned, a labelled disclosure hiding the surface that assigns more, and a
// Clear that only exists once there is something to clear.
//
// They sit one directly above the other on the same card, so they have to be
// pixel-identical; the moment one drifts they stop reading as two kinds of the
// same thing. Both files carried their own copy of these five style objects,
// byte-for-byte the same, which made that a convention rather than a fact.
//
// `open` lives here: which panel is expanded is never persisted, never shared,
// and no caller has ever needed to read it.
export default function MarkerRow({ label, count = 0, pills, onClear, belowRow, children }) {
  const [open, setOpen] = useState(false);
  return (
    <Box sx={wrapperSx}>
      <Box sx={rowSx}>
        {pills}
        <Button
          size="small"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          startIcon={open ? <ChevronUp size={ICON_SIZES.sm} /> : <ChevronDown size={ICON_SIZES.sm} />}
          sx={{ ...goldToggleSx(open), '& .MuiButton-startIcon': { mr: 0.5 } }}
        >
          {label}{count ? ` (${count})` : ''}
        </Button>
        {onClear && count > 0 ? (
          <Button size="small" variant="outlined" color="error" onClick={onClear} sx={clearSx}>Clear</Button>
        ) : null}
      </Box>

      {belowRow}

      <Collapse in={open} unmountOnExit sx={collapseSx}>
        {children}
      </Collapse>
    </Box>
  );
}

const wrapperSx = { width: '100%', minWidth: 0 };

const rowSx = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 0.5,
  minHeight: CONTROL_HEIGHTS.sm,
};

// Labelled disclosure: a bare chevron on a combatant with no markers at all
// would say nothing about what it opens.

const clearSx = {
  flex: '0 0 auto',
  minWidth: 0,
  px: 1,
  py: 0.25,
  fontSize: FONT_SIZES.xxs,
  ...TEXT_STYLES.label,
};

// A fully collapsed Collapse still renders a zero-height box, which keeps
// earning a slot in the parent's flex gap. MUI tags that state with
// .MuiCollapse-hidden once the exit transition ends, so dropping the box out of
// layout there removes the phantom gap without costing the animation.
const collapseSx = { '&.MuiCollapse-hidden': { display: 'none' } };
