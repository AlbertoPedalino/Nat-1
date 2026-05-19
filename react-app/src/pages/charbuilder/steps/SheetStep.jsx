import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { ClipboardList, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BuilderPanel from '../components/BuilderPanel.jsx';
import { saveCharacter } from '../logic/persistence.js';
import { getActiveCharId } from '../../../shared/character/store.js';

export default function SheetStep({ state, dispatch }) {
  const navigate = useNavigate();
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
              {ready ? 'Save the character and open the sheet.' : 'The character is missing minimum data.'}
            </Typography>
          </Box>
          <Button
            variant="contained"
            disabled={!ready}
            startIcon={<FileText size={16} />}
            onClick={() => {
              const saved = saveCharacter(character, state.data);
              const charId = saved?.id || getActiveCharId();
              navigate(charId ? `/charsheet?char=${encodeURIComponent(charId)}` : '/charsheet');
            }}
            sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}
          >
            Open sheet
          </Button>
        </Box>
      </Stack>
    </BuilderPanel>
  );
}
