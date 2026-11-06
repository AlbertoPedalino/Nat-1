import { useMemo } from 'react';
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
import { CR_ORDER, TYPE_OPTIONS } from './bestiaryConstants.js';
import { filterMonsters } from './filters.js';
import { getType } from './monsterUtils.js';
import MonsterToken from './MonsterToken.jsx';
import { capitalize } from '../ui/textCase.js';
import { formatNumber } from '../ui/numberFormat.js';
import { UI_COLORS, uiAlpha } from '../ui/colors.js';
import { crKey, crXP } from './challengeRating.js';
import { usePagedList } from '../ui/usePagedList.js';

const PAGE_SIZE = 50;

// The bestiary browser, with no idea who is asking. The encounter builder wires
// it to its reducer; the battle map wires it to local state and drops the
// chosen creature on the scene. Both get the same filters, the same paging and
// the same rows — which is the point of it living here rather than being typed
// out twice. `onToggleSource` is optional: without it there is no source bar.
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
  const filtered = useMemo(() => filterMonsters(monsterDb.monsters, filters), [monsterDb.monsters, filters]);
  const page = usePagedList(filtered, { pageSize: PAGE_SIZE, resetKey: filters });

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
      {onToggleSource ? (
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
      ) : null}

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

      <Stack spacing={0.75} sx={{ ...defaultListSx, ...listSx }} {...page.listProps}>
        {page.visible.length ? page.visible.map((monster) => (
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
              CR {crKey(monster.cr)} · {formatNumber(crXP(monster.cr))} XP
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

      {page.remaining > 0 ? (
        <Button variant="outlined" onClick={page.showMore}>
          Show more ({formatNumber(page.remaining)})
        </Button>
      ) : null}
    </Stack>
  );
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
  bgcolor: uiAlpha(UI_COLORS.white, 0.025),
  cursor: 'pointer',
  minWidth: 0,
  userSelect: 'none',
  touchAction: 'pan-y',
  '&:hover': {
    borderColor: 'primary.main',
    bgcolor: uiAlpha(UI_COLORS.primary, 0.08),
  },
};

const pointerDragRowSx = { touchAction: 'pan-y', WebkitTouchCallout: 'none' };
