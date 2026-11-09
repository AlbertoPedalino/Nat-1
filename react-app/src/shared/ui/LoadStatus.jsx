import { Alert, CircularProgress, Stack, Typography } from '@mui/material';

// The one "loading" look: a small spinner with what is on the way. In a row,
// or `centered` in the space a whole panel or page would take.
export function LoadingLine({ label = 'Loading…', centered = false, sx }) {
  return (
    <Stack
      role="status"
      direction={centered ? 'column' : 'row'}
      spacing={centered ? 1.5 : 1}
      sx={[centered ? centeredSx : rowSx, sx]}
    >
      <CircularProgress size={centered ? 24 : 16} />
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>{label}</Typography>
    </Stack>
  );
}

// What a panel shows while its data is on the way, or when it could not come:
// LoadingLine, or an error alert. Nothing once it is ready.
export default function LoadStatus({ status, loadingLabel = 'Loading…', errorMessage }) {
  if (status === 'loading' || status === 'idle') return <LoadingLine label={loadingLabel} sx={{ p: 2 }} />;
  if (status === 'error') {
    return <Alert severity="error" sx={{ m: 1 }}>{errorMessage}</Alert>;
  }
  return null;
}

export function isLoadPending(status) {
  return status === 'loading' || status === 'idle' || status === 'error';
}

const rowSx = { alignItems: 'center' };
const centeredSx = { alignItems: 'center', justifyContent: 'center', py: 4 };
