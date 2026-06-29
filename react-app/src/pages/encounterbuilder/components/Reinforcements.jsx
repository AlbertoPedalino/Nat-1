import { useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { ChevronDown, Plus, Search } from 'lucide-react';
import { CR_ORDER, TYPE_OPTIONS } from '../logic/constants.js';
import { filterQuickMonsters } from '../logic/filters.js';
import { getCR, getType } from '../logic/monsterUtils.js';
import { useEncounterBuilder } from '../state/EncounterBuilderContext.jsx';
import MonsterToken from './MonsterToken.jsx';

export default function Reinforcements() {
  const { state, dispatch, monsterDb } = useEncounterBuilder();
  const [manual, setManual] = useState({ name: '', hpMax: 10, ac: 10, initMod: 0 });
  const quickMonsters = useMemo(
    () => filterQuickMonsters(monsterDb.monsters, state.quickFilters).slice(0, 50),
    [monsterDb.monsters, state.quickFilters],
  );

  const addManual = () => {
    if (!manual.name.trim()) return;
    dispatch({ type: 'addManualCombatant', payload: manual });
    setManual({ name: '', hpMax: 10, ac: 10, initMod: 0 });
  };

  return (
    <Accordion disableGutters sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ChevronDown size={18} />}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Plus size={17} />
          <Typography variant="h2">Reinforcements</Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0,1.2fr) minmax(260px,0.8fr)' }, gap: 2 }}>
          <Stack spacing={1.25}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Search size={16} />
              <Typography fontWeight={700}>Search global database</Typography>
            </Stack>
            <TextField
              size="small"
              label="Search monster"
              value={state.quickFilters.search}
              onChange={(event) => dispatch({ type: 'setQuickFilter', key: 'search', value: event.target.value })}
            />
            <Stack direction="row" spacing={1}>
              <FormControl size="small" fullWidth>
                <InputLabel>CR</InputLabel>
                <Select
                  label="CR"
                  value={state.quickFilters.cr}
                  onChange={(event) => dispatch({ type: 'setQuickFilter', key: 'cr', value: event.target.value })}
                >
                  <MenuItem value="">All CR</MenuItem>
                  {CR_ORDER.map((cr) => <MenuItem key={cr} value={cr}>CR {cr}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  label="Type"
                  value={state.quickFilters.type}
                  onChange={(event) => dispatch({ type: 'setQuickFilter', key: 'type', value: event.target.value })}
                >
                  <MenuItem value="">All types</MenuItem>
                  {TYPE_OPTIONS.map((type) => <MenuItem key={type} value={type}>{capitalize(type)}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
            <Stack spacing={0.75} sx={{ maxHeight: 280, overflow: 'auto' }}>
              {quickMonsters.length ? quickMonsters.map((monster) => (
                <Box key={`${monster.name}-${monster.source}`} sx={monsterRowSx} onClick={() => dispatch({ type: 'selectStatblock', payload: { monster } })}>
                  <MonsterToken monster={monster} size={28} fallbackText={monster.name?.[0]} />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography fontWeight={700} noWrap>{monster.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{monster.source} · {getType(monster.type)}</Typography>
                  </Box>
                  <Typography variant="caption" color="primary.main">CR {getCR(monster.cr)}</Typography>
                  <Tooltip title="Add to combat">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={(event) => {
                        event.stopPropagation();
                        dispatch({ type: 'addMonsterCombatant', monster });
                      }}
                    >
                      <Plus size={16} />
                    </IconButton>
                  </Tooltip>
                </Box>
              )) : <Typography color="text.secondary">No monsters found.</Typography>}
            </Stack>
          </Stack>
          <Stack spacing={1.25}>
            <Typography fontWeight={700}>Manual quick-add</Typography>
            <TextField size="small" label="Name" value={manual.name} onChange={(event) => setManual((prev) => ({ ...prev, name: event.target.value }))} />
            <Stack direction="row" spacing={1}>
              <TextField size="small" label="HP Max" type="number" value={manual.hpMax} onChange={(event) => setManual((prev) => ({ ...prev, hpMax: event.target.value }))} />
              <TextField size="small" label="AC" type="number" value={manual.ac} onChange={(event) => setManual((prev) => ({ ...prev, ac: event.target.value }))} />
            </Stack>
            <TextField size="small" label="Init Mod" type="number" value={manual.initMod} onChange={(event) => setManual((prev) => ({ ...prev, initMod: event.target.value }))} />
            <Button variant="contained" startIcon={<Plus size={16} />} onClick={addManual}>
              Add
            </Button>
          </Stack>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}

function capitalize(value) {
  return String(value || '').charAt(0).toUpperCase() + String(value || '').slice(1);
}

const monsterRowSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  p: 1,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
  bgcolor: 'rgba(255,255,255,0.025)',
  cursor: 'pointer',
  '&:hover': {
    borderColor: 'primary.main',
    bgcolor: 'rgba(215,173,82,0.08)',
  },
};
