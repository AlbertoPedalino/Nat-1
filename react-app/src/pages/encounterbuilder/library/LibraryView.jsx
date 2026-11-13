import { Autocomplete, Box, Button, Stack, TextField, Typography } from '@mui/material';
import { Library as LibraryIcon, RotateCcw, ScrollText, Trash2, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useToast } from '../../../shared/ui/ToastProvider.jsx';
import {
  groupLibraryByQuest, listQuestNames, mergeLibrary, toTime,
} from '../../../shared/encounter/library.js';
import { normalizeEncounterQuest } from '../state/storage.js';
import { formatNumber } from '../../../shared/ui/numberFormat.js';
import { encounterPanel } from '../state/EncounterBuilderContext.jsx';
import LaunchButtons from '../builder/LaunchButtons.jsx';
import { formatDateTime } from '../../../shared/ui/dateFormat.js';
import { confirmAction } from '../../../shared/ui/confirmAction.js';
import { findMonster } from '../../../shared/bestiary/monsterUtils.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { CONTROL_HEIGHTS } from '../../../shared/ui/controlHeights.js';
import Panel from '../../../shared/ui/Panel.jsx';
import { SURFACES } from '../../../shared/ui/surfaces.js';
import TagChip from '../../../shared/ui/TagChip.jsx';
import { UI_COLORS } from '../../../shared/ui/colors.js';
import StatePanel from '../../../shared/ui/StatePanel.jsx';
import Caption from '../../../shared/ui/Caption.jsx';

export default encounterPanel({ state: ['fights', 'library', 'players'], context: ['dispatch', 'monsterDb'] }, LibraryViewView);

function LibraryViewView({ state, dispatch, monsterDb }) {
  const { notify } = useToast();
  const items = mergeLibrary(state.library, state.fights);
  const groups = groupLibraryByQuest(items);
  const questOptions = useMemo(() => listQuestNames(state.library), [state.library]);

  const clearAll = () => {
    if (!items.length) return;
    if (!confirmAction(`Delete all ${items.length} library and fight entries?`)) return;
    dispatch({ type: 'clearLibrary' });
    notify('success', 'Encounter library cleared.');
  };

  return (
    <Stack spacing={2}>
      <Panel
        icon={LibraryIcon}
        title="Library"
        action={(
          <Button size="small" color="error" variant="outlined" startIcon={<Trash2 size={ICON_SIZES.sm} />} onClick={clearAll} disabled={!items.length}>
            Clear All
          </Button>
        )}
      >
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>Saved encounters and resumable fights for this instance.</Typography>
      </Panel>
      {items.length ? (
        groups.map((group) => (
          <Stack key={group.quest ? `quest:${group.quest}` : 'unassigned'} spacing={1}>
            <Typography variant="h2" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <ScrollText size={ICON_SIZES.md} />
              {group.quest || 'Unassigned'}
              <Caption component="span">
                {group.items.length}
              </Caption>
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2,minmax(0,1fr))', xl: 'repeat(3,minmax(0,1fr))' }, gap: 2 }}>
              {group.items.map((item) => (
                <Box key={item.enc.id} sx={{ ...SURFACES.card, p: 2 }}>
                  <LibraryCard
                    item={item}
                    monsters={monsterDb.monsters}
                    players={state.players}
                    questOptions={questOptions}
                    dispatch={dispatch}
                    notify={notify}
                  />
                </Box>
              ))}
            </Box>
          </Stack>
        ))
      ) : (
        <StatePanel title="No encounters saved">Save an encounter from the Builder and it shows up here.</StatePanel>
      )}
    </Stack>
  );
}

function LibraryCard({ item, monsters, players, questOptions, dispatch, notify }) {
  const enc = item.enc;
  const fight = item.fight;
  const date = Math.max(toTime(fight?.savedAt), toTime(enc.updatedAt || enc.createdAt));
  const monsterText = (enc.encounter || [])
    .map((monster) => `${monster.name}${monster.qty > 1 ? ` x${monster.qty}` : ''}`)
    .join(', ');
  const alive = fight?.fight?.combatants?.filter((combatant) => !combatant.isDead).length || 0;
  const dead = fight?.fight?.combatants?.filter((combatant) => combatant.isDead).length || 0;
  const missingMonster = enc.encounter.some((entry) => !findMonster(monsters, entry));

  return (
    <Stack spacing={1.5}>
      <Stack spacing={0.75}>
        <Typography variant="h2" noWrap>{enc.name}</Typography>
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
          <TagChip tone={UI_COLORS.accent} label={enc.diffLabel || 'Trivial'} />
          <TagChip label={`${formatNumber(enc.totalXp)} XP`} />
          <TagChip label={`Lv ${enc.partyLevel} · ${enc.partyCount} PC`} />
          {enc.quest ? (
            <TagChip
              icon={<ScrollText size={ICON_SIZES.xs} />}
              label={enc.quest}
            />
          ) : null}
          {fight ? (
            <TagChip
              tone={UI_COLORS.secondary}
              label={`Round ${fight.fight?.round || 1} · ${alive} alive${dead ? ` · ${dead} dead` : ''}`}
            />
          ) : null}
        </Stack>
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary', minHeight: 42 }}>
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
          startIcon={<Upload size={ICON_SIZES.sm} />}
          onClick={() => {
            dispatch({ type: 'loadLibraryEncounter', entry: enc, monsters });
            notify('success', `"${enc.name}" loaded in Builder.`);
          }}
        >
          Load
        </Button>
        <LaunchButtons
          size="small"
          encounter={enc.encounter}
          players={players}
          disabled={missingMonster}
          onLaunch={(initiative) => dispatch({ type: 'launchLibraryEncounter', entry: enc, monsters, initiative })}
        />
        {fight ? (
          <Button
            size="small"
            variant="contained"
            color="secondary"
            startIcon={<RotateCcw size={ICON_SIZES.sm} />}
            onClick={() => dispatch({ type: 'resumeFight', entry: fight, monsters })}
          >
            Resume
          </Button>
        ) : null}
        <Button
          size="small"
          color="error"
          variant="outlined"
          startIcon={<Trash2 size={ICON_SIZES.sm} />}
          onClick={() => {
            if (!confirmAction('Delete this entry from the library?')) return;
            dispatch({ type: 'deleteLibraryEncounter', id: enc.id });
          }}
        >
          Delete
        </Button>
      </Stack>
      <Caption>{formatDateTime(toTime(date))}</Caption>
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
      <Button variant="outlined" onClick={assign} disabled={!quest} sx={{ minHeight: CONTROL_HEIGHTS.huge }}>
        Assign
      </Button>
    </Stack>
  );
}

