import { useState } from 'react';
import { Alert, Button, Stack } from '@mui/material';

const MESSAGES = {
  exists: 'An instance with this id already exists in the cloud, and this copy was made separately.',
  version: 'This instance changed in the cloud while this copy had unsynced changes.',
  unverified: 'This copy and the cloud copy differ, and it is not known which one is newer.',
};

// Shown by a tool page while its instance is in conflict. Nothing is synced
// until the user picks a side; local editing keeps working meanwhile.
export default function InstanceConflictBanner({ tool }) {
  const [busy, setBusy] = useState(false);
  if (!tool?.conflict) return null;
  const choose = async (choice) => {
    setBusy(true);
    try { await tool.resolveConflict(choice); } finally { setBusy(false); }
  };
  return (
    <Alert
      severity="warning"
      action={tool.online ? (
        <Stack direction="row" spacing={1}>
          <Button size="small" color="inherit" disabled={busy} onClick={() => choose('cloud')}>Use cloud copy</Button>
          <Button size="small" color="inherit" disabled={busy} onClick={() => choose('local')}>Keep this copy</Button>
        </Stack>
      ) : null}
    >
      {MESSAGES[tool.conflict.reason] || MESSAGES.version}
      {tool.online ? ' Choose which copy to keep.' : ' Sign in to choose which copy to keep; this copy stays usable here.'}
    </Alert>
  );
}
