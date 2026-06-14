import { useEffect, useState } from 'react';
import { Box, Button, Chip, Typography, alpha } from '@mui/material';
import { Cross, Dices, Sword } from 'lucide-react';
import { getMod, getFinal, fbonus, hasConditionEffect, getConditionalConditionEffects } from '../logic/calculations.js';
import { installedRegistry, loadCoreAdapters, loadClassAdapters } from '../../../adapters/index.js';
import { PACT_SLOTS, SPELL_LEVEL_LABELS } from '../../charbuilder/constants.js';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { getChoiceValue } from '../../../shared/character/choiceUtils.js';
import { getAllResourceDefs } from '../logic/restResources.js';
import { toggleActiveField } from '../logic/toggleState.js';
import {
  FILTERS,
  CAT_COLORS,
  SECTION_DEFS,
  normalizeResourceMax,
  resolveActionFormulas,
  collectAdapterActions,
  makeWeaponActions,
  resolveFormula,
  buildActionTags,
} from '../logic/actionsTabLogic.js';
import { getSheetSlots } from '../logic/spellsTabLogic.js';
import { loadItems } from '../../charbuilder/logic/dataLoaders.js';
import { loadMasteryEntries } from '../../../shared/character/weaponMastery.js';
import { WeaponMasteryBlock } from '../../../shared/character/WeaponMasteryBlock.jsx';
import {
  filterChipSx,
  inlineButtonSx,
  levelHeaderSx,
  panelRootSx,
  panelToolbarSx,
  spellBodySx,
  spellRowSx,
  tinyMetaChipSx,
} from './spellsTabStyles.js';
import { Empty } from './SpellsUiParts.jsx';
import ActionDetailPanel from './ActionDetailPanel.jsx';
import CreatedItemsPanel from './CreatedItemsPanel.jsx';
import AttackRollButton from './AttackRollButton.jsx';
import UnarmedStrikeOptionsPanel from './UnarmedStrikeOptionsPanel.jsx';
import { useProficiencySets } from '../context/ProficiencySetsContext.jsx';
import { useSheetActions } from '../context/SheetActionsContext.jsx';
import ResourceBar from './ResourceBar.jsx';
import { RichInline, RichText } from '../../../shared/character/RichText.jsx';
import { EntryBlocks } from '../../../shared/character/EntryBlocks.jsx';
import { ExpandableCard } from '../../../shared/character/ExpandableCard.jsx';
import PipButton from '../../../shared/character/PipButton.jsx';
import SheetDialog from '../../../shared/character/SheetDialog.jsx';
import { ItemPropertyTable } from '../../../shared/character/ItemPropertyTable.jsx';
import { formatRollTitle, rollFormula as rollFormulaDice } from '../../../shared/character/dice.js';
import { CHIP_TONES, chipToneStyle } from '../../../shared/entityColors.js';

const ACTION_DETAIL_RENDERERS = {
  panel: ActionDetailPanel,
  unarmedStrike: UnarmedStrikeOptionsPanel,
  createdItems: CreatedItemsPanel,
};

const _danglingResKeyWarned = typeof Set === 'function' ? new Set() : null;
function warnDanglingResKey(action, resMaxMap) {
  if (typeof import.meta === 'undefined' || !import.meta.env?.DEV) return;
  if (!_danglingResKeyWarned || !action?.resKey || resMaxMap[action.resKey] != null) return;
  const cacheKey = `${action._source || action.ownerName || ''}|${action.name}|${action.resKey}`;
  if (_danglingResKeyWarned.has(cacheKey)) return;
  _danglingResKeyWarned.add(cacheKey);
  // eslint-disable-next-line no-console
  console.warn(`[actions] Action "${action.name}" references resKey "${action.resKey}" with no matching resource def (${action._source || action.ownerName || '?'}).`);
}

function actionLabel(value) {
  if (value === 'all') return 'All';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function ActionsTab({ C, sheet, resources }) {
  const { onRoll, setResources, onShowToast, onUpdateSheet, onUpdateCharacter } = useSheetActions();
  const [filter, setFilter] = useState('all');
  const [itemsDb, setItemsDb] = useState([]);
  const [, setMasteriesLoaded] = useState(false);
  const [slotRecovery, setSlotRecovery] = useState(null);
  const [slotRecoverySelection, setSlotRecoverySelection] = useState({});
  const [createSlotDialog, setCreateSlotDialog] = useState(null);
  const [createSlotSelection, setCreateSlotSelection] = useState(null);
  const [convertSlotDialog, setConvertSlotDialog] = useState(null);
  const [convertSlotSelection, setConvertSlotSelection] = useState(null);
  const [wildResurgenceDialog, setWildResurgenceDialog] = useState(null);
  const [spendSlotRecoverDialog, setSpendSlotRecoverDialog] = useState(null);
  const [spendSlotRecoverSelection, setSpendSlotRecoverSelection] = useState(null);
  const [consumePactSlotDialog, setConsumePactSlotDialog] = useState(null);
  const classNames = [C?.className, ...(C?.extraClasses || []).map((e) => e.name)].filter(Boolean);
  const classNamesKey = classNames.join('|');

  useEffect(() => {
    Promise.all([
      loadCoreAdapters(),
      loadClassAdapters(classNames, { getMod, getFinal }),
    ]);
  }, [classNamesKey]);

  useEffect(() => {
    let alive = true;
    loadItems()
      .then((items) => { if (alive) setItemsDb(items || []); })
      .catch(() => { if (alive) setItemsDb([]); });
    loadMasteryEntries()
      .then(() => { if (alive) setMasteriesLoaded(true); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const inv = sheet?.sheetInventory || [];
  const attacks = inv.filter(i => i.equipped && ['M', 'R'].includes(String(i.type || '').toUpperCase()));
  const masteryItems = itemsDb.length ? itemsDb : inv;
  const profSets = useProficiencySets();
  const adapterActions = [
    ...makeWeaponActions(C, attacks, inv, masteryItems, profSets),
    ...collectAdapterActions(C, sheet),
  ].map((action) => resolveActionFormulas(action, C))
   .map((action) => buildActionTags(action, C));
  const showAttacks = false;
  const actionSections = SECTION_DEFS
    .filter(section => filter === 'all' || filter === section.key)
    .map(section => ({
      ...section,
      actions: adapterActions.filter(action => section.cats.includes(action.cat)),
    }))
    .filter(section => section.actions.length > 0);

  const resMaxMap = {};
  const resNameMap = {};
  const resPoolMap = {};
  const resTrackMap = {};
  getAllResourceDefs(C).forEach(def => {
    if (!def.key) return;
    resMaxMap[def.key] = normalizeResourceMax(def, C);
    resNameMap[def.key] = def.name || def.key;
    resTrackMap[def.key] = def.track || 'remaining';
    if (def.pool) resPoolMap[def.key] = true;
  });
  adapterActions.forEach((a) => warnDanglingResKey(a, resMaxMap));

  const slotRecoverySpent = slotRecovery
    ? slotRecovery.levels.reduce((sum, entry) => sum + (entry.level * Number(slotRecoverySelection[String(entry.level)] || 0)), 0)
    : 0;
  const slotRecoveryRemaining = slotRecovery ? Math.max(0, slotRecovery.budget - slotRecoverySpent) : 0;

  const applyResourceRecovery = (result) => {
    if (!result?.targetResourceKey || !resources || !setResources) return;
    const targetKey = result.targetResourceKey;
    const amount = Math.max(0, Number(result.amount || 0));
    if (!amount) return;
    const max = resMaxMap[targetKey] ?? Infinity;
    const res = { ...resources };
    const before = Number(res[targetKey] || 0);
    const after = Math.min(max, before + amount);
    const recovered = after - before;
    if (!recovered) {
      onShowToast?.(result.label || 'Resource Recovery', `${resNameMap[targetKey] || targetKey} already at maximum.`, 0, []);
      return;
    }
    res[targetKey] = after;
    setResources(res);
    onShowToast?.(result.label || 'Resource Recovery', `Recovered ${recovered} ${resNameMap[targetKey] || targetKey}`, recovered, []);
  };

  const openCreateSlotDialog = (result) => {
    const currentSP = Number(result?.currentSP || 0);
    const table = result?.conversionTable || {};
    const levels = Object.entries(table)
      .filter(([level, cost]) => currentSP >= cost)
      .map(([level, cost]) => ({ level: Number(level), cost }));
    if (!levels.length) {
      onShowToast?.(result?.label || 'Create Spell Slot', 'Not enough Sorcery Points.', 0, []);
      return;
    }
    setCreateSlotDialog({ label: result?.label || 'Create Spell Slot', levels, table, sourceKey: result?.sourceResourceKey || 'sorc_pts' });
    setCreateSlotSelection(null);
  };

  const confirmCreateSlot = () => {
    if (!createSlotDialog || createSlotSelection == null) return;
    const level = Number(createSlotSelection);
    const cost = Number(createSlotDialog.table[level]);
    if (!cost) return;
    const res = { ...resources };
    const beforeSP = Number(res[createSlotDialog.sourceKey] || 0);
    if (beforeSP < cost) { onShowToast?.('Create Spell Slot', 'Not enough Sorcery Points.', 0, []); return; }
    res[createSlotDialog.sourceKey] = beforeSP - cost;
    setResources(res);
    const created = { ...(sheet?.createdSpellSlots || {}) };
    const key = String(level);
    created[key] = (created[key] || 0) + 1;
    onUpdateSheet?.({ createdSpellSlots: created });
    onUpdateCharacter?.((prev) => ({ ...prev, createdSpellSlots: created }));
    setCreateSlotDialog(null);
    setCreateSlotSelection(null);
    onShowToast?.('Create Spell Slot', `Created a temporary level ${level} spell slot (lasts until Long Rest).`, 0, []);
  };

  const openConvertSlotDialog = (result) => {
    const slots = getSheetSlots(C);
    const regularSlots = slots?.regular || [];
    const used = sheet?.spellSlotUsed || {};
    const created = sheet?.createdSpellSlots || {};
    const levels = [];
    for (let level = 1; level <= regularSlots.length; level++) {
      const total = Number(regularSlots[level - 1] || 0);
      if (!total) continue;
      const usedCount = Number(used[level] || used[String(level)] || 0);
      const createdCount = Number(created[level] || 0);
      const available = total - usedCount + createdCount;
      if (available <= 0) continue;
      levels.push({ level, available, hasCreated: createdCount > 0 });
    }
    if (!levels.length) {
      onShowToast?.(result?.label || 'Convert Spell Slot', 'No spell slots available to convert.', 0, []);
      return;
    }
    setConvertSlotDialog({ label: result?.label || 'Convert Spell Slot', levels, targetKey: result?.targetResourceKey || 'sorc_pts' });
    setConvertSlotSelection(null);
  };

  const confirmConvertSlot = () => {
    if (!convertSlotDialog || convertSlotSelection == null) return;
    const level = Number(convertSlotSelection);
    const spGain = level;
    const targetKey = convertSlotDialog.targetKey;
    const max = resMaxMap[targetKey] ?? Infinity;
    const res = { ...resources };
    const beforeSP = Number(res[targetKey] || 0);
    const afterSP = Math.min(max, beforeSP + spGain);
    if (afterSP <= beforeSP) { onShowToast?.('Convert Spell Slot', 'Sorcery Points already at maximum.', 0, []); return; }
    const created = { ...(sheet?.createdSpellSlots || {}) };
    const ckey = String(level);
    if ((created[ckey] || 0) > 0) {
      created[ckey] = (created[ckey] || 0) - 1;
      if (created[ckey] <= 0) delete created[ckey];
      onUpdateSheet?.({ createdSpellSlots: created });
      onUpdateCharacter?.((prev) => ({ ...prev, createdSpellSlots: created }));
    } else {
      const used = { ...(sheet?.spellSlotUsed || {}) };
      const slotsData = getSheetSlots(C);
      const maxTotal = Number((slotsData?.regular || [])[level - 1] || 0);
      used[String(level)] = Math.max(0, Math.min(maxTotal, Number(used[String(level)] || 0) + 1));
      onUpdateSheet?.({ spellSlotUsed: used });
      onUpdateCharacter?.((prev) => ({ ...prev, spellSlotsUsed: used }));
    }
    res[targetKey] = afterSP;
    setResources(res);
    setConvertSlotDialog(null);
    setConvertSlotSelection(null);
    onShowToast?.('Convert Spell Slot', `Converted a level ${level} spell slot into ${spGain} Sorcery Points.`, 0, []);
  };

  const openWildResurgenceDialog = (result) => {
    if (!result) return;
    const opts = [];
    if (result.hasWildShape) opts.push({ key: 'shape_to_slot', label: 'Expend 1 Wild Shape use to create a temporary level 1 spell slot', icon: 'paw-print' });
    if (result.hasAvailableSlot) opts.push({ key: 'slot_to_shape', label: 'Spend a spell slot (level 1+) to regain 1 Wild Shape use', icon: 'sparkles' });
    if (!opts.length) {
      onShowToast?.(result.label || 'Wild Resurgence', 'No Wild Shape uses or spell slots available.', 0, []);
      return;
    }
    setWildResurgenceDialog({ options: opts, label: result.label || 'Wild Resurgence', currentWS: result.currentWS });
  };

  const confirmWildResurgence = (choice) => {
    if (!wildResurgenceDialog) return;
    setWildResurgenceDialog(null);
    if (choice === 'shape_to_slot') {
      const res = { ...resources };
      const beforeWS = Number(res.wild_shape || 0);
      if (beforeWS <= 0) { onShowToast?.('Wild Resurgence', 'No Wild Shape uses available.', 0, []); return; }
      res.wild_shape = beforeWS - 1;
      setResources(res);
        const created = { ...(sheet?.createdSpellSlots || {}) };
      created[1] = (created[1] || 0) + 1;
      onUpdateSheet?.({ createdSpellSlots: created });
      onUpdateCharacter?.((prev) => ({ ...prev, createdSpellSlots: created }));
      onShowToast?.('Wild Resurgence', 'Expended 1 Wild Shape use to create a temporary level 1 spell slot.', 0, []);
    } else if (choice === 'slot_to_shape') {
      const slots = getSheetSlots(C);
      const regularSlots = slots?.regular || [];
      const used = sheet?.spellSlotUsed || {};
      const created = sheet?.createdSpellSlots || {};
      let consumed = false;
      for (let lv = 1; lv <= regularSlots.length; lv++) {
        const total = Number(regularSlots[lv - 1] || 0);
        if (!total) continue;
        const avail = total - Number(used[lv] || used[String(lv)] || 0) + Number(created[lv] || 0);
        if (avail <= 0) continue;
        if ((created[lv] || 0) > 0) {
          const next = { ...created };
          next[lv] = (next[lv] || 0) - 1;
          if (next[lv] <= 0) delete next[lv];
          onUpdateSheet?.({ createdSpellSlots: next });
          onUpdateCharacter?.((prev) => ({ ...prev, createdSpellSlots: next }));
        } else {
          const next = { ...used };
          next[String(lv)] = (next[String(lv)] || 0) + 1;
          onUpdateSheet?.({ spellSlotUsed: next });
          onUpdateCharacter?.((prev) => ({ ...prev, spellSlotsUsed: next }));
        }
        consumed = true;
        break;
      }
      if (!consumed) { onShowToast?.('Wild Resurgence', 'No available spell slots to expend.', 0, []); return; }
      const res = { ...resources };
      const beforeWS = Number(res.wild_shape || 0);
      const slotsData = getSheetSlots(C);
      const druidLv = (() => { let lv=0; if (String(C?.className||'').toLowerCase()==='druid') lv+=C?.classLevel||C?.level||0; (C?.extraClasses||[]).forEach(e=>{if(String(e?.name||'').toLowerCase()==='druid') lv+=e.level||0;}); return lv; })();
      const maxWS = druidLv >= 17 ? 4 : druidLv >= 6 ? 3 : 2;
      res.wild_shape = Math.min(maxWS, beforeWS + 1);
      setResources(res);
        onShowToast?.('Wild Resurgence', 'Regained 1 Wild Shape use by spending a spell slot.', 0, []);
    }
  };

  const openSpendSlotRecoverResource = (result) => {
    if (!result?.targetKey) return;
    const slots = getSheetSlots(C);
    const regularSlots = slots?.regular || [];
    const used = sheet?.spellSlotUsed || {};
    const created = sheet?.createdSpellSlots || {};
    const levels = [];
    for (let lv = 1; lv <= regularSlots.length; lv++) {
      const total = Number(regularSlots[lv - 1] || 0);
      if (!total) continue;
      const usedCount = Number(used[lv] || used[String(lv)] || 0);
      const createdCount = Number(created[lv] || 0);
      const available = total - usedCount + createdCount;
      if (available <= 0) continue;
      levels.push({ level: lv, available });
    }
    if (!levels.length) {
      onShowToast?.(result?.label || 'Spell Slot Recovery', 'No spell slots available to expend.', 0, []);
      return;
    }
    setSpendSlotRecoverDialog({
      label: result?.label || 'Spell Slot Recovery',
      levels,
      targetKey: result.targetKey,
      recoverAmount: Math.max(1, Number(result?.recoverAmount || 1)),
      recoverMax: result?.recoverMax != null ? Number(result.recoverMax) : Infinity,
      note: result?.note || '',
    });
  };

  const confirmSpendSlotRecover = () => {
    if (!spendSlotRecoverDialog || spendSlotRecoverSelection == null) return;
    const level = Number(spendSlotRecoverSelection);
    const targetKey = spendSlotRecoverDialog.targetKey;
    const amount = spendSlotRecoverDialog.recoverAmount;
    const max = spendSlotRecoverDialog.recoverMax;
    const res = { ...resources };
    const beforeTarget = Number(res[targetKey] || 0);
    if (max !== Infinity && beforeTarget >= max) {
      onShowToast?.(spendSlotRecoverDialog.label, `${resNameMap[targetKey] || targetKey} already at maximum.`, 0, []);
      setSpendSlotRecoverDialog(null);
      setSpendSlotRecoverSelection(null);
      return;
    }
    const afterTarget = Math.min(max, beforeTarget + amount);
    const actualRecover = afterTarget - beforeTarget;
    if (actualRecover <= 0) {
      onShowToast?.(spendSlotRecoverDialog.label, `${resNameMap[targetKey] || targetKey} already at maximum.`, 0, []);
      setSpendSlotRecoverDialog(null);
      setSpendSlotRecoverSelection(null);
      return;
    }
    const created = { ...(sheet?.createdSpellSlots || {}) };
    const ckey = String(level);
    if ((created[ckey] || 0) > 0) {
      created[ckey] = (created[ckey] || 0) - 1;
      if (created[ckey] <= 0) delete created[ckey];
      onUpdateSheet?.({ createdSpellSlots: created });
      onUpdateCharacter?.((prev) => ({ ...prev, createdSpellSlots: created }));
    } else {
      const used = { ...(sheet?.spellSlotUsed || {}) };
      const slotsData = getSheetSlots(C);
      const maxTotal = Number((slotsData?.regular || [])[level - 1] || 0);
      used[String(level)] = Math.max(0, Math.min(maxTotal, Number(used[String(level)] || 0) + 1));
      onUpdateSheet?.({ spellSlotUsed: used });
      onUpdateCharacter?.((prev) => ({ ...prev, spellSlotsUsed: used }));
    }
    res[targetKey] = afterTarget;
    setResources(res);
    setSpendSlotRecoverDialog(null);
    setSpendSlotRecoverSelection(null);
    const label = resNameMap[targetKey] || targetKey;
    onShowToast?.(spendSlotRecoverDialog.label, `Recovered ${actualRecover} ${label} by expending a level ${level} spell slot.`, actualRecover, []);
  };

  const openConsumePactSlotDialog = (result) => {
    const slots = getSheetSlots(C);
    if (!slots?.pact?.level) {
      onShowToast?.(result?.label || 'Spend Pact Slot', 'No Pact Magic slots available.', 0, []);
      return;
    }
    const pactLevel = Number(slots.pact.level);
    const pactCount = Number(slots.pact.count || 0);
    const used = sheet?.spellSlotUsed || {};
    const expended = Number(used[pactLevel] || used[String(pactLevel)] || 0);
    const available = pactCount - expended;
    if (available <= 0) {
      onShowToast?.(result?.label || 'Spend Pact Slot', 'No Pact Magic slots available. Take a Short Rest to recover them.', 0, []);
      return;
    }
    setConsumePactSlotDialog({
      label: result?.label || 'Spend Pact Slot',
      slotLevel: pactLevel,
      pactMax: pactCount,
      maxConsume: Math.min(Number(result?.amount || 1), available),
      onConsumed: result?.onConsumed || null,
    });
  };

  const confirmConsumePactSlot = (consumeCount) => {
    if (!consumePactSlotDialog) return;
    const level = consumePactSlotDialog.slotLevel;
    const pactMax = consumePactSlotDialog.pactMax;
    const amount = Math.max(1, Math.min(consumeCount || 1, consumePactSlotDialog.maxConsume));
    const used = { ...(sheet?.spellSlotUsed || {}) };
    used[String(level)] = Math.min(
      pactMax,
      (Number(used[String(level)] || 0) + amount)
    );
    onUpdateSheet?.({ spellSlotUsed: used });
    onUpdateCharacter?.((prev) => ({ ...prev, spellSlotsUsed: used }));
    setConsumePactSlotDialog(null);
    onShowToast?.(consumePactSlotDialog.label, `Expended ${amount} Pact Magic slot${amount > 1 ? 's' : ''} (level ${level}).`, 0, []);
  };

  const applyPactSlotRecovery = (result) => {
    if (!(result?.recover > 0)) return;
    const level = Number(result.slotLevel || 1);
    const used = { ...(sheet?.spellSlotUsed || {}) };
    const before = Number(used[level] || 0);
    const after = Math.max(0, before - Number(result.recover || 0));
    const recovered = before - after;
    used[level] = after;
    onUpdateSheet?.({ spellSlotUsed: used });
    onUpdateCharacter?.((prev) => ({ ...prev, spellSlotsUsed: used }));
    if (recovered > 0) {
      const label = result.label || 'Spell Recovery';
      onShowToast?.(label, `Recovered ${recovered} Pact Magic slot${recovered === 1 ? '' : 's'}`, recovered, []);
    } else {
      onShowToast?.(result.label || 'Spell Recovery', 'No expended Pact Magic slots to recover.', 0, []);
    }
  };

  const openSpellSlotRecovery = (result, key) => {
    const budget = Math.max(0, Number(result?.budget || 0));
    if (!budget) return;
    const maxSlotLevel = Math.max(1, Math.min(9, Number(result?.maxSlotLevel || 9)));
    const regularSlots = getSheetSlots(C)?.regular || [];
    const used = sheet?.spellSlotUsed || {};
    const levels = [];
    const topLevel = Math.min(maxSlotLevel, regularSlots.length);
    for (let level = 1; level <= topLevel; level++) {
      const total = Number(regularSlots[level - 1] || 0);
      if (!total) continue;
      const expended = Math.max(0, Math.min(total, Number(used[level] || used[String(level)] || 0)));
      if (!expended) continue;
      levels.push({ level, total, expended });
    }
    if (!levels.length) {
      onShowToast?.(result?.label || resNameMap[key] || 'Spell Recovery', 'No expended eligible spell slots to recover.', 0, []);
      return;
    }
    setSlotRecovery({
      key,
      label: result?.label || resNameMap[key] || 'Spell Recovery',
      budget,
      levels,
    });
    setSlotRecoverySelection(Object.fromEntries(levels.map((entry) => [String(entry.level), 0])));
  };

  const adjustSlotRecoveryLevel = (level, delta) => {
    setSlotRecoverySelection((prev) => {
      if (!slotRecovery) return prev;
      const entry = slotRecovery.levels.find((item) => item.level === level);
      if (!entry) return prev;
      const key = String(level);
      const current = Number(prev[key] || 0);
      if (delta < 0) return { ...prev, [key]: Math.max(0, current - 1) };

      const spent = slotRecovery.levels.reduce((sum, item) => sum + (item.level * Number(prev[String(item.level)] || 0)), 0);
      if (current >= entry.expended) return prev;
      if (spent + level > slotRecovery.budget) return prev;
      return { ...prev, [key]: current + 1 };
    });
  };

  const confirmSlotRecovery = () => {
    if (!slotRecovery) return;
    const used = { ...(sheet?.spellSlotUsed || {}) };
    let recovered = 0;
    const details = [];

    slotRecovery.levels.forEach((entry) => {
      const amount = Math.max(0, Number(slotRecoverySelection[String(entry.level)] || 0));
      if (!amount) return;
      const key = String(entry.level);
      const before = Number(used[key] || 0);
      const after = Math.max(0, before - amount);
      const actual = before - after;
      if (!actual) return;
      used[key] = after;
      recovered += actual;
      details.push(`${actual}× ${SPELL_LEVEL_LABELS[entry.level] || `L${entry.level}`}`);
    });

    setSlotRecovery(null);
    setSlotRecoverySelection({});
    if (!recovered) return;

    onUpdateSheet?.({ spellSlotUsed: used });
    onUpdateCharacter?.((prev) => ({ ...prev, spellSlotsUsed: used }));

    // Arcane Recovery also restores 1 expended Bladesong use
    if (C?.bladesongActive != null) {
      const isBladesinger = (String(C.className || '') === 'Wizard' &&
        (C.subclassShortName === 'Bladesinger' || C.subclassShortName === 'Bladesinging')) ||
        (C.extraClasses || []).some(ec =>
          ec.name === 'Wizard' && (ec.subclassShortName === 'Bladesinger' || ec.subclassShortName === 'Bladesinging')
        );
      if (isBladesinger) {
        const bladeMax = Math.max(1, getMod(getFinal(C, 'int')));
        const bladeCur = Number(resources?.['bladesong'] ?? 0);
        if (bladeCur < bladeMax) {
          const nextRes = { ...resources, bladesong: Math.min(bladeMax, bladeCur + 1) };
          setResources(nextRes);
              onShowToast?.('Arcane Recovery', `Recovered 1 Bladesong use (${Math.min(bladeMax, bladeCur + 1)}/${bladeMax})`, 1, []);
        }
      }
    }

    onShowToast?.(
      slotRecovery.label,
      `Recovered ${recovered} slot${recovered === 1 ? '' : 's'}${details.length ? ` (${details.join(', ')})` : ''}`,
      recovered,
      [],
    );
  };

  const handleResChange = (key, delta) => {
    if (!resources || !setResources) return;
    const max = resMaxMap[key] ?? 1;
    const res = { ...resources };
    res[key] = Math.max(0, Math.min(max, (res[key] || 0) + delta));
    setResources(res);

    if (delta < 0) {
      const sideEffect = installedRegistry.getResourceSideEffect(key);
      if (typeof sideEffect === 'function') {
        let result = null;
        try {
          const slots = getSheetSlots(C);
          result = sideEffect({ character: C, C, sheet, resources: res, PACT_SLOTS, slots });
        } catch {
          result = null;
        }
        if (result?.type === 'recover_pact_slots') {
          applyPactSlotRecovery(result);
        } else if (result?.type === 'recover_spell_slots') {
          openSpellSlotRecovery(result, key);
        } else if (result?.type === 'recover_resource') {
          applyResourceRecovery(result);
        } else if (result?.type === 'create_spell_slot_from_points') {
          openCreateSlotDialog(result);
        } else if (result?.type === 'convert_spell_slot_to_points') {
          openConvertSlotDialog(result);
        } else if (result?.type === 'wild_resurgence') {
          openWildResurgenceDialog(result);
        } else if (result?.type === 'spend_slot_recover_resource') {
          openSpendSlotRecoverResource(result);
        } else if (result?.type === 'consume_pact_slot') {
          openConsumePactSlotDialog(result);
        }
      }
    }
  };

  return (
    <Box sx={panelRootSx}>
      <Box sx={panelToolbarSx}>
        <Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.12em', color: '#edd48a', textTransform: 'uppercase', mr: 0.25 }}>
          Filter
        </Typography>
        {FILTERS.map(f => (
          <Chip
            key={f}
            size="small"
            label={actionLabel(f)}
            variant={filter === f ? 'filled' : 'outlined'}
            color={filter === f ? 'primary' : 'default'}
            onClick={() => setFilter(f)}
            sx={filterChipSx}
          />
        ))}
      </Box>

      {showAttacks && (
        <Box sx={{ overflow: 'auto' }}>
          <Typography sx={levelHeaderSx}>Attacks</Typography>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
            <Box component="thead">
              <Box component="tr" sx={{ '& th': { fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'text.secondary', borderBottom: 1, borderColor: 'divider', p: '4px 6px', textAlign: 'left' } }}>
                <Box component="th">Name</Box>
                <Box component="th">Hit</Box>
                <Box component="th">Damage</Box>
              </Box>
            </Box>
            <Box component="tbody">
              {attacks.map((item, i) => {
                const prof = getMod(getFinal(C, 'str')) > getMod(getFinal(C, 'dex')) ? getMod(getFinal(C, 'str')) : getMod(getFinal(C, 'dex'));
                const hitBonus = fbonus(prof);
                return (
                  <Box component="tr" key={i} sx={{ '& td': { p: '6px 6px', borderBottom: 1, borderColor: 'divider', color: 'text.secondary' }, '&:hover td': { bgcolor: 'rgba(35,32,26,1)' } }}>
                    <Box component="td"><Typography sx={{ color: 'text.primary', fontWeight: 600 }}>{item.name}</Typography></Box>
                    <Box component="td"><Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', fontWeight: 700, color: '#edd48a', fontSize: '0.875rem' }}>{hitBonus}</Typography></Box>
                    <Box component="td"><Typography sx={{ fontFamily: '"Cinzel", Georgia, serif', color: 'text.primary' }}>{item.damage?.[0]?.damage || '—'}</Typography></Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>
      )}

      {actionSections.map(section => (
        <Box key={section.key} sx={{ minWidth: 0 }}>
          <Typography sx={{ ...levelHeaderSx, color: 'primary.main' }}>
            {section.title}
          </Typography>
          <Box sx={{ display: 'grid', gap: '4px', minWidth: 0 }}>
            {section.actions.map((action, i) => (
              <AdapterActionCard
                key={`${section.key}-${i}`}
                C={C}
                sheet={sheet}
                action={action}
                resources={resources}
                onResChange={handleResChange}
                onRoll={onRoll}
                onShowToast={onShowToast}
                resMax={resMaxMap[action.resKey]}
                isPool={resPoolMap[action.resKey]}
                resTrack={resTrackMap[action.resKey]}
              />
            ))}
          </Box>
        </Box>
      ))}

      {!actionSections.length ? <Empty text="No actions for this filter." /> : null}

      <SheetDialog
        open={Boolean(createSlotDialog)}
        onClose={() => setCreateSlotDialog(null)}
        title={createSlotDialog?.label || 'Create Spell Slot'}
        actions={(
          <>
            <Button onClick={() => setCreateSlotDialog(null)} sx={{ color: 'text.secondary' }}>Cancel</Button>
            <Button variant="contained" onClick={confirmCreateSlot} disabled={createSlotSelection == null}>
              Create
            </Button>
          </>
        )}
      >
        {createSlotDialog ? (
          <Box sx={{ display: 'grid', gap: 0.75 }}>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
              Choose a spell slot level to create.
            </Typography>
            {createSlotDialog.levels.map(({ level, cost }) => (
              <Box
                key={level}
                onClick={() => setCreateSlotSelection(level)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1, border: 1,
                  borderColor: createSlotSelection === level ? '#edd48a' : 'divider',
                  borderRadius: 1, px: 1, py: 0.8, cursor: 'pointer',
                  bgcolor: createSlotSelection === level ? 'rgba(237,212,138,0.1)' : 'transparent',
                  '&:hover': { borderColor: '#edd48a', bgcolor: 'rgba(237,212,138,0.06)' },
                }}
              >
                <Typography sx={{ flex: 1, fontSize: '0.78rem', color: 'text.primary' }}>
                  Level {level}
                </Typography>
                <Typography sx={{ fontSize: '0.7rem', color: '#9d7fb8' }}>
                  {cost} SP
                </Typography>
              </Box>
            ))}
          </Box>
        ) : null}
      </SheetDialog>

      <SheetDialog
        open={Boolean(convertSlotDialog)}
        onClose={() => setConvertSlotDialog(null)}
        title={convertSlotDialog?.label || 'Convert Spell Slot'}
        actions={(
          <>
            <Button onClick={() => setConvertSlotDialog(null)} sx={{ color: 'text.secondary' }}>Cancel</Button>
            <Button variant="contained" onClick={confirmConvertSlot} disabled={convertSlotSelection == null}>
              Convert
            </Button>
          </>
        )}
      >
        {convertSlotDialog ? (
          <Box sx={{ display: 'grid', gap: 0.75 }}>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
              Choose an expended spell slot to convert into Sorcery Points.
            </Typography>
            {convertSlotDialog.levels.map(({ level, available, hasCreated }) => (
              <Box
                key={level}
                onClick={() => setConvertSlotSelection(level)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1, border: 1,
                  borderColor: convertSlotSelection === level ? '#edd48a' : 'divider',
                  borderRadius: 1, px: 1, py: 0.8, cursor: 'pointer',
                  bgcolor: convertSlotSelection === level ? 'rgba(237,212,138,0.1)' : 'transparent',
                  '&:hover': { borderColor: '#edd48a', bgcolor: 'rgba(237,212,138,0.06)' },
                }}
              >
                <Typography sx={{ flex: 1, fontSize: '0.78rem', color: 'text.primary' }}>
                  Level {level} ({available} available{hasCreated ? ' · includes temporary' : ''})
                </Typography>
                <Typography sx={{ fontSize: '0.7rem', color: '#9d7fb8' }}>
                  +{level} SP
                </Typography>
              </Box>
            ))}
          </Box>
        ) : null}
      </SheetDialog>

      <SheetDialog
        open={Boolean(wildResurgenceDialog)}
        onClose={() => setWildResurgenceDialog(null)}
        title={wildResurgenceDialog?.label || 'Wild Resurgence'}
        actions={<Button onClick={() => setWildResurgenceDialog(null)} sx={{ color: 'text.secondary' }}>Cancel</Button>}
      >
        {wildResurgenceDialog ? (
          <Box sx={{ display: 'grid', gap: 0.75 }}>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
              Choose an option (Wild Shape remaining: {wildResurgenceDialog.currentWS}).
            </Typography>
            {wildResurgenceDialog.options.map((opt) => (
              <Box
                key={opt.key}
                onClick={() => { confirmWildResurgence(opt.key); }}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1, border: 1,
                  borderColor: 'divider', borderRadius: 1, px: 1, py: 0.8, cursor: 'pointer',
                  '&:hover': { borderColor: '#edd48a', bgcolor: 'rgba(237,212,138,0.06)' },
                }}
              >
                <Box sx={{ fontFamily: '"Cinzel", Georgia, serif', fontSize: '0.72rem', color: '#edd48a' }}>{opt.label}</Box>
              </Box>
            ))}
          </Box>
        ) : null}
      </SheetDialog>

      <SheetDialog
        open={Boolean(spendSlotRecoverDialog)}
        onClose={() => setSpendSlotRecoverDialog(null)}
        title={spendSlotRecoverDialog?.label || 'Spell Slot Recovery'}
        actions={(
          <>
            <Button onClick={() => setSpendSlotRecoverDialog(null)} sx={{ color: 'text.secondary' }}>Cancel</Button>
            <Button variant="contained" onClick={confirmSpendSlotRecover} disabled={spendSlotRecoverSelection == null}>
              Spend Slot & Recover
            </Button>
          </>
        )}
      >
        {spendSlotRecoverDialog ? (
          <Box sx={{ display: 'grid', gap: 0.75 }}>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
              Spend one spell slot to recover {resNameMap[spendSlotRecoverDialog.targetKey] || spendSlotRecoverDialog.targetKey}.
              {spendSlotRecoverDialog.note ? ` ${spendSlotRecoverDialog.note}` : ''}
            </Typography>
            {spendSlotRecoverDialog.levels.map(({ level, available }) => (
              <Box
                key={level}
                onClick={() => setSpendSlotRecoverSelection(level)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1, border: 1,
                  borderColor: spendSlotRecoverSelection === level ? '#edd48a' : 'divider',
                  borderRadius: 1, px: 1, py: 0.8, cursor: 'pointer',
                  bgcolor: spendSlotRecoverSelection === level ? 'rgba(237,212,138,0.1)' : 'transparent',
                  '&:hover': { borderColor: '#edd48a', bgcolor: 'rgba(237,212,138,0.06)' },
                }}
              >
                <Typography sx={{ flex: 1, fontSize: '0.78rem', color: 'text.primary' }}>
                  {SPELL_LEVEL_LABELS[level] || `Level ${level}`} · {available} available
                </Typography>
              </Box>
            ))}
          </Box>
        ) : null}
      </SheetDialog>

      <SheetDialog
        open={Boolean(consumePactSlotDialog)}
        onClose={() => setConsumePactSlotDialog(null)}
        title={consumePactSlotDialog?.label || 'Spend Pact Slot'}
        actions={(
          <>
            <Button onClick={() => setConsumePactSlotDialog(null)} sx={{ color: 'text.secondary' }}>Cancel</Button>
            <Button variant="contained" onClick={() => confirmConsumePactSlot(1)}>
              Spend Pact Slot
            </Button>
          </>
        )}
      >
        {consumePactSlotDialog ? (
          <Box sx={{ display: 'grid', gap: 0.75 }}>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
              Expend one Pact Magic slot (level {consumePactSlotDialog.slotLevel}) to power this feature.
            </Typography>
          </Box>
        ) : null}
      </SheetDialog>

      <SheetDialog
        open={Boolean(slotRecovery)}
        onClose={() => setSlotRecovery(null)}
        title={slotRecovery?.label || 'Recover Spell Slots'}
        actions={(
          <>
            <Button onClick={() => setSlotRecovery(null)} sx={{ color: 'text.secondary' }}>Cancel</Button>
            <Button variant="contained" onClick={confirmSlotRecovery} disabled={!slotRecovery || slotRecoverySpent <= 0}>
              Recover
            </Button>
          </>
        )}
      >
        {slotRecovery ? (
          <Box sx={{ display: 'grid', gap: 0.75 }}>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
              Recover expended spell slots. Budget {slotRecoverySpent}/{slotRecovery.budget}.
            </Typography>
            {slotRecovery.levels.map((entry) => {
              const value = Number(slotRecoverySelection[String(entry.level)] || 0);
              return (
                <Box key={entry.level} sx={{ display: 'flex', alignItems: 'center', gap: 0.6, border: 1, borderColor: 'divider', borderRadius: 1, px: 0.8, py: 0.6 }}>
                  <Typography sx={{ flex: 1, fontSize: '0.72rem', color: 'text.primary' }}>
                    {SPELL_LEVEL_LABELS[entry.level] || `Level ${entry.level}`} · expended {entry.expended}
                  </Typography>
                  <Button size="small" variant="outlined" onClick={() => adjustSlotRecoveryLevel(entry.level, -1)} sx={{ minWidth: 26, px: 0.7 }}>-</Button>
                  <Typography sx={{ minWidth: 16, textAlign: 'center', fontSize: '0.78rem', color: '#edd48a', fontFamily: '"Cinzel", Georgia, serif' }}>{value}</Typography>
                  <Button size="small" variant="outlined" onClick={() => adjustSlotRecoveryLevel(entry.level, 1)} disabled={slotRecoveryRemaining < entry.level || value >= entry.expended} sx={{ minWidth: 26, px: 0.7 }}>+</Button>
                </Box>
              );
            })}
            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
              Remaining budget: {slotRecoveryRemaining}
            </Typography>
          </Box>
        ) : null}
      </SheetDialog>

    </Box>
  );
}

function AdapterActionCard({ C, sheet, action, resources, onResChange, onRoll, onShowToast, resMax, isPool, resTrack }) {
  const { onUpdateCharacter } = useSheetActions();
  const DetailRenderer = action.detailType ? ACTION_DETAIL_RENDERERS[action.detailType] : null;
  const hasRes = action.resKey && resources && resources[action.resKey] != null;
  const resCur = hasRes ? (resources[action.resKey] ?? 0) : 0;
  const safeMax = resMax === Infinity ? Infinity : Math.max(0, Number(resMax ?? 1) || 1);
  const hasEntries = Array.isArray(action.entries) ? action.entries.length > 0 : Boolean(action.entries);
  const hasActionDetails = Boolean(
    action._item
    || hasEntries
    || (action.choiceKey && onUpdateCharacter)
    || action._weaponMastery
    || DetailRenderer
  );
  const hasStatusRow = Boolean(action._toggleKey && onUpdateCharacter);
  const hasPersistentRows = hasStatusRow || hasRes;
  const persistentRowSx = (bgcolor, isLast, open) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    px: '10px',
    py: '5px',
    border: 1,
    borderTop: 'none',
    borderColor: 'divider',
    borderRadius: isLast && !open ? '0 0 8px 8px' : 0,
    bgcolor,
  });

  const rollFormulaButton = (kind) => {
    const formula = resolveFormula(kind === 'heal' ? action.healFormula : action.damageFormula, action, C);
    if (!formula || !onShowToast) return;
    const { total, rolls } = rollFormulaDice(formula);
    const damageKind = String(action?.damageKind || '').toLowerCase();
    const titleLabel = kind === 'heal'
      ? 'Heal'
      : (damageKind === 'utility' ? 'Roll' : damageKind === 'heal' ? 'Heal' : 'Damage');
    onShowToast(formatRollTitle(action.rollLabelPrefix || action.name, titleLabel), formula, total, rolls);
  };
  const damageKind = String(action?.damageKind || '').toLowerCase();
  const damageVerb = damageKind === 'utility' ? 'Roll' : damageKind === 'heal' ? 'Heal' : 'Dmg';
  const damageButtonTone = damageKind === 'utility'
    ? { borderColor: 'rgba(77,149,214,0.4)', color: '#4d95d6' }
    : damageKind === 'heal'
      ? { borderColor: 'rgba(88,184,121,0.4)', color: '#58b879' }
      : { borderColor: 'rgba(255,107,53,0.4)', color: '#ff6b35' };
  const hasRollers = Number.isFinite(action.attackBonus) || action.damageFormula || action.healFormula;

  // Attack-roll advantage/disadvantage from active conditions, combined with the
  // weapon-level disadvantage (heavy/untrained). XPHB 2024: any advantage + any
  // disadvantage cancel to a straight roll.
  const activeConditions = sheet?.activeConditions || [];
  const attackHasDisadv = !!action._disadvantage || hasConditionEffect(activeConditions, 'yourAttacksDisadv');
  const attackHasAdv = hasConditionEffect(activeConditions, 'yourAttacksAdv');
  const attackAdv = attackHasAdv && !attackHasDisadv;
  const attackDisadv = attackHasDisadv && !attackHasAdv;
  const attackAdvArg = attackDisadv ? false : attackAdv ? true : undefined;
  // Situational disadvantage (Frightened in sight, Grappled vs non-grappler):
  // a reminder only — never forced onto the roll.
  const attackCondNotes = getConditionalConditionEffects(activeConditions, 'yourAttacksDisadv')
    .map((c) => `${c.source} (${c.note})`);
  const attackSituational = !attackDisadv && !attackAdv && attackCondNotes.length > 0;
  const attackTag = attackDisadv ? ' DIS' : attackAdv ? ' ADV' : attackSituational ? ' DIS?' : '';
  const attackTooltip = attackCondNotes.length ? `Situational disadvantage: ${attackCondNotes.join('; ')}` : '';
  // When the roll carries disadvantage (DIS), tint the roller with the malus tone
  // (CHIP_TONES.negative) so the penalty reads at a glance. Otherwise keep the
  // not-proficient red / default blue.
  const attackRollerColor = attackDisadv
    ? CHIP_TONES.negative
    : action._notProficient ? '#de675f' : '#4d95d6';
  const attackRollerBorder = attackDisadv
    ? alpha(CHIP_TONES.negative, 0.4)
    : action._notProficient ? 'rgba(222,103,95,0.4)' : 'rgba(77,149,214,0.4)';

  return (
    <ExpandableCard
      containerSx={{ overflow: 'hidden' }}
      disabled={!hasActionDetails}
      summary={({ toggle, disabled, open }) => (
          <Box onClick={disabled ? undefined : toggle} sx={{ ...spellRowSx, mb: 0, py: '7px', borderRadius: open || hasPersistentRows ? '8px 8px 0 0' : 1, cursor: disabled ? 'default' : 'pointer' }}>
            {action.cat && CAT_COLORS[action.cat] && (
              <Box sx={{ width: 6, height: 28, borderRadius: 1, bgcolor: CAT_COLORS[action._colorBarCat || action.cat], flexShrink: 0, opacity: 0.95 }} />
            )}

            <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Typography sx={{ flex: 1, fontSize: '0.78rem', fontWeight: 700, color: 'text.primary', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {action.name}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: '2px', flexShrink: 0 }}>
                {hasRollers ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', flexWrap: 'wrap' }}>
                    {Number.isFinite(action.attackBonus) ? (
                      <AttackRollButton
                        rawBonus={action.attackBonus}
                        exhaustionLevel={sheet?.exhaustionLevel}
                        label={formatRollTitle(action.name, 'Attack')}
                        advArg={attackAdvArg}
                        tag={attackTag}
                        tooltip={attackTooltip}
                        onRoll={onRoll}
                        sx={{ borderColor: attackRollerBorder, color: attackRollerColor }}
                      />
                    ) : null}
                    {action.damageFormula ? (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={(e) => { e.stopPropagation(); rollFormulaButton('damage'); }}
                        sx={{ ...inlineButtonSx, ...damageButtonTone }}
                      >
                        {damageKind === 'utility'
                          ? <Dices size={12} style={{ marginRight: 2 }} />
                          : <Sword size={12} style={{ marginRight: 2 }} />}
                        {damageVerb} {resolveFormula(action.damageFormula, action, C)}
                      </Button>
                    ) : null}
                    {action.healFormula ? (
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        onClick={(e) => { e.stopPropagation(); rollFormulaButton('heal'); }}
                        sx={{ ...inlineButtonSx, borderColor: 'rgba(88,184,121,0.4)', color: '#58b879' }}
                      >
                        <Cross size={12} style={{ marginRight: 2 }} /> Heal {resolveFormula(action.healFormula, action, C)}
                      </Button>
                    ) : null}
                  </Box>
                ) : null}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.4, flexWrap: 'wrap' }}>
                  {(action.tags || []).map((tag) => (
                    <Chip
                      key={tag.key}
                      size="small"
                      variant="outlined"
                      label={tag.label}
                      sx={{ ...tinyMetaChipSx, ...tag.style }}
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          </Box>
      )}
      persistent={({ open }) => (
        <>
      {hasStatusRow ? (() => {
        const toggleCtx = { C, action, hasRes, resCur };
        const toggleField = toggleActiveField(action._toggleKey);
        const isActive = C?.[toggleField] === true;
        const toggleInfo = typeof action._toggleCondition === 'function'
          ? action._toggleCondition(toggleCtx) : {};
        const canToggleOn = !isActive && hasRes && resCur > 0
          && toggleInfo.canActivate !== false;
        const isSuppressed = isActive && toggleInfo.isSuppressed;
        const label = isSuppressed ? 'Suppressed' : (isActive ? 'Active' : 'Inactive');
        const statusTone = isSuppressed ? CHIP_TONES.negative : (isActive ? CHIP_TONES.positive : CHIP_TONES.info);
        const statusStyle = chipToneStyle(statusTone);
        return (
        <Box sx={persistentRowSx('rgba(129,179,232,0.06)', !hasRes, open)}>
          <Typography sx={{ fontSize: '0.55rem', color: 'text.secondary', fontFamily: '"Cinzel", Georgia, serif', mr: 0.5, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Status</Typography>
          <Chip
            size="small"
            label={label}
            variant="outlined"
            onClick={() => {
              if (isActive) {
                onUpdateCharacter(prev => ({ ...prev, [toggleField]: false }));
              } else if (canToggleOn) {
                onUpdateCharacter(prev => ({ ...prev, [toggleField]: true }));
                onResChange?.(action.resKey, -1);
              }
            }}
            sx={{
              cursor: isActive || canToggleOn ? 'pointer' : 'not-allowed',
              fontSize: '0.58rem',
              fontFamily: '"Cinzel", Georgia, serif',
              fontWeight: 700,
              letterSpacing: '0.06em',
              ...statusStyle,
              '&:hover': { borderColor: (isActive || canToggleOn) ? statusTone : statusStyle.borderColor },
            }}
          />
        </Box>
        );
      })() : null}

      {hasRes ? (
        <Box sx={persistentRowSx('rgba(202,165,80,0.06)', true, open)}>
          <Typography sx={{ fontSize: '0.55rem', color: 'text.secondary', fontFamily: '"Cinzel", Georgia, serif', mr: 0.5, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{resTrack === 'used' ? 'Spent' : 'Uses'}</Typography>
          {safeMax === Infinity ? (
            typeof onResChange === 'function' ? (
              <Button
                size="small"
                variant="outlined"
                onClick={(e) => { e.stopPropagation(); onResChange(action.resKey, -1); }}
                sx={{ fontSize: '0.6rem', fontFamily: '"Cinzel", Georgia, serif', letterSpacing: '0.06em', minWidth: 0, py: 0.2, px: 0.6, color: '#edd48a', borderColor: 'rgba(237,212,138,0.35)', '&:hover': { borderColor: '#edd48a', bgcolor: 'rgba(237,212,138,0.08)' } }}
              >{action.buttonLabel || (action.controller ? 'Open' : 'Use')}</Button>
            ) : (
              <Typography sx={{ fontSize: '0.7rem', color: '#edd48a', fontFamily: '"Cinzel", Georgia, serif', fontWeight: 700 }}>∞</Typography>
            )
          ) : (isPool || safeMax > 10) ? (
            <ResourceBar value={resCur} max={safeMax} onChange={(delta) => onResChange(action.resKey, delta)} />
          ) : (
            Array.from({ length: safeMax }, (_, i) => {
              const available = i >= safeMax - resCur;
              return (
                <PipButton
                  key={i}
                  size={10}
                  round
                  title={available ? 'Available' : 'Used'}
                  aria-label={`${action.name}: ${available ? 'spend use' : 'recover use'}`}
                  onClick={(e) => { e.stopPropagation(); onResChange(action.resKey, available ? -1 : 1); }}
                  sx={{
                    border: '1.5px solid',
                    bgcolor: available ? 'transparent' : '#edd48a',
                    borderColor: available ? 'rgba(202,165,80,0.35)' : '#edd48a',
                  }}
                />
              );
            })
          )}
        </Box>
      ) : null}
        </>
      )}
      detailsSx={{ ...spellBodySx, mt: 0, mb: 0 }}
      details={hasActionDetails ? (
        <>
          {action._item ? <ItemPropertyTable item={action._item} sx={{ mb: '6px' }} /> : null}
          {hasEntries ? <EntryBlocks entries={action.entries} emptyText="" /> : null}
          {action.choiceKey && onUpdateCharacter ? (
            <ChoicePicker action={action} C={C} onUpdateCharacter={onUpdateCharacter} onShowToast={onShowToast} />
          ) : null}
          <WeaponMasteryBlock mastery={action._weaponMastery} />
          {DetailRenderer ? (
            <DetailRenderer action={action} character={C} sheet={sheet} />
          ) : null}
        </>
      ) : null}
    />
  );
}

const _CHOICE_PICKER_OPTIONS = {
  armorer_model: [
    { value: 'Guardian', label: 'Guardian (Defensive Tank)' },
    { value: 'Infiltrator', label: 'Infiltrator (Fast Striker)' },
    { value: 'Dreadnaught', label: 'Dreadnought (Force + Reach)' },
  ],
};

function ChoicePicker({ action, C, onUpdateCharacter, onShowToast }) {
  const choiceKey = action.choiceKey;
  const options = action.choiceOptions || _CHOICE_PICKER_OPTIONS[choiceKey];
  if (!options || !options.length) return null;
  const current = getChoiceValue(C, choiceKey);
  const q = String(current || '').toLowerCase();
  const match = options.find((o) => String(o.value).toLowerCase() === q);
  const activeValue = match ? match.value : '';

  const handleChange = (_, next) => {
    if (!next || next === activeValue) return;
    onUpdateCharacter((prev) => {
      const choices = { ...(prev.choices || {}) };
      choices[choiceKey] = next;
      return { ...prev, choices };
    });
    onShowToast?.('Choice Updated', `${action.choiceLabel || 'Choice'}: ${next}`, 0, []);
  };

  return (
    <Box sx={{ mt: 0.7, pt: 0.5, borderTop: '1px dashed', borderColor: 'divider' }}>
      <Typography sx={{ fontSize: '0.6rem', color: '#edd48a', fontFamily: '"Cinzel", Georgia, serif', fontWeight: 700, letterSpacing: '0.08em', mb: 0.3 }}>
        {action.choiceLabel || 'Active Option'}
      </Typography>
      <ToggleButtonGroup size="small" exclusive value={activeValue} onChange={handleChange}
        sx={{ flexWrap: 'wrap', gap: '3px', '& .MuiToggleButton-root': { fontSize: '0.65rem', px: '8px', py: '3px', border: 1, borderColor: 'divider', borderRadius: '999px !important', color: 'text.secondary', bgcolor: 'transparent', '&.Mui-selected': { bgcolor: 'rgba(202,165,80,0.14)', color: '#edd48a', borderColor: '#caa550' } } }}
      >
        {options.map((opt) => (
          <ToggleButton key={opt.value} value={opt.value}>{opt.label}</ToggleButton>
        ))}
      </ToggleButtonGroup>
      <Typography component="div" sx={{ fontSize: '0.55rem', color: 'text.secondary', mt: 0.2, fontStyle: 'italic' }}>
        <RichInline text={action.choiceRestNote || "Change when you finish a Short or Long Rest (Smith's Tools required)."} keyPrefix={`choice-${action.choiceKey || 'note'}`} />
      </Typography>
    </Box>
  );
}
