import {
  Autocomplete, Box, Button, IconButton, Paper, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import { useMemo } from 'react';
import { Minus, Plus, Save, Swords, Trash2 } from 'lucide-react';
import { useToast } from '../../../shared/ToastProvider.jsx';
import { calculateDifficulty } from '../logic/difficulty.js';
import { listQuestNames } from '../logic/library.js';
import { formatNumber } from '../logic/monsterUtils.js';
import { useEncounterBuilder } from '../state/EncounterBuilderContext.jsx';
import DifficultyBar from './DifficultyBar.jsx';

export default function EncounterList() {
  const { state, dispatch, instanceSaved, saveEncounterToLibrary } = useEncounterBuilder();
  const { notify } = useToast();
  const difficulty = calculateDifficulty(state.encounter, state.party);
  const questOptions = useMemo(() => listQuestNames(state.library), [state.library]);

  const handleSave = () => {
    if (!instanceSaved) {
      notify('warning', 'Save this encounter-builder instance before saving library entries.');
      return;
    }
    const entry = saveEncounterToLibrary(state.encounterName);
    if (entry) notify('success', `"${entry.name}" saved to Library.`);
  };

  const handleLaunch = () => {
    if (!state.encounter.length) return;
    dispatch({ type: 'launchCurrentEncounter' });
  };

  return (
    <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
      <Stack spacing={2}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="h2">Encounter</Typography>
          <Typography variant="body2" color="text.secondary">{formatNumber(difficulty.totalXp)} XP</Typography>
        </Stack>
        <TextField
          size="small"
          label="Library name"
          value={state.encounterName}
          onChange={(event) => dispatch({ type: 'setEncounterName', value: event.target.value })}
          placeholder="Optional"
        />
        <Autocomplete
          freeSolo
          size="small"
          options={questOptions}
          value={state.encounterQuest || null}
          inputValue={state.encounterQuest || ''}
          onChange={(_, value) => dispatch({ type: 'setEncounterQuest', quest: value || '' })}
          onInputChange={(_, value) => dispatch({ type: 'setEncounterQuest', quest: value })}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Quest category"
              placeholder="Type a new quest or select an existing one"
              helperText="Used only to group encounters in this Library."
            />
          )}
        />
        <Stack spacing={0.75}>
          {state.encounter.length ? state.encounter.map((item) => (
            <Box key={item.id} sx={rowSx}>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography fontWeight={700} noWrap>{item.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {item.source} · CR {item.cr}
                </Typography>
              </Box>
              <Typography variant="body2" color="primary.main" sx={{ minWidth: 90, textAlign: 'right' }}>
                {formatNumber(item.xp * item.qty)} XP
              </Typography>
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                <Tooltip title="Decrease quantity">
                  <IconButton size="small" onClick={() => dispatch({ type: 'changeMonsterQty', id: item.id, delta: -1 })}>
                    <Minus size={15} />
                  </IconButton>
                </Tooltip>
                <Typography sx={{ minWidth: 24, textAlign: 'center', fontWeight: 700 }}>{item.qty}</Typography>
                <Tooltip title="Increase quantity">
                  <IconButton size="small" onClick={() => dispatch({ type: 'changeMonsterQty', id: item.id, delta: 1 })}>
                    <Plus size={15} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Remove">
                  <IconButton size="small" color="error" onClick={() => dispatch({ type: 'removeEncounterItem', id: item.id })}>
                    <Trash2 size={15} />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
          )) : (
            <Typography color="text.secondary" sx={{ py: 2 }}>Add monsters from the bestiary list.</Typography>
          )}
        </Stack>
        <DifficultyBar encounter={state.encounter} party={state.party} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button
            variant="contained"
            startIcon={<Swords size={16} />}
            onClick={handleLaunch}
            disabled={!state.encounter.length || state.encounter.some((item) => !item.monsterData)}
            fullWidth
          >
            Launch
          </Button>
          <Button
            variant="outlined"
            startIcon={<Save size={16} />}
            onClick={handleSave}
            disabled={!state.encounter.length}
            fullWidth
          >
            Save to Library
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

const rowSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  p: 1,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
  bgcolor: 'rgba(255,255,255,0.025)',
  minWidth: 0,
};
