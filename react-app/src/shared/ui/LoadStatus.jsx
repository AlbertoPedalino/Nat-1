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

// The one "could not" look: what went wrong, in an error alert. A load that
// failed, a save that was refused, a scene that could not be opened. A field
// that is filled in wrong says so under the field instead.
export function ErrorLine({ children, sx }) {
  return <Alert severity="error" sx={sx}>{children}</Alert>;
}

// What a panel shows while its data is on the way, or when it could not come:
// LoadingLine, or ErrorLine. Nothing once it is ready.
export default function LoadStatus({ status, loadingLabel = 'Loading…', errorMessage }) {
  if (status === 'loading' || status === 'idle') return <LoadingLine label={loadingLabel} sx={{ p: 2 }} />;
  if (status === 'error') return <ErrorLine sx={{ m: 1 }}>{errorMessage}</ErrorLine>;
  return null;
}

export function isLoadPending(status) {
  return status === 'loading' || status === 'idle' || status === 'error';
}

const rowSx = { alignItems: 'center' };
const centeredSx = { alignItems: 'center', justifyContent: 'center', py: 4 };
