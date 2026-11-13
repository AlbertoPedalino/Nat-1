import { useMemo } from 'react';
import { Stack } from '@mui/material';
import { Plus } from 'lucide-react';
import { CR_OPTIONS, CREATURE_TYPE_OPTIONS } from './bestiaryConstants.js';
import { filterMonsters } from './filters.js';
import { getType, monsterKey } from './monsterUtils.js';
import MonsterToken from './MonsterToken.jsx';
import { formatNumber } from '../ui/numberFormat.js';
import { crKey, crXP } from './challengeRating.js';
import { usePagedList } from '../ui/usePagedList.js';
import { LoadingLine } from '../ui/LoadStatus.jsx';
import { ICON_SIZES } from '../ui/iconSizes.js';
import EmptyLine from '../ui/EmptyLine.jsx';
import { ErrorLine } from '../ui/LoadStatus.jsx';
import Caption from '../ui/Caption.jsx';
import { DRAG_SOURCE_SX } from '../ui/interactive.js';
import TipIconButton from '../ui/TipIconButton.jsx';
import EntityRow from '../ui/EntityRow.jsx';
import SearchField from '../ui/SearchField.jsx';
import FilterToggles from '../ui/FilterToggles.jsx';
import SelectField from '../ui/SelectField.jsx';

const PAGE_SIZE = 50;

// The bestiary browser, with no idea who is asking. The encounter builder wires
// it to its reducer; the battle map wires it to local state and drops the
// chosen creature on the scene. Both get the same filters, the same paging and
// the same rows — which is the point of it living here rather than being typed
// out twice. `onToggleSource` is optional: without it there is no source bar.
// `fill` (inside a `fill` Panel) lets the list take the panel's height on a
// wide screen, however tall the panel's row is, the old cap as its least.
export default function MonsterBrowser({
  monsterDb,
  filters,
  onFilterChange,
  onToggleSource,
  onSelect,
  onPick,
  onPointerDragStart,
  pickLabel = 'Add',
  fill = false,
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
    <Stack spacing={2} sx={fill ? FILL_SX : null}>
      {onToggleSource ? (
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
          <FilterToggles
            options={monsterDb.sourceOptions.map((source) => ({ key: source.source, label: source.source, tooltip: source.label }))}
            isOn={(source) => allSourcesActive || filters.sources.includes(source)}
            onChange={onToggleSource}
          />
        </Stack>
      ) : null}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
        <SearchField
          value={filters.search}
          onChange={(value) => onFilterChange('search', value)}
          placeholder="Search monsters…"
          ariaLabel="Search monsters"
        />
        <SelectField
          label="CR"
          value={filters.cr}
          onChange={(value) => onFilterChange('cr', value)}
          emptyOption={{ label: 'All CR' }}
          options={CR_OPTIONS.map(({ key, label }) => ({ value: key, label }))}
          fullWidth={false}
          sx={{ minWidth: 130 }}
        />
        <SelectField
          label="Type"
          value={filters.type}
          onChange={(value) => onFilterChange('type', value)}
          emptyOption={{ label: 'All types' }}
          options={CREATURE_TYPE_OPTIONS.map(({ key, label }) => ({ value: key, label }))}
          fullWidth={false}
          sx={{ minWidth: 170 }}
        />
      </Stack>

      <Caption>
        {formatNumber(filtered.length)} monsters from allowed 2024 sources
      </Caption>

      <Stack spacing={0.75} sx={{ ...defaultListSx, ...(fill ? fillListSx : null), ...listSx }} {...page.listProps}>
        {page.visible.length ? page.visible.map((monster) => (
          // The open area is a div that acts as a button: it holds the
          // creature's token, which is not phrasing content.
          <EntityRow
            key={monsterKey(monster)}
            component="div"
            role="button"
            tabIndex={0}
            onPointerDown={onPointerDragStart
              ? (event) => onPointerDragStart(event, monster)
              : undefined}
            onClick={() => onSelect?.(monster)}
            onKeyDown={(event) => { if (event.key === 'Enter') onSelect?.(monster); }}
            sx={onPointerDragStart ? DRAG_SOURCE_SX : null}
            leading={<MonsterToken monster={monster} size={30} fallbackText={monster.name?.[0]} />}
            title={monster.name}
            subtitle={`${getType(monster.type)} · ${monster.source}`}
            meta={`CR ${crKey(monster.cr)} · ${formatNumber(crXP(monster.cr))} XP`}
            actions={(
              <TipIconButton title={pickLabel} size="small" color="primary" onClick={() => onPick(monster)}>
                <Plus size={ICON_SIZES.md} />
              </TipIconButton>
            )}
          />
        )) : (
          <EmptyLine inList>No monsters found.</EmptyLine>
        )}
      </Stack>

    </Stack>
  );
}

const LIST_LEAST_HEIGHT = 'calc(100vh - 350px)';

const defaultListSx = {
  maxHeight: { xs: 380, lg: LIST_LEAST_HEIGHT },
  overflow: 'auto',
  pr: 0.5,
};

const FILL_SX = { flex: 1, minHeight: 0 };

// Sized by the panel, not by its rows: no basis of its own, so the rows never
// make the panel taller.
const fillListSx = {
  flex: { lg: '1 1 0' },
  minHeight: { lg: LIST_LEAST_HEIGHT },
  maxHeight: { xs: 380, lg: 'none' },
};

