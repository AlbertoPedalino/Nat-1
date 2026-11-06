import { Alert, Button } from '@mui/material';
import { BUILDER_DATA_LABELS } from '../state/useBuilderData.js';

// Game data that failed to download leaves its step empty; say which and let
// the player try again instead of leaving a silent blank list.
export default function BuilderDataAlert({ errors, onRetry }) {
  const failed = Object.keys(errors || {}).filter((scope) => errors[scope]);
  if (!failed.length) return null;
  const names = failed.map((scope) => BUILDER_DATA_LABELS[scope] || scope).join(', ');
  return (
    <Alert
      severity="error"
      sx={{ mb: 1 }}
      action={<Button color="inherit" size="small" onClick={() => onRetry(failed)}>Retry</Button>}
    >
      Could not load {names}. Check the connection and retry.
    </Alert>
  );
}
