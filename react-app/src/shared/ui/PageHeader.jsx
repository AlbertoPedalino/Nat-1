import { Box, Typography } from '@mui/material';
import { UI_COLORS } from './colors.js';
import { INK_EDGE } from './shadows.js';
import { TEXT_STYLES } from './textStyles.js';
import { asArray } from '../lists.js';
import { ornamentOnRuleSx } from './ornament.js';

// The header a page opens on, under the app's top bar (Campaigns, a tool's
// saved list, a saved tool): the mark of its `tool` (a TOOL_CATALOG entry:
// its icon in its colour, as on the home's card), its title as the page's one
// h1, an optional `subtitle` under the title (a saved tool's id) and its
// `actions` (New, the tool's own buttons) at the end, wrapping under the title
// where the line is too short for them. Under it all an ink rule with the
// ornament on its middle, as on a card's rule.
// Every page header is drawn here, so a restyle reaches them all; `sx` is
// for placement only.
export default function PageHeader({
  tool, title, subtitle = null, actions = null, sx,
}) {
  return (
    <Box sx={[headerSx, ...asArray(sx)]}>
      {tool ? <Box component={tool.icon} aria-hidden sx={{ ...pageIconSx, color: tool.color }} /> : null}
      <Box sx={titleBlockSx}>
        <Typography component="h1" sx={titleSx}>{title}</Typography>
        {subtitle ? <Typography variant="body2" sx={{ color: 'text.secondary' }}>{subtitle}</Typography> : null}
      </Box>
      {actions ? <Box sx={actionsSx}>{actions}</Box> : null}
      <Box aria-hidden sx={ruleSx} />
    </Box>
  );
}

const ruleSx = { flexBasis: '100%', mt: 0.75, borderTop: INK_EDGE, ...ornamentOnRuleSx() };

// The page icon stands beside the title larger than the title's letters: a
// game drawing is detailed, and at a heading's size its shape is lost.
const pageIconSx = {
  width: { xs: 44, md: 56 },
  height: { xs: 44, md: 56 },
  flexShrink: 0,
};

const headerSx = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  columnGap: 1.5,
  rowGap: 1,
  mb: 2.5,
};

const titleBlockSx = { flex: '1 1 160px', minWidth: 0 };

// Lettered like a panel's title, in the heading's blackletter.
const titleSx = {
  ...TEXT_STYLES.heading,
  fontSize: 'clamp(1.3rem, 4vw, 1.7rem)',
  color: UI_COLORS.accentText,
  overflowWrap: 'anywhere',
};

const actionsSx = { minWidth: 0, maxWidth: '100%' };
