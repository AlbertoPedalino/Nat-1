import { Box, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { Home } from 'lucide-react';
import CloudMenu from '../shared/cloud/CloudMenu.jsx';

export const APP_TOP_BAR_HEIGHT = '48px';

export default function AppTopBar({ sx, children, home = false }) {
  return (
    <Box sx={{ ...appTopBarSx, ...sx }}>
      {home ? (
        <Button
          component={RouterLink}
          to="/"
          size="small"
          variant="outlined"
          color="primary"
          startIcon={<Home size={14} />}
          sx={homeBtnSx}
        >
          HOME
        </Button>
      ) : null}
      {children}
      <CloudMenu />
    </Box>
  );
}

const homeBtnSx = {
  // Sticks the Home button to the left edge; children + CloudMenu stay right.
  mr: 'auto',
  fontFamily: '"Cinzel", Georgia, serif',
  fontSize: '0.625rem',
  letterSpacing: '0.08em',
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
