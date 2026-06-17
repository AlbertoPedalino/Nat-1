import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { ClipboardList, CloudUpload, Download, FileText, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BuilderPanel from '../components/BuilderPanel.jsx';
import { makeSheetPayload, saveCharacter } from '../logic/persistence.js';
import { createCharacterExport } from '../logic/characterExport.js';
import { getActiveCharId } from '../../../shared/character/store.js';
import { useAuth } from '../../../shared/cloud/AuthProvider.jsx';

function charIdFromUrl() {
  const id = new URLSearchParams(window.location.search).get('char');
  return id && id !== 'new' ? id : null;
}

function downloadBuilderSheet(character, data) {
  const payload = createCharacterExport(makeSheetPayload(character, data));
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${character?.name || 'character'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SheetStep({ state, dispatch, importDraft = false, onUploadToCloud, onDraftLocalSaved, onNotify }) {
  const navigate = useNavigate();
  const { cloudEnabled, status } = useAuth();
  const cloudActive = cloudEnabled && status === 'authed';
  const { character } = state;
  const required = [
    ['name', 'Name'],
    ['className', 'Class'],
    ['speciesName', 'Species'],
    ['backgroundName', 'Background'],
  ];
  const missing = required.filter(([key]) => !character?.[key]).map(([, label]) => label);
  const ready = missing.length === 0;

  return (
    <BuilderPanel id="panel-sheet" title="Sheet" icon={ClipboardList}>
      <Stack spacing={1.5} sx={{ py: 1.5 }}>
        {!ready ? (
          <Alert severity="warning">Complete first: {missing.join(', ')}.</Alert>
        ) : null}

        <Box
          sx={{
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: 'rgba(26,23,19,0.66)',
            px: 1.4,
            py: 1.25,
            display: 'flex',
            alignItems: { xs: 'stretch', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h2" sx={{ color: ready ? 'primary.main' : 'text.secondary' }}>
              {ready ? 'Character sheet ready' : 'Character sheet not ready'}
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: '0.72rem', mt: 0.35 }}>
              {ready
                ? 'Download JSON without local storage, save a local copy, or open the local sheet.'
                : 'The character is missing minimum data.'}
            </Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.65} sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}>
            <Button
              variant="outlined"
              disabled={!ready}
              startIcon={<Download size={16} />}
              onClick={() => downloadBuilderSheet(character, state.data)}
            >
              Download JSON
            </Button>
            <Button
              variant="outlined"
              disabled={!ready}
              startIcon={<Save size={16} />}
              onClick={() => {
                // Explicit local copy. For a normal cloud-backed char pin it to the
                // server id; for an imported draft save a fresh local row and keep
                // it local-only (the parent excludes it from cloud sync).
                const saved = saveCharacter(character, state.data, (cloudActive && !importDraft) ? { id: charIdFromUrl() } : {});
                if (saved?.id) {
                  if (importDraft) onDraftLocalSaved?.(saved.id);
                  onNotify?.('success', 'Saved locally.');
                }
              }}
            >
              Save local
            </Button>
            <Button
              variant="outlined"
              disabled={!ready || !cloudActive}
              startIcon={<CloudUpload size={16} />}
              onClick={() => onUploadToCloud?.()}
            >
              Upload to cloud
            </Button>
            <Button
              variant="contained"
              disabled={!ready}
              startIcon={<FileText size={16} />}
              onClick={async () => {
                if (cloudActive) {
                  // Open the cloud-backed sheet. A draft (or any not-yet-saved char)
                  // is uploaded first so there is a server row to open.
                  let id = importDraft ? null : charIdFromUrl();
                  if (!id) id = await onUploadToCloud?.();
                  if (id) navigate(`/campaign-sheet?id=${encodeURIComponent(id)}&edit=1`);
                  return;
                }
                const saved = saveCharacter(character, state.data);
                if (saved?.id && importDraft) onDraftLocalSaved?.(saved.id);
                const charId = saved?.id || getActiveCharId();
                navigate(charId ? `/charsheet?char=${encodeURIComponent(charId)}` : '/charsheet');
              }}
            >
              Open sheet
            </Button>
          </Stack>
        </Box>
      </Stack>
    </BuilderPanel>
  );
}
