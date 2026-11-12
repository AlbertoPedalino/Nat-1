import { Autocomplete, Box, Button, IconButton, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { Plus, Save, SlidersHorizontal, Swords, Trash2 } from 'lucide-react';
import { useToast } from '../../../shared/ui/ToastProvider.jsx';
import { calculateDifficulty } from './difficulty.js';
import { listQuestNames } from '../../../shared/encounter/library.js';
import { formatNumber } from '../../../shared/ui/numberFormat.js';
import { useEncounterBuilder } from '../state/EncounterBuilderContext.jsx';
import DifficultyBar from './DifficultyBar.jsx';
import InitiativeLaunchDialog from './InitiativeLaunchDialog.jsx';
import CountStepper from '../../../shared/ui/CountStepper.jsx';
import { SURFACES } from '../../../shared/ui/surfaces.js';
import { FONT_WEIGHTS } from '../../../shared/ui/fonts.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { UI_COLORS } from '../../../shared/ui/colors.js';
import Panel from '../../../shared/ui/Panel.jsx';
import EmptyLine from '../../../shared/ui/EmptyLine.jsx';
import Caption from '../../../shared/ui/Caption.jsx';
import TipIconButton from '../../../shared/ui/TipIconButton.jsx';

export default function EncounterList() {
  const { state, dispatch, saveEncounterToLibrary } = useEncounterBuilder();
  const { notify } = useToast();
  const difficulty = calculateDifficulty(state.encounter, state.party);
  const questOptions = useMemo(() => listQuestNames(state.library), [state.library]);
  const editingExisting = state.library.some((entry) => entry.id === state.currentEncounterId);

  const handleSave = () => {
    const entry = saveEncounterToLibrary(state.encounterName);
    if (entry) notify('success', `"${entry.name}" ${editingExisting ? 'updated in' : 'saved to'} Library.`);
  };

  const [initiativeOpen, setInitiativeOpen] = useState(false);
  const cannotLaunch = !state.encounter.length || state.encounter.some((item) => !item.monsterData);

  const handleLaunch = (initiative) => {
    if (!state.encounter.length) return;
    dispatch({ type: 'launchCurrentEncounter', initiative });
  };

  return (
    <Panel
      icon={Swords}
      title="Encounter"
      action={(
        <Button
          size="small"
          variant="outlined"
          startIcon={<Plus size={ICON_SIZES.sm} />}
          onClick={() => dispatch({ type: 'newEncounter' })}
        >
          New Encounter
        </Button>
      )}
    >
      <Stack spacing={2}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>{formatNumber(difficulty.totalXp)} XP</Typography>
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
                <Typography noWrap sx={{ fontWeight: FONT_WEIGHTS.bold }}>{item.name}</Typography>
                <Caption>
                  {item.source} · CR {item.cr}
                </Caption>
              </Box>
              <Typography variant="body2" sx={{ color: 'primary.main', minWidth: 90, textAlign: 'right' }}>
                {formatNumber(item.xp * item.qty)} XP
              </Typography>
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                <CountStepper
                  value={item.qty}
                  size={24}
                  label="quantity"
                  onStep={(delta) => dispatch({ type: 'changeMonsterQty', id: item.id, delta })}
                />
                <TipIconButton title="Remove" size="small" color="error" onClick={() => dispatch({ type: 'removeEncounterItem', id: item.id })}>
                  <Trash2 size={ICON_SIZES.sm} />
                </TipIconButton>
              </Stack>
            </Box>
          )) : (
            <EmptyLine inList>Add monsters from the bestiary list.</EmptyLine>
          )}
        </Stack>
        <DifficultyBar encounter={state.encounter} party={state.party} />
        {/* Two rows: Launch keeps its initiative options beside it, and the
            panel is too narrow for three controls side by side. */}
        <Stack spacing={1}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'stretch' }}>
            <Button
              variant="contained"
              startIcon={<Swords size={ICON_SIZES.md} />}
              onClick={() => handleLaunch()}
              disabled={cannotLaunch}
              sx={{ flex: 1, minWidth: 0 }}
            >
              Launch
            </Button>
            <Tooltip title="Launch with initiative advantage / disadvantage">
              <Box component="span" sx={{ display: 'flex', flexShrink: 0 }}>
                <IconButton
                  aria-label="Launch with initiative options"
                  onClick={() => setInitiativeOpen(true)}
                  disabled={cannotLaunch}
                  sx={{ border: 2, borderColor: UI_COLORS.edge, borderRadius: 1, px: 1.25 }}
                >
                  <SlidersHorizontal size={ICON_SIZES.md} />
                </IconButton>
              </Box>
            </Tooltip>
          </Stack>
          <Button
            variant="outlined"
            startIcon={<Save size={ICON_SIZES.md} />}
            onClick={() => handleSave()}
            disabled={!state.encounter.length}
            fullWidth
          >
            {editingExisting ? 'Update in Library' : 'Save to Library'}
          </Button>
        </Stack>
        <Caption>
          Launch saves a new encounter in Library and starts combat.
        </Caption>
        <InitiativeLaunchDialog
          open={initiativeOpen}
          onClose={() => setInitiativeOpen(false)}
          encounter={state.encounter}
          players={state.players}
          onLaunch={(initiative) => {
            setInitiativeOpen(false);
            handleLaunch(initiative);
          }}
        />
      </Stack>
    </Panel>
  );
}

const rowSx = {
  ...SURFACES.wash,
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  p: 1,
  minWidth: 0,
};
