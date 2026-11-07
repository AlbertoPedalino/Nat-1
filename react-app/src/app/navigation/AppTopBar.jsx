import { Box, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import CloudMenu from '../../shared/cloud/auth/CloudMenu.jsx';
import CompendiumButton from '../../pages/compendium/CompendiumButton.jsx';
import { iconOnlyOnPhoneButtonSx, phoneHiddenLabelSx } from '../../shared/ui/iconOnlyOnPhone.js';
import { UI_COLORS, uiAlpha } from '../../shared/ui/colors.js';
import { UI_FONTS } from '../../shared/ui/fonts.js';

export const APP_TOP_BAR_HEIGHT = '48px';

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
              startIcon={<Home size={14} />}
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
              startIcon={<ArrowLeft size={14} />}
              sx={appTopBarButtonSx}
            >
              <Box component="span" sx={phoneHiddenLabelSx}>{backLabel}</Box>
            </Button>
          ) : null}
          {start}
        </Box>
      ) : null}
      {children}
      {compendium ? <CompendiumButton sx={navFontSx} /> : null}
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

const navFontSx = {
  fontFamily: UI_FONTS.display,
  fontSize: '0.625rem',
  letterSpacing: '0.08em',
  whiteSpace: 'nowrap',
};

export const appTopBarButtonSx = {
  ...navFontSx,
  ...iconOnlyOnPhoneButtonSx,
};

const appTopBarSx = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 1300,
  minHeight: APP_TOP_BAR_HEIGHT,
  boxSizing: 'border-box',
  display: 'flex',
  gap: '0.5rem',
  justifyContent: 'flex-end',
  alignItems: 'center',
  px: { xs: '0.75rem', md: '1rem' },
  py: '0.5rem',
  bgcolor: uiAlpha(UI_COLORS.inkDeep, 0.95),
  borderBottom: `1px solid ${uiAlpha(UI_COLORS.goldDim, 0.22)}`,
  backdropFilter: 'blur(6px)',
};
