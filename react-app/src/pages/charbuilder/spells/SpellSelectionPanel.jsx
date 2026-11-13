import { useEffect, useMemo, useState } from 'react';
import { List, Stack } from '@mui/material';
import BuilderPanel from '../layout/BuilderPanel.jsx';
import { SPELL_LEVEL_LABELS, WIZARD_MODES } from '../../../shared/character/spells/spellTables.js';
import { hasSpellcastingProfile } from '../../../shared/character/spells/spellcasting.js';
import { collectAutoGrantedSpells, getSpellCounts, maxSpellLevel } from './spells.js';
import { PickableSpellRow } from '../../../shared/character/spells/SpellReference.jsx';
import { ENTITY_COLORS } from '../../../shared/ui/entityColors.js';
import { matchKey } from '../../../shared/content/nameKeys.js';
import { spellNameIndex } from '../../../shared/character/spells/spellNameIndex.js';
import { spellPickerPool } from '../../../shared/character/spells/spellPickerPool.js';
import { activeClassCharacter, activeExtraClass } from '../state/activeClass.js';
import { isInWizardBook, wizardBookLevel, wizardBookSize } from '../../../shared/character/spells/spellBuckets.js';
import MiniBadge from '../../../shared/ui/MiniBadge.jsx';
import { UI_COLORS } from '../../../shared/ui/colors.js';
import { GAME_ICONS } from '../../../shared/ui/gameIcons.js';
import ScrollWell from '../../../shared/ui/ScrollWell.jsx';
import TagChip from '../../../shared/ui/TagChip.jsx';
import PickCount from '../../../shared/ui/PickCount.jsx';
import EmptyLine from '../../../shared/ui/EmptyLine.jsx';
import ChoiceToggle from '../../../shared/ui/ChoiceToggle.jsx';
import DraftSearchField from '../../../shared/ui/DraftSearchField.jsx';

export default function SpellSelectionPanel({ state, dispatch }) {
  const [wizardMode, setWizardMode] = useState('prepare');
  const { character } = state;
  const activeTab = character.activeClassTab || 0;
  const extraIndex = activeTab > 0 ? activeTab - 1 : null;
  const activeExtra = activeExtraClass(character);
  const activeCharacter = activeClassCharacter(character);
  const { cantrips, spells, profile } = getSpellCounts(activeCharacter);
  const maxLevel = maxSpellLevel(activeCharacter);
  const activeSpellLevel = Number(character.activeSpellLevel ?? 0);
  const level = Math.min(activeSpellLevel, maxLevel || activeSpellLevel);
  const selectedCantrips = (activeExtra ? activeExtra.selectedCantrips : character.selectedCantrips) || [];
  const selectedSpells = (activeExtra ? activeExtra.selectedSpells : character.selectedSpells) || {};
  const selectedSpellsCount = Object.values(selectedSpells).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0);
  const activeIsWizard = String(activeCharacter.className || '').toLowerCase() === 'wizard';
  const activeWizardSpellbook = (activeExtra ? activeExtra.wizardSpellbook : character.wizardSpellbook) || {};
  const activeBucket = { wizardSpellbook: activeWizardSpellbook };
  const activeSpellbookSize = activeIsWizard ? wizardBookSize(activeBucket) : 0;
  const autoGrantedSpells = collectAutoGrantedSpells(activeCharacter);
  const query = state.search.spells;
  const levels = [0, ...Array.from({ length: Math.max(0, maxLevel) }, (_, index) => index + 1)];
  // The class list only for a spellcasting class, as in the sheet's picker: a
  // Barbarian's "list" is its subclasses' fixed spells, so it shows only the
  // spells it is granted.
  const castsSpells = hasSpellcastingProfile(profile);
  const classNames = castsSpells ? [activeCharacter.className].filter(Boolean) : [];
  const spellIndex = useMemo(() => spellNameIndex({ spells: state.data.spells }), [state.data.spells]);
  // Grant names come from 5etools tags ("light"): matched by key, not case.
  const autoByName = new Map(autoGrantedSpells.map((spell) => [matchKey(spell.name), spell]));
  const autoPool = autoGrantedSpells.map((auto) => ({
    ...(spellIndex.get(matchKey(auto.name)) || { name: auto.name, level: auto.level ?? 0 }),
    _autoGranted: auto,
  }));
  const pool = spellPickerPool({
    spells: state.data.spells,
    level,
    classNames,
    classSpellIndex: state.data.classSpellIndex,
    spellbookNames: activeIsWizard && wizardMode === 'prepare' ? wizardBookLevel(activeBucket, level) : null,
    granted: autoPool,
    query,
    limit: 120,
    findSpell: (name) => spellIndex.get(matchKey(name)),
  });
  const isCaster = castsSpells || autoGrantedSpells.length > 0;
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
    <BuilderPanel id="panel-spells" tone={UI_COLORS.spell} title="Spells" icon={GAME_ICONS.spells} note={profile.preparedMode ? `${profile.preparedMode} casting` : 'Known/prepared spell selection'}>
      <Stack spacing={1.5}>
        {!isCaster ? (
          <EmptyLine>No spellcasting for current class/subclass.</EmptyLine>
        ) : (
          <>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              <PickCount size="medium" prefix="Cantrips" count={selectedCantrips.length} max={cantrips} />
              <PickCount size="medium" prefix="Spells" count={selectedSpellsCount} max={spells} />
              {profile.ability ? <TagChip size="medium" label={`Ability ${profile.ability.toUpperCase()}`} /> : null}
            </Stack>
            <DraftSearchField
              placeholder="Search spells"
              value={state.search.spells}
              onChange={(value) => dispatch({ type: 'search/set', scope: 'spells', value })}
            />
            <ChoiceToggle
              wrap
              value={level}
              onChange={(next) => dispatch({ type: 'field/set', field: 'activeSpellLevel', value: next })}
              options={levels.map((spellLevel) => ({ value: spellLevel, label: SPELL_LEVEL_LABELS[spellLevel] || `L${spellLevel}` }))}
            />
            {activeIsWizard ? (
              <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <ChoiceToggle value={wizardMode} onChange={setWizardMode} options={WIZARD_MODES} />
                <TagChip label={`Spellbook ${activeSpellbookSize}`} />
              </Stack>
            ) : null}
            <ScrollWell maxHeight={460} revealKey={`${activeTab}:${level}:${wizardMode}`}>
              <List dense disablePadding>
                {pool.map((spell) => {
                  const autoSelected = autoByName.has(matchKey(spell.name));
                  const manualSelected = level === 0
                    ? containsSpellName(selectedCantrips, spell.name)
                    : containsSpellName(selectedSpells[level] || [], spell.name);
                  const inWizardBook = activeIsWizard ? isInWizardBook(activeBucket, spell.name, level) : false;
                  const selected = wizardBookMode ? inWizardBook : (manualSelected || autoSelected);
                  const atLimit = !selected && !autoSelected && !wizardBookMode
                    && (level === 0 ? selectedCantrips.length >= cantrips : selectedSpellsCount >= spells);
                  const requiresWizardBook = activeIsWizard && !wizardBookMode && !autoSelected && !inWizardBook;
                  const disabled = wizardBookMode ? false : (autoSelected || atLimit || requiresWizardBook);
                  const autoSource = autoByName.get(matchKey(spell.name)) || spell._autoGranted;
                  const autoLabel = autoSelected
                    ? getAutoGrantedLabel(autoSource, activeCharacter)
                    : null;
                  const autoKind = autoSource?.sourceType || 'class';
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
                      autoKind={autoKind}
                      onToggle={onToggle}
                    />
                  );
                })}
              </List>
            </ScrollWell>
            {!pool.length ? (
              <EmptyLine>
                {activeIsWizard && !wizardBookMode ? 'No spells in this Wizard spellbook level.' : 'No spells found for this level/filter.'}
              </EmptyLine>
            ) : null}
          </>
        )}
      </Stack>
    </BuilderPanel>
  );
}

// One spell to pick (PickableSpellRow); an auto-granted spell shows its source
// chip instead of Add/Remove.
function SpellRow({ spell, selected, disabled, autoSelected, autoLabel, autoKind, onToggle }) {
  return (
    <PickableSpellRow
      spell={spell}
      selected={selected}
      disabled={disabled}
      locked={autoSelected}
      onToggle={onToggle}
      source={autoSelected ? <MiniBadge label={autoLabel} color={ENTITY_COLORS[autoKind] || ENTITY_COLORS.class} /> : null}
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

function containsSpellName(list, name) {
  const target = matchKey(name);
  return (list || []).some((entry) => matchKey(entry) === target);
}
