import { Alert, CircularProgress, Stack, Typography } from '@mui/material';

// What a panel shows while its data is on the way, or when it could not come:
// a small spinner with a label, or an error alert. Nothing once it is ready.
export default function LoadStatus({ status, loadingLabel = 'Loading…', errorMessage }) {
  if (status === 'loading' || status === 'idle') {
    return (
      <Stack direction="row" spacing={1} sx={{ p: 2, alignItems: 'center' }}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">{loadingLabel}</Typography>
      </Stack>
    );
  }
  if (status === 'error') {
    return <Alert severity="error" sx={{ m: 1 }}>{errorMessage}</Alert>;
  }
  return null;
}

export function isLoadPending(status) {
  return status === 'loading' || status === 'idle' || status === 'error';
}
