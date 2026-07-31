import { Collapse } from '@mui/material';

// Smooth height-animated expand/collapse for sheet cards
// (Senses, Actions, Spells, Inventory). Single source for the
// expand behavior so timing/easing stays consistent across the
// sheet — tweak here, not in every tab. `unmountOnExit` keeps the
// (often heavy) body out of the DOM while collapsed.
export default function CollapsibleBody({ open, children, ...props }) {
  return (
    <Collapse in={open} unmountOnExit {...props}>
      {children}
    </Collapse>
  );
}
