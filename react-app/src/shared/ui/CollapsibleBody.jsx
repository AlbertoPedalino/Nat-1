import { Collapse } from '@mui/material';
import { asArray } from '../lists.js';

// Smooth height-animated expand/collapse for sheet cards
// (Senses, Actions, Spells, Inventory) and every other disclosure (a
// combatant's HP modifiers, its marker rows, a panel that folds away). Single
// source for the expand behavior so timing/easing stays consistent across the
// app — tweak here, not in every tab. `unmountOnExit` keeps the (often heavy)
// body out of the DOM while collapsed.
//
// A fully collapsed Collapse still renders a zero-height box, which keeps
// earning a slot in the parent's flex gap. MUI tags that state with
// .MuiCollapse-hidden once the exit transition ends, so dropping the box out
// of layout there removes the phantom gap without costing the animation.
const HIDDEN_SX = Object.freeze({ '&.MuiCollapse-hidden': { display: 'none' } });

export default function CollapsibleBody({ open, children, sx, ...props }) {
  return (
    <Collapse in={open} unmountOnExit sx={[HIDDEN_SX, ...asArray(sx)]} {...props}>
      {children}
    </Collapse>
  );
}
