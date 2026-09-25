import { Alert, Button, Stack } from '@mui/material';

// A whole-sheet save was refused because the cloud copy moved on (SHEET_CONFLICT):
// nothing was overwritten, and the user decides — take the cloud version, or
// keep the local changes (an explicit save over that version). Shared by the
// character sheet and the character builder; no merge is ever attempted.
export default function SheetConflictBanner({ subject = 'sheet', onLoadRemote, onKeepLocal, sx = null }) {
  return (
    <Alert
      severity="warning"
      sx={{ mb: 1, alignItems: 'center', ...sx }}
      action={(
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button size="small" variant="contained" onClick={onLoadRemote}>Load updated version</Button>
          <Button size="small" variant="outlined" onClick={onKeepLocal}>Keep my changes</Button>
        </Stack>
      )}
    >
      This {subject} was updated elsewhere. Your latest changes were not saved over it.
    </Alert>
  );
}
