import { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import CharacterSheet from '../charsheet/CharacterSheet.jsx';
import { getCloudCharacter } from '../../shared/cloud/cloudCharacters.js';

function charIdFromUrl() {
  return new URLSearchParams(window.location.search).get('id');
}

function editFromUrl() {
  return new URLSearchParams(window.location.search).get('edit') === '1';
}

export default function CampaignSheetView() {
  const [state, setState] = useState({ loading: true, error: '', char: null, owner: null, name: null });
  const charId = charIdFromUrl();
  const editable = editFromUrl();

  useEffect(() => {
    let alive = true;
    const id = charIdFromUrl();
    if (!id) { setState({ loading: false, error: 'No sheet id.', char: null }); return undefined; }
    getCloudCharacter(id)
      .then((row) => { if (alive) setState({ loading: false, error: '', char: row.data, owner: row.owner_username, name: row.name }); })
      .catch((e) => { if (alive) setState({ loading: false, error: e?.message || 'Failed to load sheet.', char: null }); });
    return () => { alive = false; };
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {state.loading ? (
        <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={24} /></Box>
      ) : state.error ? (
        <Typography sx={{ p: 4, color: '#de675f', textAlign: 'center' }}>{state.error}</Typography>
      ) : (
        <CharacterSheet externalChar={state.char} externalCharId={charId} readOnly={!editable} />
      )}
    </Box>
  );
}
