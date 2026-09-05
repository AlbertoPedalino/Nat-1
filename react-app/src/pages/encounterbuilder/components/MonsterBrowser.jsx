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

const PAGE_SIZE = 50;

// The bestiary browser, with no idea who is asking. The encounter builder wires
// it to its reducer; the battle map wires it to local state and drops the
// chosen creature on the scene. Both get the same filters, the same paging and
// the same rows — which is the point of it living here rather than being typed
// out twice.
export default function MonsterBrowser({
  monsterDb,
  filters,
  onFilterChange,
  onToggleSource,
  onSelect,
  onPick,
  onPointerDragStart,
  pickLabel = 'Add',
  listSx,
}) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const filtered = useMemo(() => filterMonsters(monsterDb.monsters, filters), [monsterDb.monsters, filters]);
  const visibleMonsters = filtered.slice(0, visible);

  useEffect(() => { setVisible(PAGE_SIZE); }, [filters]);

  if (monsterDb.status === 'loading' || monsterDb.status === 'idle') {
    return (
      <Stack spacing={2} sx={{ alignItems: 'center', justifyContent: 'center', minHeight: 220 }}>
        <CircularProgress size={28} />
        <Typography color="text.secondary">Loading 2024 bestiary...</Typography>
      </Stack>
    );
  }

  if (monsterDb.status === 'error') {
    return <Typography color="error.main">{monsterDb.error}</Typography>;
  }

  const allSourcesActive = !filters.sources?.length;

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
        {monsterDb.sourceOptions.map((source) => {
          const active = allSourcesActive || filters.sources.includes(source.source);
          return (
            <Tooltip key={source.source} title={source.label}>
              <Chip
                label={source.source}
                size="small"
                clickable
                color={active ? 'primary' : 'default'}
                onClick={() => onToggleSource(source.source)}
              />
            </Tooltip>
          );
        })}
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
        <TextField
          size="small"
          label="Search"
          value={filters.search}
          onChange={(event) => onFilterChange('search', event.target.value)}
          fullWidth
        />
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>CR</InputLabel>
          <Select label="CR" value={filters.cr} onChange={(event) => onFilterChange('cr', event.target.value)}>
            <MenuItem value="">All CR</MenuItem>
            {CR_ORDER.map((cr) => <MenuItem key={cr} value={cr}>CR {cr}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 170 }}>
          <InputLabel>Type</InputLabel>
          <Select label="Type" value={filters.type} onChange={(event) => onFilterChange('type', event.target.value)}>
            <MenuItem value="">All types</MenuItem>
            {TYPE_OPTIONS.map((type) => <MenuItem key={type} value={type}>{capitalize(type)}</MenuItem>)}
          </Select>
        </FormControl>
      </Stack>

      <Typography variant="caption" color="text.secondary">
        {formatNumber(filtered.length)} monsters from allowed 2024 sources
      </Typography>

      <Stack spacing={0.75} sx={{ ...defaultListSx, ...listSx }}>
        {visibleMonsters.length ? visibleMonsters.map((monster) => (
          <Box
            key={`${monster.name}-${monster.source}`}
            role="button"
            tabIndex={0}
            onPointerDown={onPointerDragStart
              ? (event) => onPointerDragStart(event, monster)
              : undefined}
            onClick={() => onSelect?.(monster)}
            onKeyDown={(event) => { if (event.key === 'Enter') onSelect?.(monster); }}
            sx={[rowSx, onPointerDragStart ? pointerDragRowSx : null]}
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
            <Tooltip title={pickLabel}>
              <IconButton
                size="small"
                color="primary"
                onClick={(event) => {
                  event.stopPropagation();
                  onPick(monster);
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
  );
}

function capitalize(value) {
  return String(value || '').charAt(0).toUpperCase() + String(value || '').slice(1);
}

const defaultListSx = {
  maxHeight: { xs: 380, lg: 'calc(100vh - 350px)' },
  overflow: 'auto',
  pr: 0.5,
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
  userSelect: 'none',
  touchAction: 'pan-y',
  '&:hover': {
    borderColor: 'primary.main',
    bgcolor: 'rgba(215,173,82,0.08)',
  },
};

const pointerDragRowSx = { touchAction: 'none' };
