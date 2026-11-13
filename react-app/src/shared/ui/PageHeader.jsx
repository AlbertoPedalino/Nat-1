import { Box, Typography } from '@mui/material';
import { UI_COLORS } from './colors.js';
import { TEXT_STYLES } from './textStyles.js';
import { bannerSx } from './PanelHeader.jsx';
import { asArray } from '../lists.js';

// The header a page opens on, under the app's top bar (Campaigns, a tool's
// saved list, a saved tool): its icon (a lucide component) in `iconColor`,
// its title as the page's one h1, an optional `subtitle` under the title (a
// saved tool's id) and its `actions` (New, the tool's own buttons) at the
// end, wrapping under the title where the line is too short for them.
// Every page header is drawn here, so a restyle reaches them all; `sx` is
// for placement only.
export default function PageHeader({
  icon, iconColor = 'primary.main', title, subtitle = null, actions = null, sx,
}) {
  return (
    <Box sx={[headerSx, ...asArray(sx)]}>
      {icon ? <Box component={icon} size={PAGE_ICON_SIZE} strokeWidth={1.5} aria-hidden sx={{ color: iconColor, flexShrink: 0 }} /> : null}
      <Box sx={titleBlockSx}>
        <Box sx={bannerSx()}>
          <Typography component="h1" sx={titleSx}>{title}</Typography>
        </Box>
        {subtitle ? <Typography variant="body2" sx={{ color: 'text.secondary' }}>{subtitle}</Typography> : null}
      </Box>
      {actions ? <Box sx={actionsSx}>{actions}</Box> : null}
    </Box>
  );
}

// The page icon is a heading's size, larger than any icon of the UI scale.
const PAGE_ICON_SIZE = 30;

const headerSx = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  columnGap: 1.5,
  rowGap: 1,
  mb: 2.5,
};

const titleBlockSx = { flex: '1 1 160px', minWidth: 0 };

// Lettered like a panel's title, in the heading's blackletter, on a banner
// cut in the panels' swallowtail.
const titleSx = {
  ...TEXT_STYLES.heading,
  fontSize: 'clamp(1.3rem, 4vw, 1.7rem)',
  color: UI_COLORS.accentText,
  overflowWrap: 'anywhere',
};

const actionsSx = { minWidth: 0, maxWidth: '100%' };
