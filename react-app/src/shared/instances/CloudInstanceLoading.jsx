import { Box, CircularProgress, Typography } from '@mui/material';

// Shown by a tool page while useToolInstance looks the instance up in the
// cloud; the editor is not mounted yet, so nothing can be seeded or saved.
export default function CloudInstanceLoading({ label }) {
  return (
    <Box role="status" sx={rootSx}>
      <CircularProgress size={24} />
      <Typography variant="body2" color="text.secondary">
        {label ? `Loading ${label}…` : 'Loading…'}
      </Typography>
    </Box>
  );
}

const rootSx = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 1.5,
  bgcolor: 'background.default',
};
