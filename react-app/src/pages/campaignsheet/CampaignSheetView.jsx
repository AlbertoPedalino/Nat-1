import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import { ArrowLeft, Eye } from 'lucide-react';
import CharacterSheet from '../charsheet/CharacterSheet.jsx';
import { getCloudCharacter } from '../../shared/cloud/cloudCharacters.js';

function charIdFromUrl() {
  return new URLSearchParams(window.location.search).get('id');
}

export default function CampaignSheetView() {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: '', char: null, owner: null, name: null });

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
      <Box sx={headerSx}>
        <Button size="small" variant="outlined" startIcon={<ArrowLeft size={14} />} onClick={() => navigate('/campaigns')} sx={btnSx}>
          Back
        </Button>
        <Eye size={15} color="#c8a84b" />
        <Typography sx={labelSx}>
          Read-only{state.name ? ` · ${state.name}` : ''}{state.owner ? ` · ${state.owner}` : ''}
        </Typography>
      </Box>

      {state.loading ? (
        <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={24} /></Box>
      ) : state.error ? (
        <Typography sx={{ p: 4, color: '#de675f', textAlign: 'center' }}>{state.error}</Typography>
      ) : (
        <CharacterSheet externalChar={state.char} readOnly />
      )}
    </Box>
  );
}

const headerSx = {
  position: 'sticky', top: 0, zIndex: 1200,
  display: 'flex', alignItems: 'center', gap: 1,
  px: { xs: 1, md: 2 }, py: 0.75,
  bgcolor: 'rgba(15,14,13,0.96)',
  borderBottom: '1px solid rgba(180,150,90,0.3)',
  backdropFilter: 'blur(6px)',
};
const btnSx = { fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.6rem', letterSpacing: '0.06em' };
const labelSx = { fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.72rem', color: '#e8c96a', letterSpacing: '0.04em' };
