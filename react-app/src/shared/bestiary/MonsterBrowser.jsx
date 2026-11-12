import { useMemo } from 'react';
import {
  Box,
  Chip,
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
import { CR_OPTIONS, CREATURE_TYPE_OPTIONS } from './bestiaryConstants.js';
import { filterMonsters } from './filters.js';
import { getType, monsterKey } from './monsterUtils.js';
import MonsterToken from './MonsterToken.jsx';
import { formatNumber } from '../ui/numberFormat.js';
import { UI_COLORS, uiAlpha, OPACITY } from '../ui/colors.js';
import { crKey, crXP } from './challengeRating.js';
import { usePagedList } from '../ui/usePagedList.js';
import ShowMoreButton from '../ui/ShowMoreButton.jsx';
import { LoadingLine } from '../ui/LoadStatus.jsx';
import { SURFACES } from '../ui/surfaces.js';
import { FONT_WEIGHTS } from '../ui/fonts.js';
import { ICON_SIZES } from '../ui/iconSizes.js';
import EmptyLine from '../ui/EmptyLine.jsx';
import { ErrorLine } from '../ui/LoadStatus.jsx';
import Caption from '../ui/Caption.jsx';
import { DRAG_SOURCE_SX } from '../ui/interactive.js';

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
      <LoadingLine centered label="Loading 2024 bestiary…" sx={{ minHeight: 220 }} />
    );
  }

  if (monsterDb.status === 'error') {
    return <ErrorLine>{monsterDb.error}</ErrorLine>;
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
            {CR_OPTIONS.map(({ key, label }) => <MenuItem key={key} value={key}>{label}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 170 }}>
          <InputLabel>Type</InputLabel>
          <Select label="Type" value={filters.type} onChange={(event) => onFilterChange('type', event.target.value)}>
            <MenuItem value="">All types</MenuItem>
            {CREATURE_TYPE_OPTIONS.map(({ key, label }) => <MenuItem key={key} value={key}>{label}</MenuItem>)}
          </Select>
        </FormControl>
      </Stack>

      <Caption>
        {formatNumber(filtered.length)} monsters from allowed 2024 sources
      </Caption>

      <Stack spacing={0.75} sx={{ ...defaultListSx, ...listSx }} {...page.listProps}>
        {page.visible.length ? page.visible.map((monster) => (
          <Box
            key={monsterKey(monster)}
            role="button"
            tabIndex={0}
            onPointerDown={onPointerDragStart
              ? (event) => onPointerDragStart(event, monster)
              : undefined}
            onClick={() => onSelect?.(monster)}
            onKeyDown={(event) => { if (event.key === 'Enter') onSelect?.(monster); }}
            sx={[rowSx, onPointerDragStart ? DRAG_SOURCE_SX : null]}
          >
            <MonsterToken monster={monster} size={30} fallbackText={monster.name?.[0]} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography noWrap sx={{ fontWeight: FONT_WEIGHTS.bold }}>{monster.name}</Typography>
              <Caption noWrap>
                {getType(monster.type)} · {monster.source}
              </Caption>
            </Box>
            <Typography variant="caption" sx={{ color: 'primary.main', minWidth: 92, textAlign: 'right' }}>
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
                <Plus size={ICON_SIZES.md} />
              </IconButton>
            </Tooltip>
          </Box>
        )) : (
          <EmptyLine inList>No monsters found.</EmptyLine>
        )}
      </Stack>

      <ShowMoreButton page={page} />
    </Stack>
  );
}

const defaultListSx = {
  maxHeight: { xs: 380, lg: 'calc(100vh - 350px)' },
  overflow: 'auto',
  pr: 0.5,
};

const rowSx = {
  ...SURFACES.wash,
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  p: 1,
  cursor: 'pointer',
  minWidth: 0,
  userSelect: 'none',
  touchAction: 'pan-y',
  '&:hover': {
    borderColor: 'primary.main',
    bgcolor: uiAlpha(UI_COLORS.accent, OPACITY.soft),
  },
};

