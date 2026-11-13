import { useEffect, useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import SearchField from '../../../shared/ui/SearchField.jsx';
import { SPELL_LEVEL_LABELS, WIZARD_MODES } from '../../../shared/character/spells/spellTables.js';
import SheetDialog from '../../../shared/ui/SheetDialog.jsx';
import {
  getMaxLearnableSpellLevel,
  getMaxLearnableSpellLevelForEntity,
  getSpellEntities,
  getSpellcastingProfile,
  hasSpellcastingProfile,
} from '../../../shared/character/spells/spellcasting.js';
import { useSheetActions } from '../state/SheetActionsContext.jsx';
import { matchKey } from '../../../shared/content/nameKeys.js';
import { spellSourceKey } from '../../../shared/character/spells/spellNameIndex.js';
import { UI_COLORS } from '../../../shared/ui/colors.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import {
  bucketCounts,
  isInWizardBook,
  wizardBookLevel,
  wizardBookSize,
} from '../../../shared/character/spells/spellBuckets.js';
import { PickerSpellRow } from './SpellPickerRow.jsx';
import { scrollWellSx } from '../../../shared/ui/surfaces.js';
import { getPickerLimits } from './spellPickerLimits.js';
import { spellPickerActions } from './spellPickerActions.js';
import { spellPickerPool } from '../../../shared/character/spells/spellPickerPool.js';
import { sheetBoxSx } from '../../../shared/ui/PanelHeader.jsx';
import { TEXT_STYLES } from '../../../shared/ui/textStyles.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import EmptyLine from '../../../shared/ui/EmptyLine.jsx';
import ChoiceToggle from '../../../shared/ui/ChoiceToggle.jsx';
import { GAME_ICONS } from '../../../shared/ui/gameIcons.js';

// The sheet's Add / Remove Spell dialog: one caster class at a time, a spell
// level, and the spells it may pick (spellPickerPool) — or, for a Wizard,
// prepare from the spellbook or edit the book. Stays mounted while closed so
// the class, level and search are kept.
export function SpellPickerDialog({
  open, onClose, C, catalog, lockedSourceBySpell,
}) {
  const { onUpdateSpells } = useSheetActions();
  const { spellDb, spellIndex, classSpellIndex, adapterRevision } = catalog;
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerLevel, setPickerLevel] = useState(0);
  const [pickerClassIndex, setPickerClassIndex] = useState(0);
  const [pickerWizardMode, setPickerWizardMode] = useState('prepare');
  const maxSpellLevel = useMemo(() => getMaxLearnableSpellLevel(C), [C, classSpellIndex, adapterRevision]);
  const casterPickers = useMemo(() => getSpellEntities(C)
    .map((entity, index) => {
      const profile = getSpellcastingProfile(entity);
      const isPrimary = index === 0;
      const extraIndex = isPrimary ? null : index - 1;
      const bucket = isPrimary ? C : C?.extraClasses?.[extraIndex];
      const maxLevel = getMaxLearnableSpellLevelForEntity(entity);
      return {
        ...entity,
        profile,
        isPrimary,
        extraIndex,
        bucket,
        maxLevel,
        label: `${entity.className}${entity.subclassShortName ? ` · ${entity.subclassShortName}` : ''}`,
        note: `Lv ${entity.level}${profile?.preparedMode ? ` · ${profile.preparedMode}` : ''}`,
      };
    })
    .filter((entity) => entity.bucket && hasSpellcastingProfile(entity.profile)), [C, classSpellIndex, adapterRevision]);
  const activePicker = casterPickers[Math.min(pickerClassIndex, Math.max(0, casterPickers.length - 1))] || null;
  const activeLimits = useMemo(() => activePicker ? getPickerLimits(C, activePicker) : { cantrips: null, spells: null }, [C, activePicker]);
  const activeCounts = useMemo(() => activePicker ? bucketCounts(activePicker.bucket) : { cantrips: 0, spells: 0 }, [activePicker]);
  const activeIsWizard = String(activePicker?.className || '').toLowerCase() === 'wizard';
  const activeSpellbookSize = activeIsWizard ? wizardBookSize(activePicker?.bucket) : 0;
  useEffect(() => {
    if (pickerLevel > 0 && pickerLevel > maxSpellLevel) setPickerLevel(maxSpellLevel > 0 ? maxSpellLevel : 0);
  }, [pickerLevel, maxSpellLevel]);

  useEffect(() => {
    if (pickerClassIndex >= casterPickers.length) setPickerClassIndex(0);
  }, [pickerClassIndex, casterPickers.length]);

  useEffect(() => {
    if (activePicker && pickerLevel > activePicker.maxLevel) setPickerLevel(activePicker.maxLevel > 0 ? activePicker.maxLevel : 0);
    if (!activeIsWizard && pickerWizardMode !== 'prepare') setPickerWizardMode('prepare');
  }, [activePicker, activeIsWizard, pickerLevel, pickerWizardMode]);

  const pickerList = useMemo(() => (activePicker ? spellPickerPool({
    spells: spellDb,
    level: pickerLevel,
    // Until the class lists load, every spell of the level is offered.
    classNames: Object.keys(classSpellIndex).length ? [activePicker.className] : null,
    classSpellIndex,
    maxLevel: activePicker.maxLevel,
    spellbookNames: activeIsWizard && pickerWizardMode === 'prepare'
      ? wizardBookLevel(activePicker.bucket, pickerLevel)
      : null,
    query: pickerSearch,
    // A spellbook spell missing from the catalog is still known by its snapshot.
    findSpell: (name) => spellIndex.get(matchKey(name)),
  }) : []), [spellDb, spellIndex, pickerLevel, pickerSearch, classSpellIndex, activePicker, activeIsWizard, pickerWizardMode]);

  const {
    selectedManualNames, addSpell, removeSpell, toggleWizardBookSpell, toggleWizardPreparedSpell,
  } = spellPickerActions({ C, activePicker, activeLimits, activeCounts, activeIsWizard, onUpdateSpells });

  return (
    <SheetDialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      title="Spells"
      icon={<GAME_ICONS.magic size={ICON_SIZES.xl} />}
      showClose
      topPad={2}
      headerRight={(
        <Typography sx={{ fontSize: FONT_SIZES.lg, color: 'text.secondary' }}>
          {activePicker ? `${activePicker.label} - Cantrips ${activeCounts.cantrips}/${activeLimits.cantrips ?? '-'} - Spells ${activeCounts.spells}/${activeLimits.spells ?? '-'}` : 'No caster class'}
        </Typography>
      )}
    >
      {casterPickers.length > 1 ? (
        <ChoiceToggle
          wrap
          value={pickerClassIndex}
          onChange={(index) => { setPickerClassIndex(index); setPickerLevel(0); setPickerWizardMode('prepare'); }}
          options={casterPickers.map((caster, index) => ({ value: index, label: `${caster.label} (${caster.note})` }))}
          sx={{ mb: 0.75 }}
        />
      ) : null}

      {activePicker ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: activeIsWizard ? '1fr auto' : '1fr' }, gap: 0.5, mb: 0.75 }}>
          <Box sx={{ ...sheetBoxSx, px: 1, py: 0.75, display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography sx={{ ...TEXT_STYLES.title, fontSize: FONT_SIZES.md, color: UI_COLORS.accentText }}>{activePicker.label}</Typography>
            <Typography sx={{ fontSize: FONT_SIZES.sm, color: 'text.secondary' }}>{activePicker.note}</Typography>
            <Typography sx={{ fontSize: FONT_SIZES.sm, color: 'text.secondary' }}>Max level {activePicker.maxLevel || 0}</Typography>
            {activeIsWizard ? <Typography sx={{ fontSize: FONT_SIZES.sm, color: UI_COLORS.info }}>Spellbook {activeSpellbookSize}</Typography> : null}
          </Box>
          {activeIsWizard ? (
            <ChoiceToggle value={pickerWizardMode} onChange={setPickerWizardMode} options={WIZARD_MODES} />
          ) : null}
        </Box>
      ) : null}

      <Box sx={{ display: 'grid', gap: 0.5, mb: 0.75 }}>
        <SearchField
          placeholder={spellDb.length ? 'Search spells...' : 'Loading spells...'}
          value={pickerSearch}
          onChange={setPickerSearch}
          density="compact"
        />
        <Box sx={{ overflowX: 'auto', pb: 0.25 }}>
          <ChoiceToggle
            value={pickerLevel}
            onChange={setPickerLevel}
            options={SPELL_LEVEL_LABELS.map((label, level) => ({
              value: level,
              disabled: Boolean(level > 0 && activePicker && level > activePicker.maxLevel),
              label: level === 0 ? `Can ${activePicker?.bucket?.selectedCantrips?.length || 0}/${activeLimits.cantrips ?? '-'}` : `${level} ${activePicker?.bucket?.selectedSpells?.[level]?.length || 0}/${activeLimits.spells ?? '-'}`,
            }))}
            sx={{ minWidth: 'max-content' }}
          />
        </Box>
      </Box>
      <Box sx={scrollWellSx('58vh')}>
        {pickerList.map((spell) => {
          const manualSelected = selectedManualNames.has(spell.name);
          // `autoGranted` = the spell is granted by a source (class/subclass/feat/…),
          // so it always carries a source badge. `locked` = not user-editable in the
          // current mode. In Wizard "book" mode the row stays editable (you manage the
          // spellbook), but the badge must still show — hence the two are decoupled.
          const autoEntry = lockedSourceBySpell.get(spellSourceKey(spell.name, spell.source));
          const autoGranted = !!autoEntry;
          const locked = pickerWizardMode === 'book' ? false : autoGranted;
          const inWizardBook = activeIsWizard && isInWizardBook(activePicker?.bucket, spell.name, Number(spell.level || 0));
          const selected = activeIsWizard && pickerWizardMode === 'book' ? inWizardBook : (manualSelected || locked);
          const atLimit = !selected && !locked && pickerWizardMode !== 'book' && ((spell.level === 0 && activeLimits.cantrips != null && activeCounts.cantrips >= activeLimits.cantrips)
            || (spell.level > 0 && activeLimits.spells != null && activeCounts.spells >= activeLimits.spells)
            || (spell.level > 0 && activePicker && spell.level > activePicker.maxLevel));
          const disabled = locked || atLimit || !activePicker;
          const onToggle = () => {
            if (disabled) return;
            if (activeIsWizard && pickerWizardMode === 'book') { toggleWizardBookSpell(spell); return; }
            if (activeIsWizard) { toggleWizardPreparedSpell(spell); return; }
            manualSelected ? removeSpell(spell) : addSpell(spell);
          };
          return (
            <PickerSpellRow
              key={`${spell.name}-${spell.source}`}
              spell={spell}
              selected={selected}
              disabled={disabled}
              atLimit={atLimit}
              autoGranted={autoGranted}
              locked={locked}
              sourceInfo={autoEntry?.sourceInfo}
              sources={autoEntry?.sources}
              onToggle={onToggle}
            />
          );
        })}
        {!pickerList.length ? (
          <EmptyLine framed>{activeIsWizard && pickerWizardMode === 'prepare' ? 'No spells in this Wizard spellbook level.' : 'No spells found for this class/level.'}</EmptyLine>
        ) : null}
      </Box>
    </SheetDialog>
  );
}
