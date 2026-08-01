import { Box, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import CloudMenu from '../shared/cloud/CloudMenu.jsx';

export const APP_TOP_BAR_HEIGHT = '48px';

export default function AppTopBar({ sx, children, home = false, backTo, backLabel = 'Back' }) {
  return (
    <Box sx={{ ...appTopBarSx, ...sx }}>
      {home || backTo ? (
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
              sx={navBtnSx}
            >
              <Box component="span" sx={navTextSx}>HOME</Box>
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
              sx={navBtnSx}
            >
              <Box component="span" sx={navTextSx}>{backLabel}</Box>
            </Button>
          ) : null}
        </Box>
      ) : null}
      {children}
      <CloudMenu />
    </Box>
  );
}

const leftActionsSx = {
  mr: 'auto',
  display: 'flex',
  gap: '0.5rem',
  minWidth: 0,
};

const navBtnSx = {
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.625rem',
  letterSpacing: '0.08em',
  whiteSpace: 'nowrap',
  minWidth: { xs: 32, sm: 64 },
  px: { xs: 0.75, sm: 1.25 },
  '& .MuiButton-startIcon': {
    mr: { xs: 0, sm: 1 },
    ml: 0,
  },
};

const navTextSx = {
  display: { xs: 'none', sm: 'inline' },
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
  bgcolor: 'rgba(15,14,13,0.95)',
  borderBottom: '1px solid rgba(180,150,90,0.22)',
  backdropFilter: 'blur(6px)',
};
