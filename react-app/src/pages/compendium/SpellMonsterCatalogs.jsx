import { useMemo } from 'react';
import { Typography } from '@mui/material';
import Catalog, { NameCell, YES_NO, sourceOptions } from './Catalog.jsx';
import {
  CASTING_TIMES,
  SPELL_CLASSES,
  SPELL_FILTERS,
  SPELL_LEVELS,
  SPELL_SCHOOLS,
  filterSpells,
  spellLevelLabel,
} from './spellCatalog.js';
import {
  CHALLENGE_RATINGS,
  MONSTER_FILTERS,
  MONSTER_SIZES,
  MONSTER_TYPES,
  filterMonsters,
  monsterStats,
} from './monsterCatalog.js';

const kindEntries = (index, kind) => (index || []).filter((entry) => entry.kind === kind);
const sourcesOf = (entries) => [...new Set(entries.map((entry) => entry.source))].sort();

// Every spell of the supported manuals, filtered like a spell list.
export function SpellCatalog({ compendium, layout = 'page' }) {
  const entries = useMemo(() => kindEntries(compendium.index, 'spell'), [compendium.index]);
  const sources = useMemo(() => sourcesOf(entries), [entries]);
  return (
    <Catalog
      compendium={compendium}
      entries={entries}
      initialFilters={SPELL_FILTERS}
      filter={filterSpells}
      layout={layout}
      label="spells"
      columns={SPELL_COLUMNS}
      controls={[
        { key: 'level', label: 'Level', options: SPELL_LEVELS },
        { key: 'school', label: 'School', options: SPELL_SCHOOLS },
        { key: 'class', label: 'Class', options: SPELL_CLASSES },
        { key: 'time', label: 'Casting Time', options: CASTING_TIMES },
        { key: 'concentration', label: 'Concentration', any: 'any', options: YES_NO },
        { key: 'ritual', label: 'Ritual', any: 'any', options: YES_NO },
        { key: 'source', label: 'Source', options: sourceOptions(sources) },
        { key: 'sort', label: 'Sort by', fixed: true, options: [{ key: 'level', label: 'Level' }, { key: 'name', label: 'Name' }] },
      ]}
    />
  );
}

// Every creature of the supported bestiaries, filtered by challenge rating,
// type, size and source.
export function MonsterCatalog({ compendium, layout = 'page' }) {
  const entries = useMemo(() => kindEntries(compendium.index, 'monster'), [compendium.index]);
  const sources = useMemo(() => sourcesOf(entries), [entries]);
  return (
    <Catalog
      compendium={compendium}
      entries={entries}
      initialFilters={MONSTER_FILTERS}
      filter={filterMonsters}
      layout={layout}
      label="monsters"
      columns={MONSTER_COLUMNS}
      controls={[
        { key: 'crFrom', label: 'CR from', options: CHALLENGE_RATINGS },
        { key: 'crTo', label: 'CR to', options: CHALLENGE_RATINGS },
        { key: 'type', label: 'Type', options: MONSTER_TYPES },
        { key: 'size', label: 'Size', options: MONSTER_SIZES },
        { key: 'source', label: 'Source', options: sourceOptions(sources) },
        { key: 'sort', label: 'Sort by', fixed: true, options: [{ key: 'name', label: 'Name' }, { key: 'cr', label: 'Challenge Rating' }] },
      ]}
    />
  );
}

const tags = (spell) => [spell.concentration ? 'C' : '', spell.ritual ? 'R' : ''].filter(Boolean).join(', ');

const SPELL_COLUMNS = [
  {
    key: 'name',
    label: 'Name',
    width: '2fr',
    render: (entry) => (
      <>
        <Typography variant="body2" sx={nameSx}>{entry.name}{tags(entry.record) ? ` (${tags(entry.record)})` : ''}</Typography>
        <Typography variant="caption" color="text.secondary" noWrap component="div">{entry.subtitle}</Typography>
      </>
    ),
  },
  { key: 'level', label: 'Level', width: '0.6fr', render: (entry) => spellLevelLabel(entry.record) },
  { key: 'time', label: 'Casting Time', width: '1fr', render: (entry) => entry.record.castingTimeLabel || '—' },
  { key: 'range', label: 'Range', width: '1fr', render: (entry) => entry.record.rangeLabel || '—' },
  { key: 'duration', label: 'Duration', width: '1.2fr', render: (entry) => entry.record.durationLabel || '—' },
  { key: 'source', label: 'Source', width: '0.6fr', render: (entry) => entry.source },
];

const MONSTER_COLUMNS = [
  {
    key: 'name',
    label: 'Name',
    width: '2fr',
    render: (entry) => (
      <NameCell entry={entry}>
        <Typography variant="caption" color="text.secondary" noWrap component="div">{entry.subtitle}</Typography>
      </NameCell>
    ),
  },
  { key: 'cr', label: 'CR', width: '0.5fr', render: (entry) => monsterStats(entry.record).cr },
  { key: 'size', label: 'Size', width: '0.8fr', render: (entry) => monsterStats(entry.record).size || '—' },
  { key: 'ac', label: 'AC', width: '0.5fr', render: (entry) => String(monsterStats(entry.record).ac ?? '—') },
  { key: 'hp', label: 'HP', width: '0.5fr', render: (entry) => String(monsterStats(entry.record).hp ?? '—') },
  { key: 'source', label: 'Source', width: '0.6fr', render: (entry) => entry.source },
];

const nameSx = { fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
