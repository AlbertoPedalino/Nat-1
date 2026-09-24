import { Box, Typography, CircularProgress } from '@mui/material';
import CharacterSheet from '../charsheet/CharacterSheet.jsx';
import { useCloudCharacterRow } from '../../shared/cloud/sync/useCloudCharacterRow.js';

function charIdFromUrl() {
  return new URLSearchParams(window.location.search).get('id');
}

function editFromUrl() {
  return new URLSearchParams(window.location.search).get('edit') === '1';
}

// A cloud sheet, by id. A read-only viewer follows the whole row live. An
// editable sheet reads it once: from then on it is the author of its own sheet
// and takes only vitals from others, through the character digest — its
// parent's (`liveDigest`, e.g. the battle map roster) or its own.
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
  const { row, loading, error } = useCloudCharacterRow(charId, { live: !canEdit });

  return (
    <Box sx={{ minHeight: embedded ? 'auto' : '100vh', bgcolor: embedded ? 'transparent' : 'background.default' }}>
      {loading ? (
        <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={24} /></Box>
      ) : !row ? (
        <Typography sx={{ p: 4, color: '#de675f', textAlign: 'center' }}>{error}</Typography>
      ) : (
        <CharacterSheet
          externalChar={row.data}
          externalCharId={charId}
          readOnly={!canEdit}
          embedded={embedded}
          onRoll={onRoll}
          showOwnRollToast={showOwnRollToast}
          liveDigest={canEdit ? liveDigest : undefined}
        />
      )}
    </Box>
  );
}
