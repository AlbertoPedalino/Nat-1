import { Typography } from '@mui/material';

// A card's name on one line (an action, a spell, an item). Where the card cuts
// it, the name scrolls sideways under a finger (or a trackpad), with no bar
// drawn, so the whole name can be read; it never moves on its own. `sx` styles
// the name as a Typography.
export default function ScrollingName({ children, sx }) {
  return <Typography sx={{ ...scrollingNameSx, ...sx }}>{children}</Typography>;
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
