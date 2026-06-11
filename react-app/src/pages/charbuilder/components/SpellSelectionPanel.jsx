import { useEffect, useMemo, useState } from 'react';
import { Box, Chip, InputAdornment, List, ListItemButton, Paper, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { BookOpen, Search } from 'lucide-react';
import BuilderPanel from './BuilderPanel.jsx';
import { SPELL_LEVEL_LABELS } from '../constants.js';
import { collectAutoGrantedSpells, getSpellCounts, maxSpellLevel, spellMatchesAnyClass } from '../spells/spells.js';
import { SpellReferenceBody, SpellRowLabel, SpellSelectButton } from '../../../shared/character/SpellReference.jsx';
import { ExpandableCard } from '../../../shared/character/ExpandableCard.jsx';

export default function SpellSelectionPanel({ state, dispatch }) {
  const [wizardMode, setWizardMode] = useState('prepare');
  const { character } = state;
  const activeTab = character.activeClassTab || 0;
  const extraIndex = activeTab > 0 ? activeTab - 1 : null;
  const activeExtra = extraIndex != null ? character.extraClasses?.[extraIndex] : null;
  const activeCharacter = activeExtra ? {
    ...character,
    className: activeExtra.name,
    classSource: activeExtra.source,
    classLevel: activeExtra.level || 1,
    level: activeExtra.level || 1,
    cls: activeExtra.cls,
    subclassShortName: activeExtra.subclassShortName || '',
    allSubFeatures: activeExtra.allSubFeatures || [],
    extraClasses: [],
  } : character;
  const { cantrips, spells, profile } = getSpellCounts(activeCharacter);
  const maxLevel = maxSpellLevel(activeCharacter);
  const activeSpellLevel = Number(character.activeSpellLevel ?? 0);
  const level = Math.min(activeSpellLevel, maxLevel || activeSpellLevel);
  const selectedCantrips = (activeExtra ? activeExtra.selectedCantrips : character.selectedCantrips) || [];
  const selectedSpells = (activeExtra ? activeExtra.selectedSpells : character.selectedSpells) || {};
  const selectedSpellsCount = Object.values(selectedSpells).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0);
  const activeIsWizard = String(activeCharacter.className || '').toLowerCase() === 'wizard';
  const activeWizardSpellbook = (activeExtra ? activeExtra.wizardSpellbook : character.wizardSpellbook) || {};
  const activeSpellbookSize = activeIsWizard ? getSpellbookSize(activeWizardSpellbook) : 0;
  const autoGrantedSpells = collectAutoGrantedSpells(activeCharacter);
  const query = state.search.spells.toLowerCase();
  const levels = [0, ...Array.from({ length: Math.max(0, maxLevel) }, (_, index) => index + 1)];
  const classNames = [activeCharacter.className].filter(Boolean);
  const spellIndex = useMemo(() => {
    const map = new Map();
    state.data.spells.forEach((spell) => {
      if (!spell?.name) return;
      map.set(normSpell(spell.name), spell);
    });
    return map;
  }, [state.data.spells]);
  const autoNames = new Set(autoGrantedSpells.map((spell) => spell.name));
  const autoByName = new Map(autoGrantedSpells.map((spell) => [spell.name, spell]));
  const spellbookNames = activeIsWizard && wizardMode === 'prepare' ? getSpellbookLevel(activeWizardSpellbook, level) : null;
  const autoPool = autoGrantedSpells.map((auto) => ({
    ...(state.data.spells.find((spell) => spell.name === auto.name) || { name: auto.name, level: auto.level ?? 0 }),
    _autoGranted: auto,
  }));
  const basePool = spellbookNames
    ? spellbookNames.map((name) => spellIndex.get(normSpell(name)) || { name, level })
    : state.data.spells
      .filter((spell) => spell.level === level)
      .filter((spell) => spellMatchesAnyClass(spell, classNames, state.data.classSpellIndex))
      .filter((spell) => !query || spell.name.toLowerCase().includes(query) || String(spell.schoolFull || spell.school || '').toLowerCase().includes(query));
  const pool = dedupeSpells([...autoPool.filter((spell) => Number(spell.level || 0) === level), ...basePool])
    .filter((spell) => !query || spell.name.toLowerCase().includes(query) || String(spell.schoolFull || spell.school || '').toLowerCase().includes(query))
    .slice(0, 120);
  const isCaster = !!profile.casterProgression || cantrips > 0 || spells > 0 || maxLevel > 0 || autoGrantedSpells.length > 0;
  const wizardBookMode = activeIsWizard && wizardMode === 'book';

  useEffect(() => {
    if (!activeIsWizard && wizardMode !== 'prepare') {
      setWizardMode('prepare');
    }
  }, [activeIsWizard, wizardMode]);

  useEffect(() => {
    setWizardMode('prepare');
  }, [activeTab]);

  return (
    <BuilderPanel id="panel-spells" title="Spells" icon={BookOpen} note={profile.preparedMode ? `${profile.preparedMode} casting` : 'Known/prepared spell selection'}>
      <Stack spacing={1.5}>
        {!isCaster ? (
          <Typography color="text.secondary">No spellcasting for current class/subclass.</Typography>
        ) : (
          <>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip color={selectedCantrips.length > cantrips ? 'error' : 'primary'} label={`Cantrips ${selectedCantrips.length}/${cantrips}`} />
              <Chip color={selectedSpellsCount > spells ? 'error' : 'primary'} label={`Spells ${selectedSpellsCount}/${spells}`} />
              {profile.ability ? <Chip label={`Ability ${profile.ability.toUpperCase()}`} /> : null}
            </Stack>
            <TextField
              fullWidth
              value={state.search.spells}
              placeholder="Search spells"
              onChange={(event) => dispatch({ type: 'search/set', scope: 'spells', value: event.target.value })}
              slotProps={{ input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} />
                  </InputAdornment>
                ),
              } }}
            />
            <ToggleButtonGroup size="small" exclusive value={level} onChange={(_, next) => next != null && dispatch({ type: 'field/set', field: 'activeSpellLevel', value: next })}>
              {levels.map((spellLevel) => (
                <ToggleButton key={spellLevel} value={spellLevel}>
                  {SPELL_LEVEL_LABELS[spellLevel] || `L${spellLevel}`}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            {activeIsWizard ? (
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <ToggleButtonGroup size="small" exclusive value={wizardMode} onChange={(_, next) => next && setWizardMode(next)}>
                  <ToggleButton value="prepare">Prepare</ToggleButton>
                  <ToggleButton value="book">Spellbook</ToggleButton>
                </ToggleButtonGroup>
                <Chip label={`Spellbook ${activeSpellbookSize}`} size="small" />
              </Stack>
            ) : null}
            <Paper variant="outlined" sx={{ maxHeight: 460, overflow: 'auto' }}>
              <List dense disablePadding>
                {pool.map((spell) => {
                  const autoSelected = autoNames.has(spell.name);
                  const manualSelected = level === 0
                    ? containsSpellName(selectedCantrips, spell.name)
                    : containsSpellName(selectedSpells[level] || [], spell.name);
                  const inWizardBook = activeIsWizard ? isInWizardBook(activeWizardSpellbook, spell.name, level) : false;
                  const selected = wizardBookMode ? inWizardBook : (manualSelected || autoSelected);
                  const atLimit = !selected && !autoSelected && !wizardBookMode
                    && (level === 0 ? selectedCantrips.length >= cantrips : selectedSpellsCount >= spells);
                  const requiresWizardBook = activeIsWizard && !wizardBookMode && !autoSelected && !inWizardBook;
                  const disabled = wizardBookMode ? false : (autoSelected || atLimit || requiresWizardBook);
                  const autoLabel = autoSelected
                    ? getAutoGrantedLabel(autoByName.get(spell.name) || spell._autoGranted, activeCharacter)
                    : null;
                  const onToggle = () => {
                    if (disabled) return;
                    if (wizardBookMode) {
                      dispatch({ type: 'wizard/spellbook-toggle', level, name: spell.name, extraIndex });
                      return;
                    }
                    dispatch({ type: 'spell/toggle', level, name: spell.name, max: level === 0 ? cantrips : spells, extraIndex });
                  };
                  return (
                    <SpellRow
                      key={`${spell.name}-${spell.source}`}
                      spell={spell}
                      selected={selected}
                      disabled={disabled}
                      autoSelected={autoSelected}
                      autoLabel={autoLabel}
                      onToggle={onToggle}
                    />
                  );
                })}
              </List>
            </Paper>
            {!pool.length ? (
              <Typography color="text.secondary">
                {activeIsWizard && !wizardBookMode ? 'No spells in this Wizard spellbook level.' : 'No spells found for this level/filter.'}
              </Typography>
            ) : null}
          </>
        )}
      </Stack>
    </BuilderPanel>
  );
}

// One spell row. Tapping the row expands the full rich-text reference
// (SpellReferenceBody: meta grid + description + upcast). Selection is an
// explicit Add/Remove button on the right (auto-granted spells show a static
// source chip instead). Expand mechanic lives in ExpandableCard.
function SpellRow({ spell, selected, disabled, autoSelected, autoLabel, onToggle }) {
  return (
    <ExpandableCard
      containerSx={{ borderBottom: 1, borderColor: 'divider' }}
      bodySx={{ px: 2, pt: 0.25, pb: 1.25 }}
      body={<SpellReferenceBody spell={spell} />}
      header={({ open, toggle }) => (
        <ListItemButton selected={selected} aria-expanded={open} sx={{ alignItems: 'center', gap: 0.5 }} onClick={toggle}>
          <SpellRowLabel spell={spell} selected={selected} />
          {autoSelected ? (
            <Chip size="small" color="secondary" label={autoLabel} sx={{ flexShrink: 0 }} />
          ) : (
            <SpellSelectButton selected={selected} disabled={disabled} onToggle={onToggle} />
          )}
        </ListItemButton>
      )}
    />
  );
}

function getAutoGrantedLabel(spell, character) {
  const raw = String(spell?.source || '').trim();
  if (raw && !/^(auto|class|class spell|class spells|subclass|subclass spell|subclass spells)$/i.test(raw)) {
    return raw;
  }

  if (spell?.sourceType === 'subclass') {
    return character?.subclassShortName || 'Subclass';
  }

  if (spell?.sourceType === 'class') {
    return character?.className || 'Class';
  }

  if (/^subclass/i.test(raw)) return character?.subclassShortName || 'Subclass';
  if (/^class/i.test(raw)) return character?.className || 'Class';

  return character?.subclassShortName || character?.className || 'Auto';
}


function dedupeSpells(spells) {
  const seen = new Set();
  return (spells || []).filter((spell) => {
    const key = String(spell?.name || '').toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normSpell(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function containsSpellName(list, name) {
  const target = normSpell(name);
  return (list || []).some((entry) => normSpell(entry) === target);
}

function normalizeWizardBook(book) {
  const next = {};
  for (let level = 0; level <= 9; level++) {
    const seen = new Set();
    next[level] = [];
    (book?.[level] || []).forEach((entry) => {
      const name = typeof entry === 'string' ? entry : entry?.name;
      const key = normSpell(name);
      if (!key || seen.has(key)) return;
      seen.add(key);
      next[level].push(name);
    });
  }
  return next;
}

function getSpellbookLevel(book, level) {
  return normalizeWizardBook(book)[Number(level || 0)] || [];
}

function getSpellbookSize(book) {
  return Object.values(normalizeWizardBook(book)).reduce((sum, list) => sum + list.length, 0);
}

function isInWizardBook(book, name, level) {
  return getSpellbookLevel(book, level).some((entry) => normSpell(entry) === normSpell(name));
}
