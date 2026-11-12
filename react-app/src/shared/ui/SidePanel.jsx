import { Box, Divider, Paper } from '@mui/material';
import { panelFrameSx } from './PanelHeader.jsx';
import CornerCloseButton from './CornerCloseButton.jsx';
import { asArray } from '../lists.js';

// The panel beside a page's main column that shows the one thing picked in it
// (the encounter's stat block, a player combatant's sheet): the comic panel's
// ink frame, a `header` the content draws itself (a token or portrait, a name,
// a type line) with the corner X when it has `onClose` (`closeLabel` names it),
// a rule, and a body that scrolls on its own so the header stays in view.
// Every such panel is one, so the stat block and the sheet beside the fight
// read alike. `sx` places it on the page (sticky beside the roster).
const FRAME_SX = Object.freeze({ ...panelFrameSx, bgcolor: 'background.paper' });
const HEADER_SX = Object.freeze({ p: 2, position: 'relative' });
// Room on the right for the corner X, so a long name never runs under it.
const HEADER_CLOSE_SX = Object.freeze({ pr: 6 });
// The body scrolls inside the panel: under the app's bar and the panel's own
// header on a wide screen, a fixed height on a narrow one.
const BODY_SX = Object.freeze({ p: 2, overflow: 'auto', maxHeight: { xs: 520, lg: 'calc(100vh - 218px)' } });

export default function SidePanel({ header, onClose, closeLabel = 'Close', children, sx }) {
  return (
    <Paper variant="outlined" sx={[FRAME_SX, ...asArray(sx)]}>
      <Box sx={[HEADER_SX, onClose ? HEADER_CLOSE_SX : null]}>
        {header}
        {onClose ? <CornerCloseButton onClose={onClose} label={closeLabel} /> : null}
      </Box>
      <Divider />
      <Box sx={BODY_SX}>{children}</Box>
    </Paper>
  );
}
