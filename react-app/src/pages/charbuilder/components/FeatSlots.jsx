import { useState } from 'react';
import { Box, Button, Chip, Collapse, IconButton, List, ListItemButton, ListItemText, Paper, Stack, Typography } from '@mui/material';
import { ChevronDown, ChevronUp } from 'lucide-react';
import ChoiceBlock from './ChoiceBlock.jsx';
import SpellChoiceList from './SpellChoiceList.jsx';
import { EntryBlocks } from '../../../shared/character/EntryBlocks.jsx';
import { ExpandableEntryBlocks } from '../../../shared/character/ExpandableEntryBlocks.jsx';
import { featChoiceSpecs } from '../logic/choiceSpecs.js';
import { getPrimaryClassLevel } from '../logic/calculations.js';
import { entityChipSx } from '../../../shared/entityColors.js';

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

// `kind` colors the slot's feat chip by the granting entity (background origin
// feat → background orange, species feat → species purple, free slots → feat red).
export function FeatFixedSlot({ spec, feats, character, state, dispatch, kind = 'feat' }) {
  const feat = findFeat(feats, spec.fixed);
  const additional = Array.isArray(feat?.additionalSpells) ? feat.additionalSpells : [];
  const entryKey = `${spec.key}_entry`;
  const entryChoiceEnabled = additional.length > 1;
  const rawEntryIdx = character.choices[entryKey];
  const entryIdx = entryChoiceEnabled && rawEntryIdx != null ? Number(rawEntryIdx) : null;
  const grants = feat ? featChoiceSpecs(feat, { slotKey: spec.key, entryIdx }) : [];
  return (
    <Paper variant="outlined" sx={{ p: 1.5, minWidth: 0 }}>
      <Stack spacing={1} sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="h2" sx={{ flex: 1, minWidth: 0 }}>{feat ? feat.name : spec.fixed}</Typography>
          <Chip size="small" label={spec.label} sx={entityChipSx(kind)} />
        </Stack>
        {additional.length > 1 ? (
          <Stack spacing={0.6}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
              {feat?.choiceUi?.listLabel || `${feat?.name || 'Feat'} Spell List`}
            </Typography>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            {additional.map((entry, idx) => (
              <Button
                key={`${spec.key}-entry-${idx}`}
                size="small"
                variant={idx === entryIdx ? 'contained' : 'outlined'}
                onClick={() => dispatch({ type: 'choice/set-entry', key: entryKey, value: idx, clearPrefix: `${spec.key}_spell_` })}
              >
                {grantLabel(entry)}
              </Button>
            ))}
            </Stack>
          </Stack>
        ) : null}
        {feat?.entries ? <ExpandableEntryBlocks entries={feat.entries} /> : null}
        {grants.map((grant) => renderGrantSpec({ grant, character, state, dispatch }))}
      </Stack>
    </Paper>
  );
}

export function FeatCategorySlot({ spec, feats, character, state, dispatch, kind = 'feat' }) {
  const [expanded, setExpanded] = useState(() => new Set());
  const toggleExpanded = (name) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(name)) next.delete(name); else next.add(name);
    return next;
  });

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
  const additional = Array.isArray(selectedFeat?.additionalSpells) ? selectedFeat.additionalSpells : [];
  const entryKey = `${spec.key}_entry`;
  const entryChoiceEnabled = additional.length > 1;
  const rawEntryIdx = character.choices[entryKey];
  const entryIdx = entryChoiceEnabled && rawEntryIdx != null ? Number(rawEntryIdx) : null;
  const grants = selectedFeat ? featChoiceSpecs(selectedFeat, { slotKey: spec.key, entryIdx }) : [];
  return (
    <Paper variant="outlined" sx={{ p: 1.5, minWidth: 0 }}>
      <Stack spacing={1} sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="h2" sx={{ flex: 1, minWidth: 0 }}>{spec.label}</Typography>
          <Chip size="small" label={(spec.categories || []).join('/')} />
          {selected ? <Chip size="small" label={selected} sx={entityChipSx(kind)} /> : null}
        </Stack>
        <Paper variant="outlined" sx={{ maxHeight: 260, overflow: 'auto' }}>
          <List dense disablePadding>
            {pool.map((feat) => {
              const active = selected === feat.name;
              const isOpen = expanded.has(feat.name);
              const hasDesc = Array.isArray(feat.entries) ? feat.entries.length > 0 : !!feat.entries;
              return (
                <Box key={`${spec.key}-${feat.name}-${feat.source}`}>
                  <ListItemButton
                    divider={!isOpen}
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
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Chip size="small" color={active ? 'primary' : 'default'} label={feat.source} />
                      {hasDesc ? (
                        <IconButton
                          size="small"
                          edge="end"
                          aria-label={isOpen ? 'Collapse description' : 'Expand description'}
                          onClick={(e) => { e.stopPropagation(); toggleExpanded(feat.name); }}
                        >
                          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </IconButton>
                      ) : null}
                    </Stack>
                  </ListItemButton>
                  {hasDesc ? (
                    <Collapse in={isOpen} unmountOnExit>
                      <Box sx={{ px: 1.5, py: 0.75, bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider' }}>
                        <EntryBlocks entries={feat.entries} emptyText="" />
                      </Box>
                    </Collapse>
                  ) : null}
                </Box>
              );
            })}
          </List>
        </Paper>
        {!pool.length ? <Typography color="text.secondary">No feats match.</Typography> : null}
        {selectedFeat && additional.length > 1 ? (
          <Stack spacing={0.6}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
              {selectedFeat?.choiceUi?.listLabel || `${selectedFeat?.name || 'Feat'} Spell List`}
            </Typography>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              {additional.map((entry, idx) => (
                <Button
                  key={`${spec.key}-entry-${idx}`}
                  size="small"
                  variant={idx === entryIdx ? 'contained' : 'outlined'}
                  onClick={() => dispatch({ type: 'choice/set-entry', key: entryKey, value: idx, clearPrefix: `${spec.key}_spell_` })}
                >
                  {grantLabel(entry)}
                </Button>
              ))}
            </Stack>
          </Stack>
        ) : null}
        {grants.map((grant) => renderGrantSpec({ grant, character, state, dispatch }))}
      </Stack>
    </Paper>
  );
}
