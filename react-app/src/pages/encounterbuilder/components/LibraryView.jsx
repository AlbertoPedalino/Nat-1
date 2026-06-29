import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import { Play, RotateCcw, Trash2, Upload } from 'lucide-react';
import { useToast } from '../../../shared/ToastProvider.jsx';
import { formatNumber } from '../logic/monsterUtils.js';
import { useEncounterBuilder } from '../state/EncounterBuilderContext.jsx';

export default function LibraryView() {
  const { state, dispatch, monsterDb } = useEncounterBuilder();
  const { notify } = useToast();
  const items = mergeLibrary(state.library, state.fights);

  const clearAll = () => {
    if (!items.length) return;
    if (!window.confirm(`Delete all ${items.length} library and fight entries?`)) return;
    dispatch({ type: 'clearLibrary' });
    notify('success', 'Encounter library cleared.');
  };

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between">
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
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2,minmax(0,1fr))', xl: 'repeat(3,minmax(0,1fr))' }, gap: 2 }}>
          {items.map((item) => (
            <Paper key={`${item.type}-${item.enc?.id || item.fight?.id}`} sx={{ p: 2, bgcolor: 'background.paper' }}>
              <LibraryCard item={item} monsters={monsterDb.monsters} dispatch={dispatch} notify={notify} />
            </Paper>
          ))}
        </Box>
      ) : (
        <Paper sx={{ p: 4, bgcolor: 'background.paper', textAlign: 'center' }}>
          <Typography color="text.secondary">No encounters saved.</Typography>
        </Paper>
      )}
    </Stack>
  );
}

function LibraryCard({ item, monsters, dispatch, notify }) {
  const enc = item.enc;
  const fight = item.fight;
  const name = enc?.name || fight?.name || 'Fight';
  const date = fight?.savedAt || enc?.createdAt;
  const monsterText = enc
    ? enc.encounter.map((monster) => `${monster.name}${monster.qty > 1 ? ` x${monster.qty}` : ''}`).join(', ')
    : fight?.fight?.combatants?.map((combatant) => `${combatant.name} ${combatant.hpCurrent}/${combatant.hpMax}HP`).join(', ');
  const alive = fight?.fight?.combatants?.filter((combatant) => !combatant.isDead).length || 0;
  const dead = fight?.fight?.combatants?.filter((combatant) => combatant.isDead).length || 0;

  return (
    <Stack spacing={1.5}>
      <Stack spacing={0.75}>
        <Typography variant="h2" noWrap>{name}</Typography>
        <Stack direction="row" flexWrap="wrap" gap={0.75}>
          {enc ? (
            <>
              <Chip size="small" color="primary" label={enc.diffLabel || 'Trivial'} />
              <Chip size="small" label={`${formatNumber(enc.totalXp)} XP`} />
              <Chip size="small" label={`Lv ${enc.partyLevel} · ${enc.partyCount} PC`} />
            </>
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
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {enc ? (
          <>
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
              disabled={enc.encounter.some((entry) => !monsters.find((monster) => monster.name === entry.name && (!entry.source || monster.source === entry.source)))}
            >
              Launch
            </Button>
          </>
        ) : null}
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
            const ok = window.confirm(enc ? 'Delete this entry from the library?' : 'Delete this saved fight?');
            if (!ok) return;
            dispatch(enc ? { type: 'deleteLibraryEncounter', id: enc.id } : { type: 'deleteFight', id: fight.id });
          }}
        >
          Delete
        </Button>
      </Stack>
      <Typography variant="caption" color="text.secondary">{formatDate(date)}</Typography>
    </Stack>
  );
}

function mergeLibrary(encounters, fights) {
  const items = [];
  const usedFightIds = new Set();
  (encounters || []).forEach((enc) => {
    const linkedFight = (fights || []).find((fight) => fight.encounterId === enc.id)
      || (fights || []).find((fight) => !fight.encounterId && fight.name === enc.name);
    if (linkedFight) usedFightIds.add(linkedFight.id);
    items.push({ type: 'enc', enc, fight: linkedFight || null, sortKey: Math.max(toTime(enc.createdAt), linkedFight?.savedAt || 0) });
  });
  (fights || []).filter((fight) => !usedFightIds.has(fight.id)).forEach((fight) => {
    items.push({ type: 'fight', enc: null, fight, sortKey: fight.savedAt || 0 });
  });
  return items.sort((a, b) => b.sortKey - a.sortKey);
}

function toTime(value) {
  if (typeof value === 'number') return value;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

function formatDate(value) {
  const time = toTime(value);
  return time ? new Date(time).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
}
