import { Box } from '@mui/material';
import CharacterSheet from '../charsheet/CharacterSheet.jsx';
import { useCloudCharacterRow } from '../../shared/cloud/sync/useCloudCharacterRow.js';
import { LoadingLine } from '../../shared/ui/LoadStatus.jsx';
import { ErrorLine } from '../../shared/ui/LoadStatus.jsx';

function charIdFromUrl() {
  return new URLSearchParams(window.location.search).get('id');
}

function editFromUrl() {
  return new URLSearchParams(window.location.search).get('edit') === '1';
}

// A cloud sheet, by id, read once. The sheet then follows the character itself:
// vitals through the character digest — its parent's (`liveDigest`, e.g. the
// battle map roster) or its own — and content through the sheet revision,
// handing back a newer row here (`onSheetRow`) when the content changed. The
// same for editable and read-only views; only an editable one ever writes.
export default function CampaignSheetView({
  sheetId = null,
  editable = null,
  embedded = false,
  onRoll = null,
  showOwnRollToast = true,
  liveDigest,
} = {}) {
  const charId = sheetId || charIdFromUrl();
  const canEdit = editable ?? editFromUrl();
  const { row, loading, error, replaceRow, markDeleted } = useCloudCharacterRow(charId);

  return (
    <Box sx={{ minHeight: embedded ? 'auto' : '100vh', bgcolor: embedded ? 'transparent' : 'background.default' }}>
      {loading ? (
        <LoadingLine centered label="Loading sheet…" />
      ) : !row ? (
        <ErrorLine sx={{ m: 4 }}>{error}</ErrorLine>
      ) : (
        <CharacterSheet
          externalChar={row.data}
          externalCharId={charId}
          externalSheetRevision={row.sheet_revision ?? -1}
          onSheetRow={replaceRow}
          onSheetDeleted={markDeleted}
          readOnly={!canEdit}
          embedded={embedded}
          onRoll={onRoll}
          showOwnRollToast={showOwnRollToast}
          liveDigest={liveDigest}
        />
      )}
    </Box>
  );
}
