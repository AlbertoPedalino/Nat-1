import { useState } from 'react';
import { Box, Button, Collapse } from '@mui/material';
import { ChevronDown, ChevronUp } from 'lucide-react';

// The shared frame for a combatant's marker rows — conditions and effects today.
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
          startIcon={open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          sx={toggleSx}
        >
          {label}{count ? ` (${count})` : ''}
        </Button>
        {onClear && count > 0 ? (
          <Button size="small" onClick={onClear} sx={clearSx}>Clear</Button>
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
  minHeight: 22,
};

// Labelled disclosure: a bare chevron on a combatant with no markers at all
// would say nothing about what it opens.
const toggleSx = {
  flex: '0 0 auto',
  minWidth: 0,
  px: 0.5,
  py: 0,
  color: 'text.secondary',
  fontSize: '0.62rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  '& .MuiButton-startIcon': { mr: 0.4 },
  '&:hover': { color: 'text.primary' },
};

const clearSx = {
  flex: '0 0 auto',
  minWidth: 0,
  px: 0.5,
  py: 0,
  color: 'text.secondary',
  fontSize: '0.62rem',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  '&:hover': { color: 'error.main' },
};

// A fully collapsed Collapse still renders a zero-height box, which keeps
// earning a slot in the parent's flex gap. MUI tags that state with
// .MuiCollapse-hidden once the exit transition ends, so dropping the box out of
// layout there removes the phantom gap without costing the animation.
const collapseSx = { '&.MuiCollapse-hidden': { display: 'none' } };
