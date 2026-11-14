import { useState } from 'react';
import { Box } from '@mui/material';
import { Eraser, ListChecks } from 'lucide-react';
import { CONTROL_HEIGHTS } from '../../ui/controlHeights.js';
import { ICON_SIZES } from '../../ui/iconSizes.js';
import TagChip from '../../ui/TagChip.jsx';
import TipIconButton from '../../ui/TipIconButton.jsx';
import DisclosureButton from '../../ui/DisclosureButton.jsx';
import CollapsibleBody from '../../ui/CollapsibleBody.jsx';

// The one frame for a creature's markers — Conditions, Reminders — on the
// character sheet's panels and on an encounter combatant's card: what is on the
// creature always in view, so a list of them can be scanned without opening
// anything, and the surface that puts more on it (the condition grid, the
// reminder field and its recent ones). Both kinds sit side by side or one
// above the other, so they share this frame and cannot drift apart.
//
// `pills` are the markers on the creature (MarkerChip), `below` what opens
// under them (a condition's rules card), `children` the surface that adds
// more: behind a toggle named `label` ("Manage" in a panel that is already
// titled, the kind's name on a card that is not), or
// with `collapse={false}` always in view — for a small one (the reminder
// field) used in one tap, where hiding it would only add clicks.
//
// `inline` lays pills, toggle and clear on one wrapped line, for a combatant's
// card in the initiative list; there `onClear` puts the clear at the end of
// the line. A panel puts it in its header instead (MarkerClearAction as the
// Panel's action): rare, and kept out of the way of what is read. A panel with
// no markers says so ("— None"); a card's line shows nothing, its toggle
// already names what is missing.
export default function MarkerManager({
  pills, count = 0, below, label = 'Manage', collapse = true, inline = false, onClear, children,
}) {
  const [open, setOpen] = useState(false);
  const hasPills = Array.isArray(pills) ? pills.length > 0 : Boolean(pills);
  const toggle = children && collapse ? (
    <DisclosureButton
      open={open}
      onToggle={() => setOpen(!open)}
      icon={<ListChecks size={ICON_SIZES.xs} />}
      label={label}
    />
  ) : null;

  return (
    <Box sx={stackSx}>
      <Box sx={inline ? lineSx : pillsSx}>
        {hasPills ? pills : (inline ? null : <TagChip label="— None" />)}
        {inline ? toggle : null}
        {inline ? <MarkerClearAction count={count} onClear={onClear} what={label.toLowerCase()} /> : null}
      </Box>

      {below}

      {children && !collapse ? <Box sx={bodySx}>{children}</Box> : null}

      {toggle ? (
        <Box>
          {inline ? null : toggle}
          <CollapsibleBody open={open}>
            <Box sx={[bodySx, { mt: 0.5 }]}>{children}</Box>
          </CollapsibleBody>
        </Box>
      ) : null}
    </Box>
  );
}

// "Clear them all": a small remove icon, there only while there is something
// to clear. `what` names the markers ("conditions"). A panel's header action,
// or the end of an inline marker line.
export function MarkerClearAction({ count, onClear, what }) {
  if (!onClear || !count) return null;
  return (
    <TipIconButton title={`Clear all ${what}`} danger size="small" onClick={onClear}>
      <Eraser size={ICON_SIZES.xs} />
    </TipIconButton>
  );
}

const stackSx = { display: 'flex', flexDirection: 'column', gap: 0.5, width: '100%', minWidth: 0 };

const pillsSx = { display: 'flex', flexWrap: 'wrap', gap: 0.25 };

const lineSx = { ...pillsSx, alignItems: 'center', minHeight: CONTROL_HEIGHTS.sm };

const bodySx = { display: 'flex', flexDirection: 'column', gap: 0.5 };
