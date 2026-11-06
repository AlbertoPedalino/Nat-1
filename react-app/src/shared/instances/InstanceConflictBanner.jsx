import { useState } from 'react';
import ConflictBanner from '../ui/ConflictBanner.jsx';

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
    <ConflictBanner
      busy={busy}
      sx={{ mb: 0 }}
      keepRemote={tool.online ? { label: 'Use cloud copy', onClick: () => choose('cloud') } : null}
      keepLocal={tool.online ? { label: 'Keep this copy', onClick: () => choose('local') } : null}
    >
      {MESSAGES[tool.conflict.reason] || MESSAGES.version}
      {tool.online ? ' Choose which copy to keep.' : ' Sign in to choose which copy to keep; this copy stays usable here.'}
    </ConflictBanner>
  );
}
