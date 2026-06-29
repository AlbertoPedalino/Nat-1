import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Plus } from 'lucide-react';
import { CR_ORDER, TYPE_OPTIONS } from '../logic/constants.js';
import { filterMonsters } from '../logic/filters.js';
import { crXP, formatNumber, getCR, getType } from '../logic/monsterUtils.js';
import MonsterToken from './MonsterToken.jsx';
import { useEncounterBuilder } from '../state/EncounterBuilderContext.jsx';

const PAGE_SIZE = 50;

export default function MonsterList() {
  const { state, dispatch, monsterDb } = useEncounterBuilder();
  const [visible, setVisible] = useState(PAGE_SIZE);
  const filtered = useMemo(
    () => filterMonsters(monsterDb.monsters, state.filters),
    [monsterDb.monsters, state.filters],
  );
  const visibleMonsters = filtered.slice(0, visible);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [state.filters]);

  if (monsterDb.status === 'loading' || monsterDb.status === 'idle') {
    return (
      <Paper sx={panelSx}>
        <Stack spacing={2} sx={{ alignItems: 'center', justifyContent: 'center', minHeight: 220 }}>
          <CircularProgress size={28} />
          <Typography color="text.secondary">Loading 2024 bestiary...</Typography>
        </Stack>
      </Paper>
    );
  }

  if (monsterDb.status === 'error') {
    return (
      <Paper sx={panelSx}>
        <Typography color="error.main">{monsterDb.error}</Typography>
      </Paper>
    );
  }

  const allSourcesActive = state.filters.sources.length === 0;

  return (
    <Paper sx={panelSx}>
      <Stack spacing={2}>
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
          {monsterDb.sourceOptions.map((source) => {
            const active = allSourcesActive || state.filters.sources.includes(source.source);
            return (
              <Tooltip key={source.source} title={source.label}>
                <Chip
                  label={source.source}
                  size="small"
                  clickable
                  color={active ? 'primary' : 'default'}
                  onClick={() => dispatch({ type: 'toggleSource', source: source.source })}
                />
              </Tooltip>
            );
          })}
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
          <TextField
            size="small"
            label="Search"
            value={state.filters.search}
            onChange={(event) => dispatch({ type: 'setFilter', key: 'search', value: event.target.value })}
            fullWidth
          />
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>CR</InputLabel>
            <Select
              label="CR"
              value={state.filters.cr}
              onChange={(event) => dispatch({ type: 'setFilter', key: 'cr', value: event.target.value })}
            >
              <MenuItem value="">All CR</MenuItem>
              {CR_ORDER.map((cr) => <MenuItem key={cr} value={cr}>CR {cr}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel>Type</InputLabel>
            <Select
              label="Type"
              value={state.filters.type}
              onChange={(event) => dispatch({ type: 'setFilter', key: 'type', value: event.target.value })}
            >
              <MenuItem value="">All types</MenuItem>
              {TYPE_OPTIONS.map((type) => <MenuItem key={type} value={type}>{capitalize(type)}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {formatNumber(filtered.length)} monsters from allowed 2024 sources
        </Typography>
        <Stack spacing={0.75} sx={{ maxHeight: { xs: 380, lg: 'calc(100vh - 350px)' }, overflow: 'auto', pr: 0.5 }}>
          {visibleMonsters.length ? visibleMonsters.map((monster) => (
            <Box
              key={`${monster.name}-${monster.source}`}
              role="button"
              tabIndex={0}
              onClick={() => dispatch({ type: 'selectStatblock', payload: { monster } })}
              onKeyDown={(event) => {
                if (event.key === 'Enter') dispatch({ type: 'selectStatblock', payload: { monster } });
              }}
              sx={rowSx}
            >
              <MonsterToken monster={monster} size={30} fallbackText={monster.name?.[0]} />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography fontWeight={700} noWrap>{monster.name}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {getType(monster.type)} · {monster.source}
                </Typography>
              </Box>
              <Typography variant="caption" color="primary.main" sx={{ minWidth: 92, textAlign: 'right' }}>
                CR {getCR(monster.cr)} · {formatNumber(crXP(monster.cr))} XP
              </Typography>
              <Tooltip title="Add to encounter">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={(event) => {
                    event.stopPropagation();
                    dispatch({ type: 'addMonster', monster });
                  }}
                >
                  <Plus size={16} />
                </IconButton>
              </Tooltip>
            </Box>
          )) : (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No monsters found.</Typography>
          )}
        </Stack>
        {filtered.length > visible ? (
          <Button variant="outlined" onClick={() => setVisible((value) => value + PAGE_SIZE)}>
            Show more ({formatNumber(filtered.length - visible)})
          </Button>
        ) : null}
      </Stack>
    </Paper>
  );
}

function capitalize(value) {
  return String(value || '').charAt(0).toUpperCase() + String(value || '').slice(1);
}

const panelSx = {
  p: 2,
  bgcolor: 'background.paper',
};

const rowSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  p: 1,
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
  bgcolor: 'rgba(255,255,255,0.025)',
  cursor: 'pointer',
  minWidth: 0,
  '&:hover': {
    borderColor: 'primary.main',
    bgcolor: 'rgba(215,173,82,0.08)',
  },
};
