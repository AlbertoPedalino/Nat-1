import { useState } from 'react';
import { installedRegistry } from '../../../adapters/index.js';
import { SPELL_LEVEL_LABELS } from '../../../shared/character/spells/spellTables.js';
import { getSheetSlots } from '../spells/spellcasting.js';
import { addCreatedSlot, availableRegularSlotLevels, consumeSlot, getPactSlotUsed, getPactSlotUsedKey, getRegularSlotUsed, lowestAvailableSlotLevel, persistUsedSlots, recoverPactSlots } from '../../../shared/character/spells/spellSlots.js';

// What spending an adapter resource triggers (registered with
// registerResourceSideEffect): recovering slots or resources at once, or opening
// a dialog to pick a slot — Font of Magic (create / convert), Wild Resurgence,
// spending a slot to recover a resource, spending a Pact Magic slot, and
// Arcane Recovery style budgets. `handleResChange` is the card's +/- handler;
// `dialogs` is the state the SlotDialogs render.
export function useResourceSideEffects({
  C, sheet, resources, setResources, onShowToast, onUpdateSheet, onUpdateCharacter, resMaxMap, resNameMap,
}) {
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
    addCreatedSlot(sheet, level, onUpdateSheet, onUpdateCharacter);
    setCreateSlotDialog(null);
    setCreateSlotSelection(null);
    onShowToast?.('Create Spell Slot', `Created a temporary level ${level} spell slot (lasts until Long Rest).`, 0, []);
  };

  const openConvertSlotDialog = (result) => {
    const levels = availableRegularSlotLevels(getSheetSlots(C)?.regular || [], sheet);
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
    consumeSlot(getSheetSlots(C)?.regular || [], sheet, level, onUpdateSheet, onUpdateCharacter);
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
      addCreatedSlot(sheet, 1, onUpdateSheet, onUpdateCharacter);
      onShowToast?.('Wild Resurgence', 'Expended 1 Wild Shape use to create a temporary level 1 spell slot.', 0, []);
    } else if (choice === 'slot_to_shape') {
      const regularSlots = getSheetSlots(C)?.regular || [];
      const level = lowestAvailableSlotLevel(regularSlots, sheet);
      const consumed = level > 0 && consumeSlot(regularSlots, sheet, level, onUpdateSheet, onUpdateCharacter);
      if (!consumed) { onShowToast?.('Wild Resurgence', 'No available spell slots to expend.', 0, []); return; }
      const res = { ...resources };
      const beforeWS = Number(res.wild_shape || 0);
      res.wild_shape = Math.min(resMaxMap.wild_shape ?? 0, beforeWS + 1);
      setResources(res);
        onShowToast?.('Wild Resurgence', 'Regained 1 Wild Shape use by spending a spell slot.', 0, []);
    }
  };

  const openSpendSlotRecoverResource = (result) => {
    if (!result?.targetKey) return;
    const levels = availableRegularSlotLevels(getSheetSlots(C)?.regular || [], sheet);
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
    consumeSlot(getSheetSlots(C)?.regular || [], sheet, level, onUpdateSheet, onUpdateCharacter);
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
    const expended = getPactSlotUsed(used, pactLevel);
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
    const key = getPactSlotUsedKey(level);
    used[key] = Math.min(
      pactMax,
      (getPactSlotUsed(used, level) + amount)
    );
    persistUsedSlots(used, onUpdateSheet, onUpdateCharacter);
    setConsumePactSlotDialog(null);
    onShowToast?.(consumePactSlotDialog.label, `Expended ${amount} Pact Magic slot${amount > 1 ? 's' : ''} (level ${level}).`, 0, []);
  };

  const applyPactSlotRecovery = (result) => {
    if (!(result?.recover > 0)) return;
    const level = Number(result.slotLevel || 1);
    const recovery = recoverPactSlots(sheet?.spellSlotUsed, level, result.recover);
    if (!recovery) return;
    const { used, recovered } = recovery;
    persistUsedSlots(used, onUpdateSheet, onUpdateCharacter);
    const label = result.label || 'Spell Recovery';
    onShowToast?.(label, `Recovered ${recovered} Pact Magic slot${recovered === 1 ? '' : 's'}`, recovered, []);
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
      const expended = Math.max(0, Math.min(total, getRegularSlotUsed(used, level)));
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

    persistUsedSlots(used, onUpdateSheet, onUpdateCharacter);

    // Arcane Recovery also restores 1 expended Bladesong use. The Bladesong
    // resource exists only for a Bladesinger and carries its own max.
    if (C?.bladesongActive != null) {
      const bladeMax = resMaxMap.bladesong;
      if (bladeMax != null) {
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
          result = sideEffect({ character: C, C, sheet, resources: res, slots });
        } catch {
          result = null;
        }
        if (Array.isArray(result?.recoverResourceKeys) && result.recoverResourceKeys.length) {
          const recoveredResources = { ...res };
          let changed = false;
          result.recoverResourceKeys.forEach((targetKey) => {
            if (!Object.prototype.hasOwnProperty.call(recoveredResources, targetKey)) return;
            const targetMax = resMaxMap[targetKey];
            if (!Number.isFinite(targetMax)) return;
            if (Number(recoveredResources[targetKey] || 0) >= targetMax) return;
            recoveredResources[targetKey] = targetMax;
            changed = true;
          });
          if (changed) setResources(recoveredResources);
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

  return {
    handleResChange,
    dialogs: {
      slotRecovery,
      setSlotRecovery,
      slotRecoverySelection,
      createSlotDialog,
      setCreateSlotDialog,
      createSlotSelection,
      setCreateSlotSelection,
      convertSlotDialog,
      setConvertSlotDialog,
      convertSlotSelection,
      setConvertSlotSelection,
      wildResurgenceDialog,
      setWildResurgenceDialog,
      spendSlotRecoverDialog,
      setSpendSlotRecoverDialog,
      spendSlotRecoverSelection,
      setSpendSlotRecoverSelection,
      consumePactSlotDialog,
      setConsumePactSlotDialog,
      confirmCreateSlot,
      confirmConvertSlot,
      confirmWildResurgence,
      confirmSpendSlotRecover,
      confirmConsumePactSlot,
      adjustSlotRecoveryLevel,
      confirmSlotRecovery,
      slotRecoverySpent,
      slotRecoveryRemaining,
    },
  };
}
