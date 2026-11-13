import { useState } from 'react';
import { Box } from '@mui/material';
import { CONTROL_HEIGHTS } from '../../../shared/ui/controlHeights.js';
import DisclosureButton from '../../../shared/ui/DisclosureButton.jsx';
import CollapsibleBody from '../../../shared/ui/CollapsibleBody.jsx';
import ClearButton from '../../../shared/ui/ClearButton.jsx';

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
        <DisclosureButton open={open} onToggle={() => setOpen((prev) => !prev)} label={label} count={count} />
        {onClear && count > 0 ? (
          <ClearButton onClick={onClear} />
        ) : null}
      </Box>

      {belowRow}

      <CollapsibleBody open={open}>
        {children}
      </CollapsibleBody>
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

