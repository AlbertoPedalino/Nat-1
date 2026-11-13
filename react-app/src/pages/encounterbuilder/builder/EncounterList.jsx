import { Autocomplete, Button, Stack, TextField, Typography } from '@mui/material';
import { useMemo } from 'react';
import { Save, Swords, Trash2 } from 'lucide-react';
import { useToast } from '../../../shared/ui/ToastProvider.jsx';
import { calculateDifficulty } from './difficulty.js';
import { listQuestNames } from '../../../shared/encounter/library.js';
import { formatNumber } from '../../../shared/ui/numberFormat.js';
import { useEncounterBuilder } from '../state/EncounterBuilderContext.jsx';
import DifficultyBar from './DifficultyBar.jsx';
import LaunchButtons from './LaunchButtons.jsx';
import CountStepper from '../../../shared/ui/CountStepper.jsx';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import Panel from '../../../shared/ui/Panel.jsx';
import EmptyLine from '../../../shared/ui/EmptyLine.jsx';
import Caption from '../../../shared/ui/Caption.jsx';
import TipIconButton from '../../../shared/ui/TipIconButton.jsx';
import EntityRow from '../../../shared/ui/EntityRow.jsx';
import ClearButton from '../../../shared/ui/ClearButton.jsx';
import { useDraftText } from '../../../shared/ui/useDraftText.js';
import { draftLibraryEntry } from '../state/libraryState.js';

export default function EncounterList() {
  const { state, dispatch } = useEncounterBuilder();
  const { notify } = useToast();
  const difficulty = calculateDifficulty(state.encounter, state.party);
  const questOptions = useMemo(() => listQuestNames(state.library), [state.library]);
  const editingExisting = state.library.some((entry) => entry.id === state.currentEncounterId);
  // Typed here, handed to the page's reducer after a pause or on leaving the
  // field: a keystroke never redraws the whole builder.
  const [name, setName, flushName] = useDraftText(
    state.encounterName,
    (value) => dispatch({ type: 'setEncounterName', value }),
  );
  const [quest, setQuest, flushQuest] = useDraftText(
    state.encounterQuest || '',
    (value) => dispatch({ type: 'setEncounterQuest', quest: value }),
  );
  const hasComposition = Boolean(
    state.encounter.length || state.encounterName || state.encounterQuest || state.currentEncounterId != null,
  );

  // What is still being typed goes to the reducer first (flush), so the save
  // or launch that follows reads it; a pending commit could otherwise land on
  // the panel after it was emptied.
  const flushTyping = () => {
    flushName();
    flushQuest();
  };

  const handleSave = () => {
    const entry = draftLibraryEntry({ ...state, encounterName: name, encounterQuest: quest });
    if (!entry) return;
    flushTyping();
    dispatch({ type: 'saveEncounterToLibrary', entry });
    notify('success', `"${entry.name}" ${editingExisting ? 'updated in' : 'saved to'} Library.`);
  };

  const cannotLaunch = !state.encounter.length || state.encounter.some((item) => !item.monsterData);

  const handleLaunch = (initiative) => {
    if (!state.encounter.length) return;
    flushTyping();
    dispatch({ type: 'launchCurrentEncounter', initiative });
  };

  return (
    <Panel
      icon={Swords}
      title="Encounter"
      // Clear starts the panel over without saving: a composition dropped, or a
      // loaded encounter left as it is in the Library.
      action={hasComposition ? (
        <ClearButton onClick={() => dispatch({ type: 'clearComposer' })} />
      ) : null}
    >
      <Stack spacing={2}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>{formatNumber(difficulty.totalXp)} XP</Typography>
        <TextField
          size="small"
          label="Library name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={flushName}
          placeholder="Optional"
        />
        <Autocomplete
          freeSolo
          size="small"
          options={questOptions}
          value={state.encounterQuest || null}
          inputValue={quest}
          onChange={(_, value) => { setQuest(value || ''); flushQuest(); }}
          onInputChange={(_, value) => setQuest(value)}
          onBlur={flushQuest}
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
            <EntityRow
              key={item.id}
              title={item.name}
              subtitle={`${item.source} · CR ${item.cr}`}
              meta={`${formatNumber(item.xp * item.qty)} XP`}
              actions={(
                <>
                  <CountStepper
                    value={item.qty}
                    size={24}
                    label="quantity"
                    onStep={(delta) => dispatch({ type: 'changeMonsterQty', id: item.id, delta })}
                  />
                  <TipIconButton danger title="Remove" size="small" onClick={() => dispatch({ type: 'removeEncounterItem', id: item.id })}>
                    <Trash2 size={ICON_SIZES.sm} />
                  </TipIconButton>
                </>
              )}
            />
          )) : (
            <EmptyLine inList>Add monsters from the bestiary list.</EmptyLine>
          )}
        </Stack>
        <DifficultyBar encounter={state.encounter} party={state.party} />
        {/* Two rows: Launch keeps its initiative options beside it, and the
            panel is too narrow for three controls side by side. */}
        <Stack spacing={1}>
          <LaunchButtons
            grow
            encounter={state.encounter}
            players={state.players}
            disabled={cannotLaunch}
            onLaunch={handleLaunch}
          />
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
          {editingExisting
            ? 'Update and Launch save your changes to this Library encounter; Launch also starts combat. Either clears this panel for the next one.'
            : 'Save and Launch put the encounter in the Library; Launch also starts combat. Either clears this panel for the next one.'}
        </Caption>
      </Stack>
    </Panel>
  );
}
