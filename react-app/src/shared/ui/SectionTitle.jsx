import { Box, Stack, Typography } from '@mui/material';
import InfoHint from './InfoHint.jsx';
import { captionLabelSx } from './PanelHeader.jsx';
import { ICON_SIZES } from './iconSizes.js';
import { UI_COLORS } from './colors.js';
import { ORNAMENT } from './shapes.js';
import { ornamentSx } from './ornament.js';
import { asArray } from '../lists.js';

// The heading of a group of controls or facts inside a panel, a dialog or a
// menu: a piece's Conditions and Reminders, the scene panel's Battlemap and
// Wind, the sheet's Armor and Weapons, a dialog's "Or generate one". The one
// section heading of the app: the ornament's diamond before it (ORNAMENT, as
// on a card's rule and before every listed rule), or `icon` (a lucide
// component) in its place, its words, then an ink rule to the edge.
//
// `hint` puts an InfoHint after it for the rule only met the first time,
// named `hintLabel`, or "About the <heading>" when the heading is plain text.
// Behind an icon rather than in a caption: over a map every line of prose is
// a line of map. `id` names it for the group it heads (aria-labelledby);
// `component` makes it a heading of the page's outline (an h2).
// `sx` places it (a margin).
export default function SectionTitle({ children, icon: Icon, hint, hintLabel, id, component, sx }) {
  const aboutLabel = hintLabel ?? (typeof children === 'string' ? `About the ${children.toLowerCase()}` : undefined);
  return (
    <Stack direction="row" spacing={0.75} sx={[ROW_SX, ...asArray(sx)]}>
      {Icon ? <Icon size={ICON_SIZES.xs} aria-hidden /> : <Box component="span" aria-hidden sx={DIAMOND_SX} />}
      <Typography id={id} component={component} sx={captionLabelSx}>{children}</Typography>
      {hint ? <InfoHint label={aboutLabel} text={hint} /> : null}
      <Box component="span" aria-hidden sx={RULE_SX} />
    </Stack>
  );
}

const ROW_SX = { alignItems: 'center', minWidth: 0 };

const DIAMOND_SX = ornamentSx(ORNAMENT.size - 2);

const RULE_SX = { flex: 1, minWidth: 12, height: 2, bgcolor: UI_COLORS.edge };
