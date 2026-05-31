import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Alert,
  Button,
  Chip,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { Plus, Search, Sparkles } from 'lucide-react';
import { SPELL_LEVEL_LABELS } from '../../charbuilder/constants.js';
import { SCHOOL_LABELS, SLBL, getFinal, getMod, getPB } from '../logic/calculations.js';
import { loadSpells } from '../../charbuilder/logic/dataLoaders.js';
import { spellMatchesClass } from '../../charbuilder/spells/spells.js';
import { installedRegistry, loadClassAdapters, loadCoreAdapters, loadSpellsAdapters } from '../../../adapters/index.js';
import { isConcentrationSpell, isRitualSpell } from '../../../shared/spellTags.js';
import { getEquippedArmorPenalties } from '../logic/armorPenalties.js';
import { useProficiencySets } from '../context/ProficiencySetsContext.jsx';
import { aggregateSpellBonuses } from '../../../shared/character/itemBonus.js';
import SheetDialog from '../../../shared/character/SheetDialog.jsx';
import {
  buildSpellInfo,
  canManageSpells,
  dedupeSpells,
  formatBonus,
  getMaxLearnableSpellLevel,
  getMaxLearnableSpellLevelForEntity,
  getSheetSlots,
  getSpellAbility,
  getSpellEntities,
  getSpellcastingProfile,
  getSpellLimits,
  hasSpellcastingProfile,
  norm,
  toSnapshot,
  upsertSnapshot,
} from '../logic/spellsTabLogic.js';
import { getClassSpellLimits } from '../../../shared/character/spellProgression.js';
import { getPactMagicInfo, getSpellCastMode } from '../../../shared/character/pactMagic.js';
import {
  addButtonSx,
  compactInputSx,
  levelToggleSx,
} from './spellsTabStyles.js';
import SpellEntry from './SpellEntry.jsx';
import { Empty, SlotPanel, SpellSection, StatBox } from './SpellsUiParts.jsx';
import { SpellNameIcon } from '../../../shared/character/FiveEToolsLink.jsx';

export default function SpellsTab({ C, sheet, onRoll, onUpdateSpells, onShowToast, onUpdateSheet, freeCastUses, onToggleFreeCast, onUpdateCharacter }) {
  const [spellDb, setSpellDb] = useState([]);
  const [classSpellIndex, setClassSpellIndex] = useState({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerLevel, setPickerLevel] = useState(0);
  const [pickerClassIndex, setPickerClassIndex] = useState(0);
  const [pickerWizardMode, setPickerWizardMode] = useState('prepare');
  const [slotUsed, setSlotUsed] = useState(sheet?.spellSlotUsed || {});
  const [createdSlots, setCreatedSlots] = useState(sheet?.createdSpellSlots || {});

  const classNames = useMemo(() => [C?.className, ...(C?.extraClasses || []).map((extra) => extra.name)].filter(Boolean), [C]);

  useEffect(() => {
    let alive = true;
    const context = { getMod, getFinal, getPB };
    Promise.all([
      loadCoreAdapters(context),
      loadClassAdapters(classNames, context),
      loadSpellsAdapters(context),
      loadSpells(),
    ]).then(([, , , result]) => {
      if (!alive) return;
      setSpellDb(result.spells || []);
      setClassSpellIndex(result.classSpellIndex || {});
    }).catch(() => {
      if (alive) setSpellDb([]);
    });
    return () => { alive = false; };
  }, [classNames]);

  useEffect(() => {
    setSlotUsed(sheet?.spellSlotUsed || {});
    setCreatedSlots(sheet?.createdSpellSlots || {});
  }, [sheet?.spellSlotUsed, sheet?.createdSpellSlots]);

  const spellIndex = useMemo(() => {
    const map = new Map();
    spellDb.forEach((spell) => { if (spell?.name) map.set(norm(spell.name), spell); });
    (C?.spellSnapshots || []).forEach((spell) => {
      if (spell?.name && !map.has(norm(spell.name))) map.set(norm(spell.name), spell);
    });
    return map;
  }, [spellDb, C?.spellSnapshots]);

  const spellInfo = useMemo(() => buildSpellInfo(C, spellIndex), [C, spellIndex]);
  const slots = useMemo(() => getSheetSlots(C), [C]);
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
        norm(existing?.name) === norm(nextEntry?.name)
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
        if (entry.ritualOnly) return;
        if (!entry.entriesHigherLevel) return;
        const baseLevel = Number(level);
        const castMode = getSpellCastMode(C, entry, pactInfo);
        for (let lv = baseLevel + 1; lv <= maxSlotLv; lv++) {
          const hasRegularSlot = slots.regular?.[lv - 1] > 0;
          const hasPactSlot = slots.pact?.level === lv && slots.pact.count > 0;
          if (castMode.mode === 'pact_magic') {
            if (hasRegularSlot) addLeveledEntry(lv, { ...entry, castLevel: lv, castMode: 'regular' });
          } else if (hasRegularSlot || hasPactSlot) {
            addLeveledEntry(lv, { ...entry, castLevel: lv, castMode: castMode.mode || 'regular' });
          }
        }
      });
    });
    return result;
  }, [spellInfo, slots, C]);
  const maxSpellLevel = useMemo(() => getMaxLearnableSpellLevel(C), [C, classSpellIndex]);
  const limits = useMemo(() => getSpellLimits(C), [C, classSpellIndex]);
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
    .filter((entity) => entity.bucket && hasSpellcastingProfile(entity.profile)), [C, classSpellIndex]);
  const activePicker = casterPickers[Math.min(pickerClassIndex, Math.max(0, casterPickers.length - 1))] || null;
  const activeLimits = useMemo(() => activePicker ? getPickerLimits(C, activePicker) : { cantrips: null, spells: null }, [C, activePicker]);
  const activeCounts = useMemo(() => activePicker ? getBucketCounts(activePicker.bucket) : { cantrips: 0, spells: 0 }, [activePicker]);
  const activeIsWizard = String(activePicker?.className || '').toLowerCase() === 'wizard';
  const activeSpellbookSize = activeIsWizard ? getSpellbookSize(activePicker?.bucket) : 0;
  const profSets = useProficiencySets();
  const armorPenalties = useMemo(() => getEquippedArmorPenalties(C, C?.inventory || [], profSets), [C, profSets]);
  const ability = getSpellAbility(C);
  const spellMod = getMod(getFinal(C, ability));
  const inventoryForBonuses = sheet?.sheetInventory || C?.inventory || [];
  const spellItemBonuses = aggregateSpellBonuses(inventoryForBonuses);
  const dc = 8 + getPB(C) + spellMod + spellItemBonuses.spellSaveDc;
  const atk = getPB(C) + spellMod + spellItemBonuses.spellAttack;

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
    const q = pickerSearch.trim().toLowerCase();
    if (!activePicker) return [];
    const hasIndex = Object.keys(classSpellIndex).length > 0;
    const spellbookNames = activeIsWizard && pickerWizardMode === 'prepare'
      ? getSpellbookLevel(activePicker.bucket, pickerLevel)
      : null;
    const base = spellbookNames
      ? spellbookNames.map((name) => spellIndex.get(norm(name)) || spellDb.find((spell) => norm(spell.name) === norm(name)) || { name, level: pickerLevel })
      : spellDb
        .filter((spell) => Number(spell.level || 0) === pickerLevel)
        .filter((spell) => Number(spell.level || 0) === 0 || Number(spell.level || 0) <= activePicker.maxLevel)
        .filter((spell) => !hasIndex || spellMatchesClass(spell, activePicker.className, classSpellIndex));
    return dedupeSpells(base)
      .filter((spell) => !q || spell.name.toLowerCase().includes(q) || String(spell.schoolFull || spell.school || '').toLowerCase().includes(q))
      .slice(0, 200);
  }, [spellDb, spellIndex, pickerLevel, pickerSearch, classSpellIndex, activePicker, activeIsWizard, pickerWizardMode]);

  const selectedManualNames = new Set([
    ...(activePicker?.bucket?.selectedCantrips || []),
    ...Object.values(activePicker?.bucket?.selectedSpells || {}).flat(),
  ]);

  const toggleSlot = (level, total, index, createdCount) => {
    const used = slotUsed[level] || 0;
    if (index >= total) {
      const created = createdCount || createdSlots[level] || 0;
      if (created <= 0) return;
      const next = { ...createdSlots };
      next[level] = created - 1;
      if (next[level] <= 0) delete next[level];
      setCreatedSlots(next);
      onUpdateSheet?.({ createdSpellSlots: next });
      onUpdateCharacter?.((prev) => ({ ...prev, createdSpellSlots: next }));
      return;
    }
    const nextUsed = index < used ? Math.max(0, index) : index + 1;
    const next = { ...slotUsed, [level]: nextUsed };
    setSlotUsed(next);
    onUpdateSheet?.({ spellSlotUsed: next });
    onUpdateCharacter?.((prev) => ({ ...prev, spellSlotsUsed: next }));
  };

  const addSpell = (spell) => {
    if (!activePicker) return;
    const level = Number(spell?.level || 0);
    const name = spell?.name;
    if (!name || selectedManualNames.has(name)) return;
    if (level > 0 && level > activePicker.maxLevel) return;
    if (level === 0 && activeLimits.cantrips != null && activeCounts.cantrips >= activeLimits.cantrips) return;
    if (level > 0 && activeLimits.spells != null && activeCounts.spells >= activeLimits.spells) return;
    updateBucketSpell(activePicker, (bucket) => {
      const next = cloneBucket(bucket);
      if (level === 0) next.selectedCantrips = [...(next.selectedCantrips || []), name];
      else next.selectedSpells = addToSelectedSpells(next.selectedSpells, level, name);
      return next;
    }, spell);
  };

  const removeSpell = (spell) => {
    if (!activePicker) return;
    const name = spell?.name;
    const level = Number(spell?.level || 0);
    if (!name || !selectedManualNames.has(name)) return;
    updateBucketSpell(activePicker, (bucket) => {
      const next = cloneBucket(bucket);
      if (level === 0) next.selectedCantrips = (next.selectedCantrips || []).filter((entry) => entry !== name);
      else next.selectedSpells = removeFromSelectedSpells(next.selectedSpells, level, name);
      return next;
    });
  };

  const toggleWizardBookSpell = (spell) => {
    if (!activePicker || !activeIsWizard) return;
    const level = Number(spell?.level || 0);
    const name = spell?.name;
    if (!name || level > activePicker.maxLevel) return;
    updateBucketSpell(activePicker, (bucket) => {
      const next = cloneBucket(bucket);
      const book = normalizeWizardBook(next.wizardSpellbook);
      const list = book[level] || [];
      const has = list.some((entry) => norm(entry) === norm(name));
      book[level] = has ? list.filter((entry) => norm(entry) !== norm(name)) : [...list, name];
      next.wizardSpellbook = book;
      if (has) {
        if (level === 0) next.selectedCantrips = (next.selectedCantrips || []).filter((entry) => norm(entry) !== norm(name));
        else next.selectedSpells = removeFromSelectedSpells(next.selectedSpells, level, name);
      }
      return next;
    }, spell);
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

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 0.75, flexWrap: 'wrap' }}>
        <StatBox value={dc} label="Spell DC" />
        <StatBox value={formatBonus(atk)} label="Spell Attack" />
        <StatBox value={SLBL[ability] || ability.toUpperCase()} label="Spell Ability" />
      </Box>

      {armorPenalties.cannotCastSpells ? (
        <Alert severity="warning" sx={{ mb: 0.75, py: 0.25, '& .MuiAlert-message': { fontSize: '0.75rem' } }}>
          Equipped armor without training: cannot cast spells.
        </Alert>
      ) : null}

      <SlotPanel slots={slots} used={slotUsed} created={createdSlots} onToggle={toggleSlot} />

      <SpellSection title="Cantrip">
        {spellInfo.cantrips.map((entry) => <SpellEntry key={entry.name} entry={entry} onRoll={onRoll} onShowToast={onShowToast} atk={atk} spellMod={spellMod} C={C} installedRegistry={installedRegistry} freeCastUses={freeCastUses} onToggleFreeCast={onToggleFreeCast} />)}
        {!spellInfo.cantrips.length ? <Empty text="None" /> : null}
      </SpellSection>

      {spellInfo.atWill.length ? (
        <SpellSection title="At Will">
          {spellInfo.atWill.map((entry) => <SpellEntry key={`at-will-${entry.name}`} entry={entry} onRoll={onRoll} onShowToast={onShowToast} atk={atk} spellMod={spellMod} C={C} installedRegistry={installedRegistry} freeCastUses={freeCastUses} onToggleFreeCast={onToggleFreeCast} />)}
        </SpellSection>
      ) : null}

      {Object.entries(expandedSpellInfo.leveled).map(([level, entries]) => (
        <SpellSection key={level} title={SPELL_LEVEL_LABELS[level] || `Level ${level}`}>
          {entries.map((entry) => <SpellEntry key={`${level}-${entry.name}-${entry.castLevel || 'base'}`} entry={entry} onRoll={onRoll} onShowToast={onShowToast} atk={atk} spellMod={spellMod} C={C} installedRegistry={installedRegistry} freeCastUses={freeCastUses} onToggleFreeCast={onToggleFreeCast} />)}
        </SpellSection>
      ))}

      {!spellInfo.cantrips.length && !Object.keys(spellInfo.leveled).length && !spellInfo.atWill.length ? <Empty text="No spells selected." /> : null}

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
                  sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.58rem', letterSpacing: '0.06em' }}
                />
              ))}
            </Box>
          ) : null}

          {activePicker ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: activeIsWizard ? '1fr auto' : '1fr' }, gap: 0.5, mb: 0.75 }}>
              <Box sx={{ bgcolor: 'rgba(35,32,26,1)', border: 1, borderColor: 'divider', borderRadius: 1, px: 1, py: 0.65, display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
                <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.72rem', color: '#edd48a', letterSpacing: '0.06em' }}>{activePicker.label}</Typography>
                <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>{activePicker.note}</Typography>
                <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>Max level {activePicker.maxLevel || 0}</Typography>
                {activeIsWizard ? <Typography sx={{ fontSize: '0.68rem', color: '#4d95d6' }}>Spellbook {activeSpellbookSize}</Typography> : null}
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
            <TextField
              size="small"
              fullWidth
              placeholder={spellDb.length ? 'Search spells...' : 'Loading spells...'}
              value={pickerSearch}
              onChange={(event) => setPickerSearch(event.target.value)}
              slotProps={{ input: { startAdornment: <Search size={14} /> } }}
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
              const locked = pickerWizardMode === 'book' ? false : spellInfo.lockedNames.has(spell.name);
              const inWizardBook = activeIsWizard && isInWizardBook(activePicker?.bucket, spell.name, Number(spell.level || 0));
              const selected = activeIsWizard && pickerWizardMode === 'book' ? inWizardBook : (manualSelected || locked);
              const atLimit = !selected && !locked && pickerWizardMode !== 'book' && ((spell.level === 0 && activeLimits.cantrips != null && activeCounts.cantrips >= activeLimits.cantrips)
                || (spell.level > 0 && activeLimits.spells != null && activeCounts.spells >= activeLimits.spells)
                || (spell.level > 0 && activePicker && spell.level > activePicker.maxLevel));
              const disabled = locked || atLimit || !activePicker;
              const onClick = () => {
                if (disabled) return;
                if (activeIsWizard && pickerWizardMode === 'book') { toggleWizardBookSpell(spell); return; }
                if (activeIsWizard) { toggleWizardPreparedSpell(spell); return; }
                manualSelected ? removeSpell(spell) : addSpell(spell);
              };
              const status = locked ? 'AUTO'
                : activeIsWizard && pickerWizardMode === 'book' ? (inWizardBook ? 'BOOK' : '+ BOOK')
                : selected ? 'ON'
                : atLimit ? 'MAX'
                : activeIsWizard ? 'PREP'
                : '+';
              return (
                <Box key={`${spell.name}-${spell.source}`} onClick={onClick}
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: '9px', py: '6px', border: 1, borderColor: selected ? '#58b879' : 'transparent', borderRadius: 1, bgcolor: selected ? 'rgba(39,174,96,0.08)' : 'transparent', opacity: atLimit ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer', '&:hover': { borderColor: selected ? '#58b879' : 'divider', bgcolor: selected ? 'rgba(39,174,96,0.08)' : 'rgba(35,32,26,1)' } }}>
                  <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 0.4 }}>
                    <SpellNameIcon spell={spell} />
                    <Typography noWrap sx={{ minWidth: 0, fontSize: '0.875rem', color: 'text.primary' }}>{spell.name}</Typography>
                    <SpellMiniTags spell={spell} />
                  </Box>
                  <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', flexShrink: 0 }}>{SPELL_LEVEL_LABELS[spell.level] || `Lv ${spell.level}`}</Typography>
                  <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', flexShrink: 0 }}>{SCHOOL_LABELS[spell.school] || spell.school}</Typography>
                  <Box sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.7rem', color: selected ? '#58b879' : '#edd48a', flexShrink: 0 }}>
                    {status}
                  </Box>
                </Box>
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


function SpellMiniTags({ spell }) {
  const tags = [
    isConcentrationSpell(spell) ? { label: 'C', color: '#9d7fb8', bg: 'rgba(157,127,184,0.16)', title: 'Concentration' } : null,
    isRitualSpell(spell) ? { label: 'R', color: '#58b879', bg: 'rgba(63,166,108,0.14)', title: 'Ritual' } : null,
  ].filter(Boolean);

  if (!tags.length) return null;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
      {tags.map((tag) => (
        <Box
          key={tag.label}
          title={tag.title}
          component="span"
          sx={{
            border: 1,
            borderColor: tag.color,
            color: tag.color,
            bgcolor: tag.bg,
            borderRadius: '3px',
            px: '5px',
            py: '1px',
            fontFamily: '"Cinzel", Georgia, serif',
            fontSize: '0.55rem',
            fontWeight: 700,
            lineHeight: 1.25,
          }}
        >
          {tag.label}
        </Box>
      ))}
    </Box>
  );
}

function cloneBucket(bucket) {
  return {
    ...(bucket || {}),
    selectedCantrips: [...(bucket?.selectedCantrips || [])],
    selectedSpells: Object.fromEntries(Object.entries(bucket?.selectedSpells || {}).map(([level, names]) => [level, [...(names || [])]])),
    wizardSpellbook: bucket?.wizardSpellbook ? normalizeWizardBook(bucket.wizardSpellbook) : bucket?.wizardSpellbook,
  };
}

function addToSelectedSpells(selectedSpells, level, name) {
  const next = Object.fromEntries(Object.entries(selectedSpells || {}).map(([lv, names]) => [lv, [...(names || [])]]));
  const key = String(level);
  const current = next[key] || [];
  next[key] = current.includes(name) ? current : [...current, name];
  return next;
}

function removeFromSelectedSpells(selectedSpells, level, name) {
  const next = Object.fromEntries(Object.entries(selectedSpells || {}).map(([lv, names]) => [lv, [...(names || [])]]));
  const key = String(level);
  next[key] = (next[key] || []).filter((entry) => norm(entry) !== norm(name));
  if (!next[key].length) delete next[key];
  return next;
}

function getBucketCounts(bucket) {
  return {
    cantrips: (bucket?.selectedCantrips || []).length,
    spells: Object.values(bucket?.selectedSpells || {}).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0),
  };
}

function getPickerLimits(C, picker) {
  const level = Math.max(1, Math.min(20, Number(picker?.level || 1)));
  const profile = picker?.profile || getSpellcastingProfile(picker);
  const { cantrips, spells } = getClassSpellLimits(profile, level);
  return {
    cantrips: normalizeLimit(cantrips),
    spells: normalizeLimit(spells),
  };
}

function normalizeLimit(value) {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : null;
}

function normalizeWizardBook(book) {
  const next = {};
  for (let level = 0; level <= 9; level++) {
    next[level] = [...new Set((book?.[level] || []).map((entry) => typeof entry === 'string' ? entry : entry?.name).filter(Boolean))];
  }
  return next;
}

function getSpellbookLevel(bucket, level) {
  return normalizeWizardBook(bucket?.wizardSpellbook)[Number(level || 0)] || [];
}

function getSpellbookSize(bucket) {
  return Object.values(normalizeWizardBook(bucket?.wizardSpellbook)).reduce((sum, list) => sum + list.length, 0);
}

function isInWizardBook(bucket, name, level) {
  return getSpellbookLevel(bucket, level).some((entry) => norm(entry) === norm(name));
}
