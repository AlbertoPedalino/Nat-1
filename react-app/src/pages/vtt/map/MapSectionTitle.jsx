import { Stack, Typography } from '@mui/material';
import InfoHint from '../../../shared/ui/InfoHint.jsx';
import { captionLabelSx } from '../../../shared/ui/PanelHeader.jsx';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';

// The heading of a group of controls or facts anywhere on the battle map: in a
// piece's menu (Conditions, Reminders, Death saves), in the scene panel
// (Battlemap, Lines, Wind), in the hexcrawl corner (Last hex visited) and in
// the hexcrawl settings (Calendar). The one map-side section heading, so they
// all change together.
//
// `children` is the heading's text; `icon` (a lucide component) leads it.
// `hint` puts an InfoHint after it for the rule only met the first time,
// named `hintLabel`, or "About the <heading>" when the heading is plain text.
// Behind an icon rather than in a caption: over a map every line of prose is
// a line of map. `sx` places it (a margin).
export default function MapSectionTitle({ children, icon: Icon, hint, hintLabel, sx }) {
  const aboutLabel = hintLabel ?? (typeof children === 'string' ? `About the ${children.toLowerCase()}` : undefined);
  return (
    <Stack direction="row" spacing={0.5} sx={[{ alignItems: 'center', minWidth: 0 }, sx]}>
      {Icon ? <Icon size={ICON_SIZES.xs} aria-hidden /> : null}
      <Typography sx={captionLabelSx}>{children}</Typography>
      {hint ? <InfoHint label={aboutLabel} text={hint} /> : null}
    </Stack>
  );
}
