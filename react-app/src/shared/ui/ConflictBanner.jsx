import { Alert, Button, Stack } from '@mui/material';

// The one look of "two copies disagree, pick one": a warning with the message
// and, when a choice is possible, the side to take (`keepRemote`) and the side
// to keep (`keepLocal`), each { label, onClick }.
export default function ConflictBanner({ children, keepRemote = null, keepLocal = null, busy = false, sx = null }) {
  const choices = keepRemote && keepLocal;
  return (
    <Alert
      severity="warning"
      sx={{ mb: 1, alignItems: 'center', ...sx }}
      action={choices ? (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button size="small" variant="contained" disabled={busy} onClick={keepRemote.onClick}>{keepRemote.label}</Button>
          <Button size="small" variant="outlined" disabled={busy} onClick={keepLocal.onClick}>{keepLocal.label}</Button>
        </Stack>
      ) : null}
    >
      {children}
    </Alert>
  );
}
