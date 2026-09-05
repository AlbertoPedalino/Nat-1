import {
  Autocomplete, Box, Button, Chip, Paper, Stack, TextField, Typography,
} from '@mui/material';
import { Play, RotateCcw, ScrollText, Trash2, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useToast } from '../../../shared/ToastProvider.jsx';
import {
  groupLibraryByQuest, listQuestNames, mergeLibrary, toTime,
} from '../logic/library.js';
import { normalizeEncounterQuest } from '../logic/storage.js';
import { formatNumber } from '../logic/monsterUtils.js';
import { useEncounterBuilder } from '../state/EncounterBuilderContext.jsx';

export default function LibraryView() {
  const { state, dispatch, monsterDb } = useEncounterBuilder();
  const { notify } = useToast();
  const items = mergeLibrary(state.library, state.fights);
  const groups = groupLibraryByQuest(items);
  const questOptions = useMemo(() => listQuestNames(state.library), [state.library]);

  const clearAll = () => {
    if (!items.length) return;
    if (!window.confirm(`Delete all ${items.length} library and fight entries?`)) return;
    dispatch({ type: 'clearLibrary' });
    notify('success', 'Encounter library cleared.');
  };

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h2">Library</Typography>
            <Typography variant="body2" color="text.secondary">Saved encounters and resumable fights for this instance.</Typography>
          </Box>
          <Button color="error" variant="outlined" startIcon={<Trash2 size={15} />} onClick={clearAll} disabled={!items.length}>
            Clear All
          </Button>
        </Stack>
      </Paper>
      {items.length ? (
        groups.map((group) => (
          <Stack key={group.quest ? `quest:${group.quest}` : 'unassigned'} spacing={1}>
            <Typography variant="h2" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <ScrollText size={17} />
              {group.quest || 'Unassigned'}
              <Typography component="span" variant="caption" color="text.secondary">
                {group.items.length}
              </Typography>
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2,minmax(0,1fr))', xl: 'repeat(3,minmax(0,1fr))' }, gap: 2 }}>
              {group.items.map((item) => (
                <Paper key={item.enc.id} sx={{ p: 2, bgcolor: 'background.paper' }}>
                  <LibraryCard
                    item={item}
                    monsters={monsterDb.monsters}
                    questOptions={questOptions}
                    dispatch={dispatch}
                    notify={notify}
                  />
                </Paper>
              ))}
            </Box>
          </Stack>
        ))
      ) : (
        <Paper sx={{ p: 4, bgcolor: 'background.paper', textAlign: 'center' }}>
          <Typography color="text.secondary">No encounters saved.</Typography>
        </Paper>
      )}
    </Stack>
  );
}

function LibraryCard({ item, monsters, questOptions, dispatch, notify }) {
  const enc = item.enc;
  const fight = item.fight;
  const date = fight?.savedAt || enc.createdAt;
  const monsterText = (enc.encounter || [])
    .map((monster) => `${monster.name}${monster.qty > 1 ? ` x${monster.qty}` : ''}`)
    .join(', ');
  const alive = fight?.fight?.combatants?.filter((combatant) => !combatant.isDead).length || 0;
  const dead = fight?.fight?.combatants?.filter((combatant) => combatant.isDead).length || 0;
  const missingMonster = enc.encounter.some((entry) => !monsters.find((monster) => monster.name === entry.name && (!entry.source || monster.source === entry.source)));

  return (
    <Stack spacing={1.5}>
      <Stack spacing={0.75}>
        <Typography variant="h2" noWrap>{enc.name}</Typography>
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
          <Chip size="small" color="primary" label={enc.diffLabel || 'Trivial'} />
          <Chip size="small" label={`${formatNumber(enc.totalXp)} XP`} />
          <Chip size="small" label={`Lv ${enc.partyLevel} · ${enc.partyCount} PC`} />
          {enc.quest ? (
            <Chip
              size="small"
              icon={<ScrollText size={13} />}
              label={enc.quest}
            />
          ) : null}
          {fight ? (
            <Chip
              size="small"
              color="secondary"
              label={`Round ${fight.fight?.round || 1} · ${alive} alive${dead ? ` · ${dead} dead` : ''}`}
            />
          ) : null}
        </Stack>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ minHeight: 42 }}>
        {monsterText || 'No combatants'}
      </Typography>
      {!enc.quest ? (
        <QuestAssignment
          encounter={enc}
          options={questOptions}
          dispatch={dispatch}
          notify={notify}
        />
      ) : null}
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<Upload size={14} />}
          onClick={() => {
            dispatch({ type: 'loadLibraryEncounter', entry: enc, monsters });
            notify('success', `"${enc.name}" loaded in Builder.`);
          }}
        >
          Load
        </Button>
        <Button
          size="small"
          variant="contained"
          startIcon={<Play size={14} />}
          onClick={() => dispatch({ type: 'launchLibraryEncounter', entry: enc, monsters })}
          disabled={missingMonster}
        >
          Launch
        </Button>
        {fight ? (
          <Button
            size="small"
            variant="contained"
            color="secondary"
            startIcon={<RotateCcw size={14} />}
            onClick={() => dispatch({ type: 'resumeFight', entry: fight, monsters })}
          >
            Resume
          </Button>
        ) : null}
        <Button
          size="small"
          color="error"
          variant="outlined"
          startIcon={<Trash2 size={14} />}
          onClick={() => {
            if (!window.confirm('Delete this entry from the library?')) return;
            dispatch({ type: 'deleteLibraryEncounter', id: enc.id });
          }}
        >
          Delete
        </Button>
      </Stack>
      <Typography variant="caption" color="text.secondary">{formatDate(date)}</Typography>
    </Stack>
  );
}

function QuestAssignment({ encounter, options, dispatch, notify }) {
  const [value, setValue] = useState('');
  const quest = normalizeEncounterQuest(value);

  const assign = () => {
    if (!quest) return;
    dispatch({ type: 'assignEncounterQuest', id: encounter.id, quest });
    notify('success', `"${encounter.name}" assigned to "${quest}".`);
  };

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'flex-start' } }}>
      <Autocomplete
        freeSolo
        size="small"
        options={options}
        value={value || null}
        inputValue={value}
        onChange={(_, next) => setValue(next || '')}
        onInputChange={(_, next) => setValue(next)}
        sx={{ flex: 1, minWidth: 0 }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Assign quest"
            placeholder="Select or type a category"
          />
        )}
      />
      <Button variant="outlined" onClick={assign} disabled={!quest} sx={{ minHeight: 40 }}>
        Assign
      </Button>
    </Stack>
  );
}

function formatDate(value) {
  const time = toTime(value);
  return time ? new Date(time).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
}
