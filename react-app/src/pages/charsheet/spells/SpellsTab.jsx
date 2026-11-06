import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Alert,
  Button,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { Plus, Sparkles } from 'lucide-react';
import SearchField from '../../../shared/ui/SearchField.jsx';
import { SPELL_LEVEL_LABELS } from '../../../shared/character/spells/spellTables.js';
import { effectiveD20Modifier } from '../../../shared/character/sheet/sheetStats.js';
import { scrollRowKey } from '../../../shared/character/inventory/spellScrolls.js';
import { spellMatchesClass } from '../../../shared/character/spells/spellClassMatch.js';
import { adapterRegistry } from '../../../adapters/index.js';
import { getEquippedArmorPenalties } from '../inventory/armorPenalties.js';
import { useProficiencySets } from '../proficiency/ProficiencySetsContext.jsx';
import SheetDialog from '../../../shared/ui/SheetDialog.jsx';
import { buildSpellInfo } from './spellsTabLogic.js';
import { dedupeSpells, toSnapshot, upsertSnapshot } from '../../../shared/character/spells/spellSnapshots.js';
import { getSpellAbility } from './spellAbility.js';
import {
  canManageSpells,
  getMaxLearnableSpellLevel,
  getMaxLearnableSpellLevelForEntity,
  getSheetSlots,
  getSpellEntities,
  getSpellcastingProfile,
  getSpellLimits,
  hasSpellcastingProfile,
} from './spellcasting.js';
import { getPactMagicInfo, getSpellCastMode } from '../../../shared/character/spells/pactMagic.js';
import {
  addButtonSx,
  compactInputSx,
  filterChipSx,
  levelToggleSx,
  panelRootSx,
  panelToolbarSx,
} from './spellsTabStyles.js';
import SpellEntry from './SpellEntry.jsx';
import { Empty, SlotPanel, SpellSection, StatBox } from './SpellsUiParts.jsx';
import { useSheetActions } from '../state/SheetActionsContext.jsx';
import {
  getPactSlotUsed, getPactSlotUsedKey, getRegularSlotUsed, persistCreatedSlots, persistUsedSlots,
} from '../../../shared/character/spells/spellSlots.js';
import { signed } from '../../../shared/ui/numberFormat.js';
import { lowerKey } from '../../../shared/content/nameKeys.js';
import { UI_COLORS } from '../../../shared/ui/colors.js';
import { UI_FONTS } from '../../../shared/ui/fonts.js';
import { ABILITY_ABBREVIATIONS } from '../../../shared/content/rulesVocabulary.js';
import { matchesQuery } from '../../../shared/content/searchText.js';
import { classNames } from '../../../shared/character/progression/classLevel.js';
import { spellcastingNumbers } from '../../../shared/character/spells/spellcastingNumbers.js';
import {
  bucketCounts, isInWizardBook, wizardBookLevel, wizardBookSize, withoutSpellPicked, withSpellPicked,
  withWizardBookToggled,
} from '../../../shared/character/spells/spellBuckets.js';
import { PickerSpellRow } from './SpellPickerRow.jsx';
import { getPickerLimits } from './spellPickerLimits.js';
import { useSpellCatalog } from './useSpellCatalog.js';

const SPELL_ACTION_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'action', label: 'Action' },
  { key: 'bonus', label: 'Bonus Action' },
  { key: 'reaction', label: 'Reaction' },
];

function getSpellActionFilter(entry) {
  const unit = String(entry?.time?.[0]?.unit || '').toLowerCase();
  if (unit === 'bonus') return 'bonus';
  if (unit === 'reaction') return 'reaction';
  if (unit === 'action') return 'action';
  if (unit) return 'other';

  const castingTime = String(entry?.castingTimeLabel || entry?.castingTime || '').toLowerCase();
  if (/\breaction\b/.test(castingTime)) return 'reaction';
  if (/\bbonus\b/.test(castingTime)) return 'bonus';
  if (/\baction\b/.test(castingTime)) return 'action';
  return 'action';
}

export default function SpellsTab({ C, sheet, freeCastUses }) {
  const { onUpdateSpells, onUpdateSheet, onUpdateCharacter, readOnly } = useSheetActions();
  const [spellSearch, setSpellSearch] = useState('');
  const [spellFilter, setSpellFilter] = useState('all');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerLevel, setPickerLevel] = useState(0);
  const [pickerClassIndex, setPickerClassIndex] = useState(0);
  const [pickerWizardMode, setPickerWizardMode] = useState('prepare');
  const [slotUsed, setSlotUsed] = useState(sheet?.spellSlotUsed || {});
  const [createdSlots, setCreatedSlots] = useState(sheet?.createdSpellSlots || {});

  const {
    spellDb, spellVersions, classSpellIndex, catalogStatus, adapterRevision,
  } = useSpellCatalog(classNames(C));

  useEffect(() => {
    setSlotUsed(sheet?.spellSlotUsed || {});
    setCreatedSlots(sheet?.createdSpellSlots || {});
  }, [sheet?.spellSlotUsed, sheet?.createdSpellSlots]);

  const spellIndex = useMemo(() => {
    const map = new Map();
    spellDb.forEach((spell) => { if (spell?.name) map.set(lowerKey(spell.name), spell); });
    spellVersions.forEach((spell) => {
      if (spell?.name && spell.source) map.set(`${lowerKey(spell.name)}|${lowerKey(spell.source)}`, spell);
    });
    (C?.spellSnapshots || []).forEach((spell) => {
      if (spell?.name && !map.has(lowerKey(spell.name))) map.set(lowerKey(spell.name), spell);
      const key = `${lowerKey(spell?.name)}|${lowerKey(spell?.source)}`;
      if (spell?.name && spell.source && !map.has(key)) map.set(key, spell);
    });
    return map;
  }, [spellDb, spellVersions, C?.spellSnapshots]);

  const spellInfo = useMemo(() => buildSpellInfo(C, spellIndex), [C, spellIndex, adapterRevision]);
  const slots = useMemo(() => getSheetSlots(C), [C, adapterRevision]);
  const expandedSpellInfo = useMemo(() => {
    if (!spellInfo) return spellInfo;
    const maxRegular = (slots.regular || []).reduce((m, c, i) => c > 0 ? i + 1 : m, 0);
    const maxPact = slots.pact?.level || 0;
    const maxSlotLv = Math.max(maxRegular, maxPact);
    if (maxSlotLv <= 0) return spellInfo;

    const pactInfo = getPactMagicInfo(C);
    const result = {
      cantrips: spellInfo.cantrips,
      atWill: spellInfo.atWill,
      leveled: {},
      lockedNames: spellInfo.lockedNames,
      lockedEntries: spellInfo.lockedEntries,
    };
    const addLeveledEntry = (slotLevel, nextEntry) => {
      const lv = Number(slotLevel || 0);
      if (lv <= 0) return;
      if (!result.leveled[lv]) result.leveled[lv] = [];
      const castLv = Number(nextEntry?.castLevel || nextEntry?.level || lv);
      const idx = result.leveled[lv].findIndex((existing) => (
        lowerKey(existing?.name) === lowerKey(nextEntry?.name)
        && lowerKey(existing?.source) === lowerKey(nextEntry?.source)
        && Number(existing?.castLevel || existing?.level || lv) === castLv
      ));
      if (idx >= 0) {
        const existing = result.leveled[lv][idx];
        if (existing?.castMode !== 'pact_magic' && nextEntry?.castMode === 'pact_magic') {
          result.leveled[lv][idx] = nextEntry;
        }
        return;
      }
      result.leveled[lv].push(nextEntry);
    };

    Object.entries(spellInfo.leveled).forEach(([level, entries]) => {
      entries.forEach((entry) => {
        if (entry.level <= 0) return;
        if (entry.originType === 'item' && entry.consumesSlot === false) {
          addLeveledEntry(Number(level), {
            ...entry,
            castLevel: Number(level),
            castMode: entry.originType === 'item' ? 'item' : (entry.castMode || 'regular'),
          });
          return;
        }
        const baseLevel = Number(level);
        const castMode = getSpellCastMode(C, entry, pactInfo);
        if (castMode.mode === 'pact_magic') {
          const pactLevel = Number(castMode.castLevel || baseLevel);
          addLeveledEntry(pactLevel, { ...entry, castLevel: pactLevel, castMode: 'pact_magic' });
          if (slots.regular?.[baseLevel - 1] > 0) {
            addLeveledEntry(baseLevel, { ...entry, castLevel: baseLevel, castMode: 'regular' });
          }
        } else {
          addLeveledEntry(baseLevel, { ...entry, castLevel: baseLevel, castMode: castMode.mode || 'regular' });
        }
      });
    });

    Object.entries(spellInfo.leveled).forEach(([level, entries]) => {
      entries.forEach((entry) => {
        if (entry.level <= 0) return;
        if (entry.originType === 'item' && entry.consumesSlot === false) return;
        if (entry.ritualOnly) return;
        if (!entry.entriesHigherLevel) return;
        const baseLevel = Number(level);
        const castMode = getSpellCastMode(C, entry, pactInfo);
        for (let lv = baseLevel + 1; lv <= maxSlotLv; lv++) {
          const hasRegularSlot = slots.regular?.[lv - 1] > 0;
          const hasPactSlot = slots.pact?.level === lv && slots.pact.count > 0;
          // The allowance belongs to the granted spell, not to every upcast row.
          const upcastEntry = { ...entry, freeCasts: undefined, castLevel: lv };
          if (castMode.mode === 'pact_magic') {
            if (hasRegularSlot) addLeveledEntry(lv, { ...upcastEntry, castMode: 'regular' });
          } else if (hasRegularSlot || hasPactSlot) {
            addLeveledEntry(lv, { ...upcastEntry, castMode: castMode.mode || 'regular' });
          }
        }
      });
    });
    return result;
  }, [spellInfo, slots, C]);
  const lockedSourceBySpell = useMemo(() => {
    const map = new Map();
    (spellInfo?.lockedEntries || []).forEach((entry) => {
      if (entry?.name) map.set(`${lowerKey(entry.name)}|${lowerKey(entry.source)}`, entry);
    });
    return map;
  }, [spellInfo]);
  const maxSpellLevel = useMemo(() => getMaxLearnableSpellLevel(C), [C, classSpellIndex, adapterRevision]);
  const limits = useMemo(() => getSpellLimits(C), [C, classSpellIndex, adapterRevision]);
  const canManageSpellList = useMemo(() => canManageSpells(C, limits), [C, limits]);
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
  const profSets = useProficiencySets();
  const armorPenalties = useMemo(() => getEquippedArmorPenalties(C, C?.inventory || [], profSets), [C, profSets]);
  const ability = getSpellAbility(C);
  const inventoryForBonuses = sheet?.sheetInventory || C?.inventory || [];
  const { attack: atk, dc } = spellcastingNumbers(C, ability, { inventory: inventoryForBonuses });

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

  const pickerList = useMemo(() => {
    if (!activePicker) return [];
    const hasIndex = Object.keys(classSpellIndex).length > 0;
    const spellbookNames = activeIsWizard && pickerWizardMode === 'prepare'
      ? wizardBookLevel(activePicker.bucket, pickerLevel)
      : null;
    const base = spellbookNames
      ? spellbookNames.map((name) => spellIndex.get(lowerKey(name)) || spellDb.find((spell) => lowerKey(spell.name) === lowerKey(name)) || { name, level: pickerLevel })
      : spellDb
        .filter((spell) => Number(spell.level || 0) === pickerLevel)
        .filter((spell) => Number(spell.level || 0) === 0 || Number(spell.level || 0) <= activePicker.maxLevel)
        .filter((spell) => !hasIndex || spellMatchesClass(spell, activePicker.className, classSpellIndex));
    return dedupeSpells(base)
      .filter((spell) => matchesQuery(pickerSearch, spell.name, spell.schoolFull || spell.school))
      .slice(0, 200);
  }, [spellDb, spellIndex, pickerLevel, pickerSearch, classSpellIndex, activePicker, activeIsWizard, pickerWizardMode]);

  const selectedManualNames = new Set([
    ...(activePicker?.bucket?.selectedCantrips || []),
    ...Object.values(activePicker?.bucket?.selectedSpells || {}).flat(),
  ]);

  const toggleSlot = (level, total, index, createdCount, kind = 'regular') => {
    // Read-only sheets must not mutate the local slotUsed/createdSlots mirror:
    // the change never reaches the server, so showing a consumed slot would lie.
    if (readOnly) return;
    const key = kind === 'pact' ? getPactSlotUsedKey(level) : String(level);
    const used = kind === 'pact'
      ? getPactSlotUsed(slotUsed, level)
      : getRegularSlotUsed(slotUsed, level);
    if (kind === 'pact') {
      const nextUsed = index < used ? Math.max(0, index) : index + 1;
      const next = { ...slotUsed, [key]: Math.max(0, Math.min(total, nextUsed)) };
      setSlotUsed(next);
      persistUsedSlots(next, onUpdateSheet, onUpdateCharacter);
      return;
    }
    if (index >= total) {
      const created = createdCount || createdSlots[level] || 0;
      if (created <= 0) return;
      const next = { ...createdSlots };
      next[level] = created - 1;
      if (next[level] <= 0) delete next[level];
      setCreatedSlots(next);
      persistCreatedSlots(next, onUpdateSheet, onUpdateCharacter);
      return;
    }
    const nextUsed = index < used ? Math.max(0, index) : index + 1;
    const next = { ...slotUsed, [key]: nextUsed };
    setSlotUsed(next);
    persistUsedSlots(next, onUpdateSheet, onUpdateCharacter);
  };

  const addSpell = (spell) => {
    if (!activePicker) return;
    const level = Number(spell?.level || 0);
    const name = spell?.name;
    if (!name || selectedManualNames.has(name)) return;
    if (level > 0 && level > activePicker.maxLevel) return;
    if (level === 0 && activeLimits.cantrips != null && activeCounts.cantrips >= activeLimits.cantrips) return;
    if (level > 0 && activeLimits.spells != null && activeCounts.spells >= activeLimits.spells) return;
    updateBucketSpell(activePicker, (bucket) => ({ ...bucket, ...withSpellPicked(bucket, level, name) }), spell);
  };

  const removeSpell = (spell) => {
    if (!activePicker) return;
    const name = spell?.name;
    const level = Number(spell?.level || 0);
    if (!name || !selectedManualNames.has(name)) return;
    updateBucketSpell(activePicker, (bucket) => ({ ...bucket, ...withoutSpellPicked(bucket, level, name) }));
  };

  const toggleWizardBookSpell = (spell) => {
    if (!activePicker || !activeIsWizard) return;
    const level = Number(spell?.level || 0);
    const name = spell?.name;
    if (!name || level > activePicker.maxLevel) return;
    updateBucketSpell(activePicker, (bucket) => ({ ...bucket, ...withWizardBookToggled(bucket, level, name) }), spell);
  };

  const toggleWizardPreparedSpell = (spell) => {
    if (!activePicker || !activeIsWizard) return;
    const level = Number(spell?.level || 0);
    const name = spell?.name;
    if (!name || !isInWizardBook(activePicker.bucket, name, level)) return;
    const selected = selectedManualNames.has(name);
    if (!selected) {
      if (level === 0 && activeLimits.cantrips != null && activeCounts.cantrips >= activeLimits.cantrips) return;
      if (level > 0 && activeLimits.spells != null && activeCounts.spells >= activeLimits.spells) return;
    }
    selected ? removeSpell(spell) : addSpell(spell);
  };

  const updateBucketSpell = (picker, updater, snapshotSpell) => {
    if (!picker?.bucket) return;
    const nextBucket = updater(picker.bucket);
    const nextSnapshots = snapshotSpell ? upsertSnapshot(C?.spellSnapshots || [], toSnapshot(snapshotSpell)) : (C?.spellSnapshots || []);
    if (picker.isPrimary) {
      onUpdateSpells?.({
        selectedCantrips: nextBucket.selectedCantrips || [],
        selectedSpells: nextBucket.selectedSpells || {},
        wizardSpellbook: nextBucket.wizardSpellbook || C?.wizardSpellbook || {},
        spellSnapshots: nextSnapshots,
      });
      return;
    }
    const nextExtraClasses = (C?.extraClasses || []).map((extra, index) => (
      index === picker.extraIndex
        ? {
            ...extra,
            selectedCantrips: nextBucket.selectedCantrips || [],
            selectedSpells: nextBucket.selectedSpells || {},
            wizardSpellbook: nextBucket.wizardSpellbook || extra.wizardSpellbook || {},
          }
        : extra
    ));
    onUpdateSpells?.({ extraClasses: nextExtraClasses, spellSnapshots: nextSnapshots });
  };

  const matchSpell = (entry) => (
    (catalogStatus === 'ready' || spellIndex.has(lowerKey(entry.name)))
    && (spellFilter === 'all' || getSpellActionFilter(entry) === spellFilter)
    && matchesQuery(spellSearch, entry?.name)
  );
  const visibleCantrips = spellInfo.cantrips.filter(matchSpell);
  const visibleAtWill = spellInfo.atWill.filter(matchSpell);
  const visibleLeveled = Object.entries(expandedSpellInfo.leveled)
    .map(([level, entries]) => [level, entries.filter(matchSpell)])
    .filter(([, entries]) => entries.length > 0);
  const hasVisibleSpells = visibleCantrips.length || visibleAtWill.length || visibleLeveled.length;
  const showEmptyCantrips = catalogStatus === 'ready' && spellFilter === 'all' && !spellSearch.trim();
  const emptySpellText = spellSearch.trim()
    ? 'No spells match your search.'
    : spellFilter === 'all' ? 'No spells selected.' : 'No spells match this filter.';

  return (
    <Box sx={panelRootSx}>
      <Box sx={{ display: 'flex', gap: 1, mb: 0.75, flexWrap: 'wrap' }}>
        <StatBox value={dc} label="Spell DC" />
        <StatBox value={signed(effectiveD20Modifier(atk, sheet?.exhaustionLevel))} label="Spell Attack" />
        <StatBox value={ABILITY_ABBREVIATIONS[ability] || ability.toUpperCase()} label="Spell Ability" />
      </Box>

      <Box sx={panelToolbarSx}>
        {SPELL_ACTION_FILTERS.map((option) => (
          <Chip
            key={option.key}
            size="small"
            label={option.label}
            variant={spellFilter === option.key ? 'filled' : 'outlined'}
            color={spellFilter === option.key ? 'primary' : 'default'}
            onClick={() => setSpellFilter(option.key)}
            sx={filterChipSx}
          />
        ))}
        <SearchField
          placeholder="Search spells..."
          value={spellSearch}
          onChange={setSpellSearch}
          iconSize={14}
          sx={{ ...compactInputSx, flex: 1, minWidth: 140 }}
        />
      </Box>

      {armorPenalties.cannotCastSpells ? (
        <Alert severity="warning" sx={{ mb: 0.75, py: 0.25, '& .MuiAlert-message': { fontSize: '0.75rem' } }}>
          Equipped armor without training: cannot cast spells.
        </Alert>
      ) : null}

      <SlotPanel slots={slots} used={slotUsed} created={createdSlots} onToggle={toggleSlot} readOnly={readOnly} />

      {catalogStatus === 'loading' ? <Typography role="status" sx={{ py: 1, color: 'text.secondary' }}>Loading spell details…</Typography> : null}

      {visibleCantrips.length || showEmptyCantrips ? (
        <SpellSection title="Cantrip">
          {visibleCantrips.map((entry) => <SpellEntry key={`${entry.name}|${entry.source}${scrollRowKey(entry.scroll)}`} entry={entry} C={C} exhaustionLevel={sheet?.exhaustionLevel || 0} activeConditions={sheet?.activeConditions || []} adapterRegistry={adapterRegistry} freeCastUses={freeCastUses} inventory={inventoryForBonuses} />)}
          {!visibleCantrips.length ? <Empty text="None" /> : null}
        </SpellSection>
      ) : null}

      {visibleAtWill.length ? (
        <SpellSection title="At Will">
          {visibleAtWill.map((entry) => <SpellEntry key={`at-will-${entry.name}-${entry.source}`} entry={entry} C={C} exhaustionLevel={sheet?.exhaustionLevel || 0} activeConditions={sheet?.activeConditions || []} adapterRegistry={adapterRegistry} freeCastUses={freeCastUses} inventory={inventoryForBonuses} />)}
        </SpellSection>
      ) : null}

      {visibleLeveled.map(([level, entries]) => (
        <SpellSection key={level} title={SPELL_LEVEL_LABELS[level] || `Level ${level}`}>
          {entries.map((entry) => <SpellEntry key={`${level}-${entry.name}-${entry.source}-${entry.castLevel || 'base'}${scrollRowKey(entry.scroll)}`} entry={entry} C={C} exhaustionLevel={sheet?.exhaustionLevel || 0} activeConditions={sheet?.activeConditions || []} adapterRegistry={adapterRegistry} freeCastUses={freeCastUses} inventory={inventoryForBonuses} />)}
        </SpellSection>
      ))}

      {!hasVisibleSpells && catalogStatus === 'ready' ? <Empty text={emptySpellText} /> : null}

      {canManageSpellList ? (
        <Box sx={{ mt: 0.75 }}>
          <Button onClick={() => setPickerOpen(true)} startIcon={<Plus size={15} />} sx={addButtonSx}>
            Add / Remove Spell
          </Button>
        </Box>
      ) : null}

      <SheetDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        maxWidth="md"
        title="Spells"
        icon={<Sparkles size={20} />}
        showClose
        topPad={2}
        headerRight={(
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            {activePicker ? `${activePicker.label} - Cantrips ${activeCounts.cantrips}/${activeLimits.cantrips ?? '-'} - Spells ${activeCounts.spells}/${activeLimits.spells ?? '-'}` : 'No caster class'}
          </Typography>
        )}
      >
          {casterPickers.length > 1 ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.75 }}>
              {casterPickers.map((caster, index) => (
                <Chip
                  key={`${caster.className}-${index}`}
                  size="small"
                  label={`${caster.label} (${caster.note})`}
                  variant={pickerClassIndex === index ? 'filled' : 'outlined'}
                  color={pickerClassIndex === index ? 'primary' : 'default'}
                  onClick={() => { setPickerClassIndex(index); setPickerLevel(0); setPickerWizardMode('prepare'); }}
                  sx={{ fontFamily: UI_FONTS.display, fontSize: '0.58rem', letterSpacing: '0.06em' }}
                />
              ))}
            </Box>
          ) : null}

          {activePicker ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: activeIsWizard ? '1fr auto' : '1fr' }, gap: 0.5, mb: 0.75 }}>
              <Box sx={{ bgcolor: UI_COLORS.headerBg, border: 1, borderColor: 'divider', borderRadius: 1, px: 1, py: 0.65, display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
                <Typography sx={{ fontFamily: UI_FONTS.display, fontSize: '0.72rem', color: UI_COLORS.goldLight, letterSpacing: '0.06em' }}>{activePicker.label}</Typography>
                <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>{activePicker.note}</Typography>
                <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>Max level {activePicker.maxLevel || 0}</Typography>
                {activeIsWizard ? <Typography sx={{ fontSize: '0.68rem', color: UI_COLORS.blue }}>Spellbook {activeSpellbookSize}</Typography> : null}
              </Box>
              {activeIsWizard ? (
                <ToggleButtonGroup size="small" exclusive value={pickerWizardMode} onChange={(_, next) => next && setPickerWizardMode(next)} sx={levelToggleSx}>
                  <ToggleButton value="prepare">Prepare</ToggleButton>
                  <ToggleButton value="book">Spellbook</ToggleButton>
                </ToggleButtonGroup>
              ) : null}
            </Box>
          ) : null}

          <Box sx={{ display: 'grid', gap: 0.5, mb: 0.75 }}>
            <SearchField
              placeholder={spellDb.length ? 'Search spells...' : 'Loading spells...'}
              value={pickerSearch}
              onChange={setPickerSearch}
              iconSize={14}
              sx={compactInputSx}
            />
            <Box sx={{ overflowX: 'auto', pb: 0.2 }}>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={pickerLevel}
                onChange={(_, next) => next != null && setPickerLevel(next)}
                sx={{ ...levelToggleSx, flexWrap: 'nowrap', minWidth: 'max-content' }}
              >
                {SPELL_LEVEL_LABELS.map((label, level) => (
                  <ToggleButton key={label} value={level} disabled={level > 0 && activePicker && level > activePicker.maxLevel}>
                    {level === 0 ? `Can ${activePicker?.bucket?.selectedCantrips?.length || 0}/${activeLimits.cantrips ?? '-'}` : `${level} ${activePicker?.bucket?.selectedSpells?.[level]?.length || 0}/${activeLimits.spells ?? '-'}`}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '58vh', overflowY: 'auto' }}>
            {pickerList.map((spell) => {
              const manualSelected = selectedManualNames.has(spell.name);
              // `autoGranted` = the spell is granted by a source (class/subclass/feat/…),
              // so it always carries a source badge. `locked` = not user-editable in the
              // current mode. In Wizard "book" mode the row stays editable (you manage the
              // spellbook), but the badge must still show — hence the two are decoupled.
              const autoEntry = lockedSourceBySpell.get(`${lowerKey(spell.name)}|${lowerKey(spell.source)}`);
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
              <Empty text={activeIsWizard && pickerWizardMode === 'prepare' ? 'No spells in this Wizard spellbook level.' : 'No spells found for this class/level.'} />
            ) : null}
          </Box>
      </SheetDialog>
    </Box>
  );
}

