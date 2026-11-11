import { useMemo, useState } from 'react';
import { Box, Alert, Button, Typography } from '@mui/material';
import { Plus } from 'lucide-react';
import SearchField from '../../../shared/ui/SearchField.jsx';
import { SPELL_LEVEL_LABELS } from '../../../shared/character/spells/spellTables.js';
import { effectiveD20Modifier } from '../../../shared/character/sheet/sheetStats.js';
import { scrollRowKey } from '../../../shared/character/inventory/spellScrolls.js';
import { adapterRegistry } from '../../../adapters/index.js';
import { getEquippedArmorPenalties } from '../inventory/armorPenalties.js';
import { useProficiencySets } from '../proficiency/ProficiencySetsContext.jsx';
import { SPELL_ACTION_FILTERS, buildSpellInfo, expandSpellInfoBySlots, getSpellActionFilter } from './spellsTabLogic.js';
import { SpellPickerDialog } from './SpellPickerDialog.jsx';
import { getSpellAbility } from './spellAbility.js';
import { canManageSpells, getSpellSlots, getSpellLimits } from '../../../shared/character/spells/spellcasting.js';
import { addButtonSx, compactInputSx, panelRootSx, panelToolbarSx } from './spellsTabStyles.js';
import SpellEntry from './SpellEntry.jsx';
import { Empty, SlotPanel, SpellSection } from './SpellsUiParts.jsx';
import { useSheetActions } from '../state/SheetActionsContext.jsx';
import { signed } from '../../../shared/ui/numberFormat.js';
import { matchKey } from '../../../shared/content/nameKeys.js';
import { spellNameIndex, spellSourceKey } from '../../../shared/character/spells/spellNameIndex.js';
import { ABILITY_ABBREVIATIONS } from '../../../shared/content/rulesVocabulary.js';
import { matchesQuery } from '../../../shared/content/searchText.js';
import { classNames } from '../../../shared/character/progression/classLevel.js';
import { spellcastingNumbers } from '../../../shared/character/spells/spellcastingNumbers.js';
import { useSpellCatalog } from './useSpellCatalog.js';
import { useSpellSlotState } from './useSpellSlotState.js';
import FilterToggles from '../../../shared/ui/FilterToggles.jsx';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { ICON_SIZES } from '../../../shared/ui/iconSizes.js';
import { classSpellIndexForCharacter, spellsForBooks } from '../../../shared/content/booksView.js';
import StatTile from '../stats/StatTile.jsx';
import { UI_COLORS } from '../../../shared/ui/colors.js';

export default function SpellsTab({ C, sheet, freeCastUses }) {
  const { onUpdateSheet, onUpdateCharacter, readOnly } = useSheetActions();
  const [spellSearch, setSpellSearch] = useState('');
  const [spellFilter, setSpellFilter] = useState('all');
  const [pickerOpen, setPickerOpen] = useState(false);

  const {
    spellDb, spellVersions, classSpellIndex: allClassSpellIndex, classSpellBooks, catalogStatus, adapterRevision,
  } = useSpellCatalog(classNames(C));
  // The picker offers the spells of the character's books; known spells are
  // looked up in the whole catalog.
  const bookSpells = useMemo(() => (spellVersions.length ? spellsForBooks(spellVersions, C) : spellDb), [spellVersions, spellDb, C]);
  const classSpellIndex = useMemo(
    () => classSpellIndexForCharacter({ classSpellBooks, classSpellIndex: allClassSpellIndex }, C),
    [classSpellBooks, allClassSpellIndex, C],
  );

  const { slotUsed, createdSlots, toggleSlot } = useSpellSlotState(sheet, { readOnly, onUpdateSheet, onUpdateCharacter });

  const spellIndex = useMemo(
    () => spellNameIndex({ spells: spellDb, versions: spellVersions, snapshots: C?.spellSnapshots || [] }),
    [spellDb, spellVersions, C?.spellSnapshots],
  );

  const spellInfo = useMemo(() => buildSpellInfo(C, spellIndex), [C, spellIndex, adapterRevision]);
  const slots = useMemo(() => getSpellSlots(C), [C, adapterRevision]);
  const expandedSpellInfo = useMemo(() => expandSpellInfoBySlots(C, spellInfo, slots), [spellInfo, slots, C]);
  const lockedSourceBySpell = useMemo(() => {
    const map = new Map();
    (spellInfo?.lockedEntries || []).forEach((entry) => {
      if (entry?.name) map.set(spellSourceKey(entry.name, entry.source), entry);
    });
    return map;
  }, [spellInfo]);
  const limits = useMemo(() => getSpellLimits(C), [C, classSpellIndex, adapterRevision]);
  const canManageSpellList = useMemo(() => canManageSpells(C, limits), [C, limits]);
  const profSets = useProficiencySets();
  const armorPenalties = useMemo(() => getEquippedArmorPenalties(C, C?.inventory || [], profSets), [C, profSets]);
  const ability = getSpellAbility(C);
  const inventoryForBonuses = sheet?.sheetInventory || C?.inventory || [];
  const { attack: atk, dc } = spellcastingNumbers(C, ability, { inventory: inventoryForBonuses });


  const matchSpell = (entry) => (
    (catalogStatus === 'ready' || spellIndex.has(matchKey(entry.name)))
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
      {/* Read, as AC and Proficiency Bonus are: the same stat tiles, in the
          spells' colour. */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1, mb: 0.75, maxWidth: 420 }}>
        <StatTile tone={UI_COLORS.spell} label="Spell DC" value={dc} />
        <StatTile tone={UI_COLORS.spell} label="Spell Attack" value={signed(effectiveD20Modifier(atk, sheet?.exhaustionLevel))} />
        <StatTile tone={UI_COLORS.spell} label="Spell Ability" value={ABILITY_ABBREVIATIONS[ability] || ability.toUpperCase()} />
      </Box>

      <Box sx={panelToolbarSx}>
        <FilterToggles options={SPELL_ACTION_FILTERS} value={spellFilter} onChange={setSpellFilter} />
        <SearchField
          placeholder="Search spells..."
          value={spellSearch}
          onChange={setSpellSearch}
          iconSize={14}
          sx={{ ...compactInputSx, flex: 1, minWidth: 140 }}
        />
      </Box>

      {armorPenalties.cannotCastSpells ? (
        <Alert severity="warning" sx={{ mb: 0.75, py: 0.25, '& .MuiAlert-message': { fontSize: FONT_SIZES.lg } }}>
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
          <Button variant="contained" onClick={() => setPickerOpen(true)} startIcon={<Plus size={ICON_SIZES.sm} />} sx={addButtonSx}>
            Add / Remove Spell
          </Button>
        </Box>
      ) : null}

      <SpellPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        C={C}
        catalog={{ spellDb: bookSpells, spellIndex, classSpellIndex, adapterRevision }}
        lockedSourceBySpell={lockedSourceBySpell}
      />
    </Box>
  );
}

