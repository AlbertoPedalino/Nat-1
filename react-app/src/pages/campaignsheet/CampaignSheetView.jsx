import AppPage from '../../app/navigation/AppPage.jsx';
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

  if (!loading && row) {
    return (
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
    );
  }
  // Until there is a sheet, its own page is still the app's page, bar and
  // all; embedded, the panel around it is the frame.
  const status = loading
    ? <LoadingLine centered label="Loading sheet…" />
    : <ErrorLine sx={embedded ? { m: 4 } : undefined}>{error}</ErrorLine>;
  return embedded ? status : <AppPage topBar={{ home: true }}>{status}</AppPage>;
}
