import { Box, Button } from '@mui/material';
import { LAYERS } from '../../shared/ui/layers.js';
import { Link as RouterLink } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import CloudMenu from '../../shared/cloud/auth/CloudMenu.jsx';
import CompendiumButton from '../../pages/compendium/CompendiumButton.jsx';
import { phoneHiddenLabelSx } from '../../shared/ui/iconOnlyOnPhone.js';
import { UI_COLORS } from '../../shared/ui/colors.js';
import { panelBarSx, panelScreentone } from '../../shared/ui/PanelHeader.jsx';
import { UI_SHADOWS } from '../../shared/ui/shadows.js';
import { APP_TOP_BAR_HEIGHT, appTopBarButtonSx, appTopBarFontSx } from '../../shared/ui/appBar.js';
import { ICON_SIZES } from '../../shared/ui/iconSizes.js';

export { APP_TOP_BAR_HEIGHT };

// Every bar offers the compendium, except the compendium's own page. `start`
// adds page buttons next to Home/Back; `children` sit on the right, before
// the compendium and the cloud menu (which takes `cloudMenuProps`).
export default function AppTopBar({
  sx, children, home = false, backTo, backLabel = 'Back', compendium = true, start = null, cloudMenuProps = null,
}) {
  return (
    <Box sx={{ ...appTopBarSx, ...sx }}>
      {home || backTo || start ? (
        <Box sx={leftActionsSx}>
          {home ? (
            <Button
              component={RouterLink}
              to="/"
              size="small"
              variant="outlined"
              color="primary"
              aria-label="Home"
              startIcon={<Home size={ICON_SIZES.sm} />}
              sx={appTopBarButtonSx}
            >
              <Box component="span" sx={phoneHiddenLabelSx}>HOME</Box>
            </Button>
          ) : null}
          {backTo ? (
            <Button
              component={RouterLink}
              to={backTo}
              size="small"
              variant="outlined"
              color="primary"
              aria-label={`Back to ${backLabel}`}
              startIcon={<ArrowLeft size={ICON_SIZES.sm} />}
              sx={appTopBarButtonSx}
            >
              <Box component="span" sx={phoneHiddenLabelSx}>{backLabel}</Box>
            </Button>
          ) : null}
          {start}
        </Box>
      ) : null}
      {children}
      {compendium ? <CompendiumButton sx={appTopBarFontSx} /> : null}
      <CloudMenu {...cloudMenuProps} />
    </Box>
  );
}

const leftActionsSx = {
  mr: 'auto',
  display: 'flex',
  gap: '0.5rem',
  minWidth: 0,
};

// Drawn like a panel's bar: the header tint, the accent's screentone and a
// thick ink line under it, so every page opens on the same comic strip.
const appTopBarSx = {
  ...panelBarSx,
  backgroundImage: panelScreentone(UI_COLORS.accent),
  borderBottomWidth: 3,
  boxShadow: UI_SHADOWS.raised,
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: LAYERS.topBar,
  minHeight: APP_TOP_BAR_HEIGHT,
  boxSizing: 'border-box',
  display: 'flex',
  gap: '0.5rem',
  justifyContent: 'flex-end',
  alignItems: 'center',
  px: { xs: '0.75rem', md: '1rem' },
  py: '0.5rem',
};
