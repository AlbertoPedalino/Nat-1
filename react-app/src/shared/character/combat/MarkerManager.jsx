import { useState } from 'react';
import { Box } from '@mui/material';
import { Eraser, ListChecks } from 'lucide-react';
import { ICON_SIZES } from '../../ui/iconSizes.js';
import TagChip from '../../ui/TagChip.jsx';
import TipIconButton from '../../ui/TipIconButton.jsx';
import DisclosureButton from '../../ui/DisclosureButton.jsx';
import CollapsibleBody from '../../ui/CollapsibleBody.jsx';

// The body of a sheet panel of markers — Conditions, Reminders: what is on the
// character always in view, and the surface that puts more on it (the
// condition grid, the reminder field and its recent ones). One frame for both
// panels, so what is in force never competes with what is only offered.
//
// `pills` are the markers on the character (MarkerChip), `below` what opens
// under them (a condition's rules card), `children` the surface that adds
// more: behind "Manage (n)", or with `collapse={false}` always in view — for a
// small one (the reminder field) used in one tap, where hiding it would only
// add clicks.
//
// Clearing them all is the panel's header action (MarkerClearAction), not a
// button in the body: rare, and kept out of the way of what is read.
export default function MarkerManager({ pills, count, below, collapse = true, children }) {
  const [open, setOpen] = useState(false);
  return (
    <Box sx={stackSx}>
      <Box sx={pillsSx}>
        {count === 0 ? <TagChip label="— None" /> : pills}
      </Box>

      {below}

      {children && !collapse ? <Box sx={bodySx}>{children}</Box> : null}

      {children && collapse ? (
        <Box>
          {/* The count stays in the name even at nought: "Manage (0)". */}
          <DisclosureButton
            open={open}
            onToggle={() => setOpen(!open)}
            icon={<ListChecks size={ICON_SIZES.xs} />}
            label={`Manage (${count})`}
          />
          <CollapsibleBody open={open}>
            <Box sx={[bodySx, { mt: 0.5 }]}>{children}</Box>
          </CollapsibleBody>
        </Box>
      ) : null}
    </Box>
  );
}

// The panel header's "clear them all": a small remove icon, there only while
// there is something to clear. `what` names the markers ("conditions").
export function MarkerClearAction({ count, onClear, what }) {
  if (!onClear || !count) return null;
  return (
    <TipIconButton title={`Clear all ${what}`} danger size="small" onClick={onClear}>
      <Eraser size={ICON_SIZES.xs} />
    </TipIconButton>
  );
}

const stackSx = { display: 'flex', flexDirection: 'column', gap: 0.5 };

const pillsSx = { display: 'flex', flexWrap: 'wrap', gap: 0.25 };

const bodySx = { display: 'flex', flexDirection: 'column', gap: 0.5 };
