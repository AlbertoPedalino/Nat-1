import { Button, Chip, List, ListItemButton, ListItemText, Paper, Stack, Typography } from '@mui/material';
import ChoiceBlock from './ChoiceBlock.jsx';
import SpellChoiceList from './SpellChoiceList.jsx';
import { EntryAccordion, splitNamedEntries } from '../../../shared/character/EntryAccordion.jsx';
import { featChoiceSpecs } from '../logic/choiceSpecs.js';
import { getPrimaryClassLevel } from '../logic/calculations.js';

function featMinLevel(feat) {
  const prereq = Array.isArray(feat?.prerequisite) ? feat.prerequisite : [];
  const levels = prereq
    .map((entry) => entry?.level?.level || entry?.level || null)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  return levels.length ? Math.min(...levels) : 0;
}

function featMatchesCategory(feat, wanted) {
  if (!wanted?.length) return true;
  const cats = (feat.categories?.length ? feat.categories : [feat.category]).filter(Boolean).map((value) => String(value));
  const exact = wanted.some((cat) => String(cat || '').startsWith('FS'));
  return wanted.some((cat) => cats.some((featCat) => exact ? featCat === cat : featCat === cat || featCat.startsWith(cat)));
}

function featPrereqLabel(feat) {
  return (feat?.prerequisite || []).map((entry) => {
    if (entry?.level) return `Lv.${entry.level.level || entry.level}`;
    if (entry?.ability) return Object.entries(entry.ability[0] || {}).map(([key, value]) => `${key.toUpperCase()} ${value}`).join(', ');
    if (entry?.spellcasting) return 'Spellcasting';
    if (entry?.proficiency) return 'Proficiency';
    return '';
  }).filter(Boolean).join(' · ');
}

function findFeat(feats, name) {
  if (!name) return null;
  const norm = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const target = norm(name);
  return feats.find((entry) => norm(entry.name) === target)
    || feats.find((entry) => norm(entry.name).startsWith(target));
}

function renderGrantSpec({ grant, character, state, dispatch }) {
  if (grant.type === 'spell_choice' || grant.type === 'spell_grant') {
    return <SpellChoiceList key={grant.key} spec={grant} state={state} dispatch={dispatch} />;
  }
  return <ChoiceBlock key={grant.key} spec={grant} choices={character.choices} dispatch={dispatch} character={character} />;
}

function grantLabel(entry) {
  for (const mode of ['known', 'innate', 'prepared', 'expanded']) {
    const section = entry?.[mode];
    if (!section) continue;
    for (const items of Object.values(section)) {
      const arr = Array.isArray(items) ? items : items?._;
      if (!Array.isArray(arr)) continue;
      for (const item of arr) {
        if (typeof item === 'string') return item.split('|')[0];
        if (item?.choose) {
          const cls = String(item.choose).split('|').find((p) => p.startsWith('class='));
          if (cls) return cls.slice(6).split(';')[0];
        }
      }
    }
  }
  return entry?.name || '?';
}

// Spell-list picker for feats that grant a choice of spell list (e.g. Magic
// Initiate / Fey Touched). Renders nothing unless the feat offers more than one
// list. Shared by the fixed and category feat slots.
function FeatSpellListSelector({ feat, additional, entryIdx, slotKey, dispatch }) {
  if (!Array.isArray(additional) || additional.length <= 1) return null;
  const entryKey = `${slotKey}_entry`;
  return (
    <Stack spacing={0.6}>
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
        {feat?.choiceUi?.listLabel || `${feat?.name || 'Feat'} Spell List`}
      </Typography>
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
        {additional.map((entry, idx) => (
          <Button
            key={`${slotKey}-entry-${idx}`}
            size="small"
            variant={idx === entryIdx ? 'contained' : 'outlined'}
            onClick={() => dispatch({ type: 'choice/set-entry', key: entryKey, value: idx, clearPrefix: `${slotKey}_spell_` })}
          >
            {grantLabel(entry)}
          </Button>
        ))}
      </Stack>
    </Stack>
  );
}

// Feat description as collapsed accordion rows: named feat sub-entries become one
// row each (like species traits); a flat feat collapses under a single
// "Description" row. Shared by both feat slots so descriptions look uniform.
function FeatDescriptionRows({ feat }) {
  const rows = feat?.entries ? splitNamedEntries(feat.entries) : [];
  if (!rows.length) return null;
  return (
    <Stack spacing={0.5} sx={{ minWidth: 0 }}>
      {rows.map((row, idx) => (
        <EntryAccordion key={`${row.name}-${idx}`} title={row.name} entries={row.entries} />
      ))}
    </Stack>
  );
}

// Separate, always-visible panel with everything selectable for a feat (spell
// list + granted choices). Renders nothing when the feat has no choices. Shared
// by both feat slots so selection always lives in its own panel.
function FeatChoicesPanel({ feat, slotKey, character, state, dispatch }) {
  const additional = Array.isArray(feat?.additionalSpells) ? feat.additionalSpells : [];
  const entryKey = `${slotKey}_entry`;
  const entryChoiceEnabled = additional.length > 1;
  const rawEntryIdx = character.choices[entryKey];
  const entryIdx = entryChoiceEnabled && rawEntryIdx != null ? Number(rawEntryIdx) : null;
  const grants = feat ? featChoiceSpecs(feat, { slotKey, entryIdx }) : [];
  if (!entryChoiceEnabled && grants.length === 0) return null;
  return (
    <Paper variant="outlined" sx={{ p: 1.5, minWidth: 0 }}>
      <Stack spacing={1} sx={{ minWidth: 0 }}>
        <FeatSpellListSelector feat={feat} additional={additional} entryIdx={entryIdx} slotKey={slotKey} dispatch={dispatch} />
        {grants.map((grant) => renderGrantSpec({ grant, character, state, dispatch }))}
      </Stack>
    </Paper>
  );
}

// Fixed feat (e.g. a background's origin feat): name + neutral chip + description
// rows, with the selectable choices in a separate panel below.
export function FeatFixedSlot({ spec, feats, character, state, dispatch }) {
  const feat = findFeat(feats, spec.fixed);
  return (
    <Stack spacing={1.5} sx={{ minWidth: 0 }}>
      <Paper variant="outlined" sx={{ p: 1.5, minWidth: 0 }}>
        <Stack spacing={1} sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="h2" sx={{ flex: 1, minWidth: 0 }}>{feat ? feat.name : spec.fixed}</Typography>
            <Chip size="small" label={spec.label} />
          </Stack>
          <FeatDescriptionRows feat={feat} />
        </Stack>
      </Paper>
      <FeatChoicesPanel feat={feat} slotKey={spec.key} character={character} state={state} dispatch={dispatch} />
    </Stack>
  );
}

// Category feat slot: pick a feat from a category, then its description (accordion
// rows) and selectable choices render exactly like the fixed slot, so both feat
// surfaces look the same.
export function FeatCategorySlot({ spec, feats, character, state, dispatch }) {
  const effectiveLevel = getPrimaryClassLevel(character) + (character.extraClasses || []).reduce((sum, ec) => sum + (ec.level || 0), 0);
  const taken = new Set(Object.entries(character.choices || {})
    .filter(([key]) => key !== spec.key)
    .map(([, value]) => Array.isArray(value) ? value : [value])
    .flat()
    .map((value) => {
      if (typeof value === 'string') return value;
      if (value && typeof value === 'object') return value.name || value.label || value.value || null;
      return null;
    })
    .filter(Boolean));
  const isFs = (spec.categories || []).some((cat) => String(cat).startsWith('FS'));
  const disallowDuplicates = isFs || !!spec.disallowDuplicates;
  const pool = feats
    .filter((feat) => {
      const min = featMinLevel(feat);
      if (Number.isFinite(min) && min > effectiveLevel) return false;
      if (!featMatchesCategory(feat, spec.categories)) return false;
      if (disallowDuplicates && taken.has(feat.name)) return false;
      return true;
    })
    .slice(0, 80);
  const selected = character.choices[spec.key] || null;
  const selectedFeat = feats.find((feat) => feat.name === selected);
  return (
    <Stack spacing={1.5} sx={{ minWidth: 0 }}>
      <Paper variant="outlined" sx={{ p: 1.5, minWidth: 0 }}>
        <Stack spacing={1} sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="h2" sx={{ flex: 1, minWidth: 0 }}>{spec.label}</Typography>
            <Chip size="small" label={(spec.categories || []).join('/')} />
            {selected ? <Chip size="small" label={selected} /> : null}
          </Stack>
          <Paper variant="outlined" sx={{ maxHeight: 260, overflow: 'auto' }}>
            <List dense disablePadding>
              {pool.map((feat) => {
                const active = selected === feat.name;
                return (
                  <ListItemButton
                    key={`${spec.key}-${feat.name}-${feat.source}`}
                    divider
                    selected={active}
                    alignItems="flex-start"
                    onClick={() => dispatch({
                      type: 'choice/set',
                      key: spec.key,
                      value: active ? null : feat.name,
                      clearPrefix: `${spec.key}_`,
                    })}
                  >
                    <ListItemText
                      primary={<Typography fontWeight={active ? 700 : 500} noWrap>{feat.name}</Typography>}
                      secondary={[feat.category || feat.categories?.[0], featPrereqLabel(feat)].filter(Boolean).join(' - ')}
                    />
                    <Chip size="small" color={active ? 'primary' : 'default'} label={feat.source} />
                  </ListItemButton>
                );
              })}
            </List>
          </Paper>
          {!pool.length ? <Typography color="text.secondary">No feats match.</Typography> : null}
          <FeatDescriptionRows feat={selectedFeat} />
        </Stack>
      </Paper>
      <FeatChoicesPanel feat={selectedFeat} slotKey={spec.key} character={character} state={state} dispatch={dispatch} />
    </Stack>
  );
}
