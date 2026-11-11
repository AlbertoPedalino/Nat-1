import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { ClipboardList, CloudUpload, Download, FileText, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BuilderPanel from '../layout/BuilderPanel.jsx';
import { makeSheetPayload, saveCharacter } from '../state/persistence.js';
import { downloadCharacterExport } from '../../../shared/character/profile/characterExport.js';
import { getActiveCharId } from '../../../shared/character/profile/store.js';
import { useAuth } from '../../../shared/cloud/auth/AuthProvider.jsx';
import { campaignSheetPath, characterIdFromUrl, characterSheetPath } from '../../../shared/character/profile/characterRoutes.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { SURFACES } from '../../../shared/ui/surfaces.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { cardTitleSx } from '../../../shared/ui/PanelHeader.jsx';

function charIdFromUrl() {
  const id = characterIdFromUrl();
  return id && id !== 'new' ? id : null;
}

function downloadBuilderSheet(character, data) {
  downloadCharacterExport(makeSheetPayload(character, data), character?.name);
}

export default function SheetStep({ state, dispatch, importDraft = false, onUploadToCloud, onDraftLocalSaved, onCloudCopySavedLocally, onNotify }) {
  const navigate = useNavigate();
  const { cloudActive } = useAuth();
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
            ...SURFACES.panel,
            px: 1.5,
            py: 1.25,
            display: 'flex',
            alignItems: { xs: 'stretch', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ ...cardTitleSx, color: ready ? 'primary.main' : 'text.secondary' }}>
              {ready ? 'Character sheet ready' : 'Character sheet not ready'}
            </Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: FONT_SIZES.md, mt: 0.25 }}>
              {ready
                ? 'Download JSON without local storage, save a local copy, or open the local sheet.'
                : 'The character is missing minimum data.'}
            </Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.75} sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}>
            <Button
              variant="outlined"
              disabled={!ready}
              startIcon={<Download size={ICON_SIZES.md} />}
              onClick={() => downloadBuilderSheet(character, state.data)}
            >
              Download JSON
            </Button>
            <Button
              variant="outlined"
              disabled={!ready}
              startIcon={<Save size={ICON_SIZES.md} />}
              onClick={() => {
                // Explicit local copy. For a normal cloud-backed char pin it to the
                // server id; for an imported draft save a fresh local row and keep
                // it local-only (the parent excludes it from cloud sync).
                const saved = saveCharacter(character, state.data, (cloudActive && !importDraft) ? { id: charIdFromUrl() } : {});
                if (saved?.id) {
                  if (importDraft) onDraftLocalSaved?.(saved.id);
                  // A local copy of the cloud character: its autosync push is
                  // conditional on the revision the builder holds.
                  else if (cloudActive) onCloudCopySavedLocally?.(saved.id);
                  onNotify?.('success', 'Saved locally.');
                }
              }}
            >
              Save local
            </Button>
            <Button
              variant="outlined"
              disabled={!ready || !cloudActive}
              startIcon={<CloudUpload size={ICON_SIZES.md} />}
              onClick={() => onUploadToCloud?.()}
            >
              Upload to cloud
            </Button>
            <Button
              variant="contained"
              disabled={!ready}
              startIcon={<FileText size={ICON_SIZES.md} />}
              onClick={async () => {
                if (cloudActive) {
                  // Open the cloud-backed sheet. A draft (or any not-yet-saved char)
                  // is uploaded first so there is a server row to open.
                  let id = importDraft ? null : charIdFromUrl();
                  if (!id) id = await onUploadToCloud?.();
                  if (id) navigate(campaignSheetPath(id, { edit: true }));
                  return;
                }
                const saved = saveCharacter(character, state.data);
                if (saved?.id && importDraft) onDraftLocalSaved?.(saved.id);
                const charId = saved?.id || getActiveCharId();
                navigate(characterSheetPath(charId));
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
