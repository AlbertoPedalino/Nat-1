import { Box } from '@mui/material';
import CloudMenu from '../shared/cloud/CloudMenu.jsx';

export const APP_TOP_BAR_HEIGHT = '48px';

export default function AppTopBar({ sx }) {
  return (
    <Box sx={{ ...appTopBarSx, ...sx }}>
      <CloudMenu />
    </Box>
  );
}

const appTopBarSx = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 1300,
  minHeight: APP_TOP_BAR_HEIGHT,
  boxSizing: 'border-box',
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
  px: { xs: '0.75rem', md: '1rem' },
  py: '0.5rem',
  bgcolor: 'rgba(15,14,13,0.95)',
  borderBottom: '1px solid rgba(180,150,90,0.22)',
  backdropFilter: 'blur(6px)',
};
