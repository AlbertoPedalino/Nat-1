import ConflictBanner from './ConflictBanner.jsx';

// A whole-sheet save was refused because the cloud copy moved on (SHEET_CONFLICT):
// nothing was overwritten, and the user decides — take the cloud version, or
// keep the local changes (an explicit save over that version). Shared by the
// character sheet and the character builder; no merge is ever attempted.
export default function SheetConflictBanner({ subject = 'sheet', onLoadRemote, onKeepLocal, sx = null }) {
  return (
    <ConflictBanner
      sx={sx}
      keepRemote={{ label: 'Load updated version', onClick: onLoadRemote }}
      keepLocal={{ label: 'Keep my changes', onClick: onKeepLocal }}
    >
      This {subject} was updated elsewhere. Your latest changes were not saved over it.
    </ConflictBanner>
  );
}
