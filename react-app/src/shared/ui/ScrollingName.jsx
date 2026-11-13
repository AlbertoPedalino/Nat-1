import { Typography } from '@mui/material';

// A card's name on one line (an action, a spell, an item). Where the card cuts
// it, the name scrolls sideways under a finger (or a trackpad), with no bar
// drawn, so the whole name can be read; it never moves on its own. `sx` and
// any other props style the name as a Typography (`variant`).
//
// Every card name kept to one line is this: a card name is never cut with an
// ellipsis (ONE_LINE_SX, noWrap), guarded in oneDefinition.test.js.
export default function ScrollingName({ children, sx, ...props }) {
  return <Typography {...props} sx={{ ...scrollingNameSx, ...sx }}>{children}</Typography>;
}

const scrollingNameSx = {
  minWidth: 0,
  whiteSpace: 'nowrap',
  overflowX: 'auto',
  overflowY: 'hidden',
  overscrollBehaviorX: 'contain',
  scrollbarWidth: 'none',
  '&::-webkit-scrollbar': { display: 'none' },
};
