import { useCallback, useEffect, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import CharacterSheet from '../charsheet/CharacterSheet.jsx';
import { getCloudCharacter } from '../../shared/cloud/cloudCharacters.js';
import { useCloudCharacterLive } from '../../shared/cloud/useCloudCharacterLive.js';
import { pickCharacterVitals } from '../../shared/character/vitals.js';

function charIdFromUrl() {
  return new URLSearchParams(window.location.search).get('id');
}

function editFromUrl() {
  return new URLSearchParams(window.location.search).get('edit') === '1';
}

function rowTime(updatedAt) {
  if (!updatedAt) return null;
  const time = Date.parse(updatedAt);
  return Number.isFinite(time) ? time : null;
}

function rowIsOlder(row, currentUpdatedAt) {
  const nextTime = rowTime(row?.updated_at);
  const currentTime = rowTime(currentUpdatedAt);
  return nextTime != null && currentTime != null && nextTime < currentTime;
}

function sheetStateFromRow(row, prev = {}) {
  if (!row?.data || typeof row.data !== 'object') return prev;
  return {
    loading: false,
    error: '',
    char: row.data,
    owner: row.owner_username || row.owner || null,
    name: row.name || row.data.name || null,
    updatedAt: row.updated_at || null,
  };
}

export default function CampaignSheetView({
  sheetId = null,
  editable = null,
  embedded = false,
  onRoll = null,
  showOwnRollToast = true,
} = {}) {
  const [state, setState] = useState({ loading: true, error: '', char: null, owner: null, name: null, updatedAt: null });
  const [liveVitals, setLiveVitals] = useState(null);
  const charId = sheetId || charIdFromUrl();
  const canEdit = editable ?? editFromUrl();

  const applyCloudRow = useCallback((row) => {
    if (row?.id && charId && String(row.id) !== String(charId)) return;
    if (canEdit) {
      // Editable sheet keeps local draft state + full-sheet autosave. Push ONLY
      // the synced vitals; CharacterSheet merges them without touching the user's
      // in-progress edits to other fields.
      const data = row?.data;
      if (!data || typeof data !== 'object') return;
      setLiveVitals({ ...pickCharacterVitals(data), receivedAt: row.updated_at || Date.now() });
      return;
    }
    setState((prev) => {
      if (rowIsOlder(row, prev.updatedAt)) return prev;
      return sheetStateFromRow(row, prev);
    });
  }, [charId, canEdit]);

  useCloudCharacterLive({ charId, enabled: true, onUpdate: applyCloudRow });

  useEffect(() => {
    let alive = true;
    const id = charId;
    setLiveVitals(null);
    if (!id) {
      setState({ loading: false, error: 'No sheet id.', char: null, owner: null, name: null, updatedAt: null });
      return undefined;
    }
    setState({ loading: true, error: '', char: null, owner: null, name: null, updatedAt: null });
    getCloudCharacter(id)
      .then((row) => {
        if (!alive) return;
        setState((prev) => {
          if (rowIsOlder(row, prev.updatedAt)) return { ...prev, loading: false, error: '' };
          return sheetStateFromRow(row, prev);
        });
      })
      .catch((e) => {
        if (alive) {
          setState((prev) => (
            prev.char
              ? { ...prev, loading: false }
              : { loading: false, error: e?.message || 'Failed to load sheet.', char: null, owner: null, name: null, updatedAt: null }
          ));
        }
      });
    return () => { alive = false; };
  }, [charId]);

  return (
    <Box sx={{ minHeight: embedded ? 'auto' : '100vh', bgcolor: embedded ? 'transparent' : 'background.default' }}>
      {state.loading ? (
        <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={24} /></Box>
      ) : state.error ? (
        <Typography sx={{ p: 4, color: '#de675f', textAlign: 'center' }}>{state.error}</Typography>
      ) : (
        <CharacterSheet
          externalChar={state.char}
          externalCharId={charId}
          readOnly={!canEdit}
          embedded={embedded}
          liveVitals={canEdit ? liveVitals : null}
          onRoll={onRoll}
          showOwnRollToast={showOwnRollToast}
        />
      )}
    </Box>
  );
}
