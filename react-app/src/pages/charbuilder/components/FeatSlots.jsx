import { useState } from 'react';
import { Box, Button, Chip, Collapse, List, ListItemButton, ListItemText, Paper, Stack, Typography } from '@mui/material';
import ChoiceBlock from './ChoiceBlock.jsx';
import SpellChoiceList from './SpellChoiceList.jsx';
import { featChoiceSpecs } from '../logic/choiceSpecs.js';
import { getPrimaryClassLevel } from '../logic/calculations.js';
import { renderEntryText, cleanText } from '../logic/text.js';

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

export function FeatFixedSlot({ spec, feats, character, state, dispatch, accent = 'secondary' }) {
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
          <Typography variant="h2" sx={{ flex: 1, minWidth: 0 }}>{spec.label}</Typography>
          <Chip size="small" color={accent} label={feat ? feat.name : spec.fixed} />
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
        {feat?.entries ? <ExpandableDescription entries={feat.entries} /> : null}
        {grants.map((grant) => renderGrantSpec({ grant, character, state, dispatch }))}
      </Stack>
    </Paper>
  );
}

function renderEntryNode(entry, key) {
  if (entry == null) return null;
  if (typeof entry === 'string' || typeof entry === 'number') {
    return <Typography key={key} variant="body2" color="text.secondary" sx={{ mb: 0.25 }}>{cleanText(String(entry))}</Typography>;
  }
  if (Array.isArray(entry)) {
    return entry.map((e, i) => renderEntryNode(e, `${key}-${i}`));
  }
  if (typeof entry !== 'object') return null;
  const k = key;
  if (entry.type === 'list' && Array.isArray(entry.items)) {
    return entry.items.map((item, i) => renderEntryNode(item, `${k}-item-${i}`));
  }
  if (entry.type === 'item' && entry.name && entry.entry != null) {
    return (
      <Box key={k} sx={{ mb: 0.25 }}>
        <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{entry.name}</Box>
        <Box component="span" sx={{ color: 'text.secondary' }}>
          {typeof entry.entry === 'string' ? ` ${cleanText(entry.entry)}` : renderEntryNode(entry.entry, `${k}-val`)}
        </Box>
      </Box>
    );
  }
  if (entry.type === 'item' && entry.entry != null) {
    return <Box key={k} sx={{ mb: 0.25, color: 'text.secondary' }}>{typeof entry.entry === 'string' ? cleanText(entry.entry) : renderEntryNode(entry.entry, `${k}-val`)}</Box>;
  }
  if (entry.type === 'entries' || entry.name) {
    return (
      <Box key={k} sx={{ mb: 0.5 }}>
        {entry.name ? <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.15 }}>{entry.name}</Typography> : null}
        {entry.entries ? renderEntryNode(entry.entries, `${k}-body`) : null}
      </Box>
    );
  }
  if (entry.entries) return <Box key={k} sx={{ mb: 0.25 }}>{renderEntryNode(entry.entries, `${k}-body`)}</Box>;
  if (entry.entry) return <Box key={k} sx={{ mb: 0.25 }}>{renderEntryNode(entry.entry, `${k}-val`)}</Box>;
  if (entry.items) return <Box key={k} sx={{ mb: 0.25 }}>{renderEntryNode(entry.items, `${k}-items`)}</Box>;
  return null;
}

export function ExpandableDescription({ entries, initialClamp = 3, simpleText }) {
  const [open, setOpen] = useState(false);
  if (simpleText != null) {
    const isLong = simpleText.length > 250;
    const lines = simpleText.split('\n').filter(Boolean);
    return (
      <Box sx={{ minWidth: 0 }}>
        <Collapse in={open} collapsedSize={initialClamp * 24}>
          <Typography variant="body2" color="text.secondary" component="div" sx={{ overflow: 'hidden' }}>
            {lines.slice(0, open ? lines.length : initialClamp).map((line, i) => {
              const colonIdx = line.indexOf(':');
              if (colonIdx > 0) return (
                <Box key={i} sx={{ mb: 0.25 }}>
                  <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{line.slice(0, colonIdx + 1)}</Box>
                  <Box component="span">{line.slice(colonIdx + 1)}</Box>
                </Box>
              );
              return <Box key={i} sx={{ mb: 0.25 }}>{line}</Box>;
            })}
            {!open && lines.length > initialClamp ? <Box sx={{ color: 'text.disabled', fontStyle: 'italic' }}>...</Box> : null}
          </Typography>
        </Collapse>
        {isLong ? (
          <Button size="small" onClick={() => setOpen(!open)}
            sx={{ mt: 0.25, fontSize: '0.7rem', minWidth: 0, px: 0.5, color: 'primary.light', textTransform: 'none' }}>
            {open ? 'Show less' : 'Show more'}
          </Button>
        ) : null}
      </Box>
    );
  }
  const arr = Array.isArray(entries) ? entries : (entries ? [entries] : []);
  const rendered = arr.flatMap((e, i) => renderEntryNode(e, `e${i}`)).filter(Boolean);
  const totalText = renderEntryText(entries);
  const isLong = rendered.length > initialClamp || totalText.length > 250;
  const visible = open ? rendered : rendered.slice(0, initialClamp);
  return (
    <Box sx={{ minWidth: 0 }}>
      <Collapse in={open} collapsedSize={initialClamp * 24}>
        {visible}
        {!open && rendered.length > initialClamp ? <Box sx={{ color: 'text.disabled', fontStyle: 'italic', mt: 0.25 }}>...</Box> : null}
      </Collapse>
      {isLong ? (
        <Button size="small" onClick={() => setOpen(!open)}
          sx={{ mt: 0.25, fontSize: '0.7rem', minWidth: 0, px: 0.5, color: 'primary.light', textTransform: 'none' }}>
          {open ? 'Show less' : 'Show more'}
        </Button>
      ) : null}
    </Box>
  );
}

function ExpandableDesc({ text }) {
  const [open, setOpen] = useState(false);
  const isLong = text.length > 250;
  return (
    <Box sx={{ minWidth: 0 }}>
      <Collapse in={open} collapsedSize={72}>
        <Typography variant="body2" color="text.secondary" sx={{
          display: '-webkit-box',
          WebkitLineClamp: open ? 'unset' : 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {text}
        </Typography>
      </Collapse>
      {isLong ? (
        <Button size="small" onClick={() => setOpen(!open)}
          sx={{ mt: 0.25, fontSize: '0.7rem', minWidth: 0, px: 0.5, color: 'primary.light', textTransform: 'none' }}>
          {open ? 'Show less' : 'Show more'}
        </Button>
      ) : null}
    </Box>
  );
}

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
          {selected ? <Chip size="small" color="primary" label={selected} /> : null}
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
        {selectedFeat?.entries ? <ExpandableDescription entries={selectedFeat.entries} /> : null}
        {grants.map((grant) => renderGrantSpec({ grant, character, state, dispatch }))}
      </Stack>
    </Paper>
  );
}
