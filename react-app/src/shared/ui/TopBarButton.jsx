import { Box, Button } from '@mui/material';
import { appTopBarButtonSx } from './appBar.js';
import { phoneHiddenLabelSx } from './iconOnlyOnPhone.js';
import { ICON_SIZES } from './iconSizes.js';
import { asArray } from '../lists.js';

// A button in the app's top bar (Home, Back, Links, Compendium): the bar's
// lettering, the icon always and the words only where there is room for
// them. On a phone only the icon is left, so the button keeps its name in
// `ariaLabel` (the `label` by default). `active` fills it, for a bar button
// whose panel is open or whose tool is linked. `icon` is a lucide component;
// every other prop is the Button's (`component`/`to` for a link, `onClick`,
// `aria-pressed`…), and `sx` adds to the bar's look.
export default function TopBarButton({
  icon: Icon, label, ariaLabel = label, active = false, sx, ...buttonProps
}) {
  return (
    <Button
      size="small"
      variant={active ? 'contained' : 'outlined'}
      color="primary"
      aria-label={ariaLabel}
      startIcon={<Icon size={ICON_SIZES.sm} />}
      sx={[appTopBarButtonSx, ...asArray(sx)]}
      {...buttonProps}
    >
      <Box component="span" sx={phoneHiddenLabelSx}>{label}</Box>
    </Button>
  );
}
