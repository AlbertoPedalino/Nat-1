import { useState } from 'react';
import { SPELL_LEVEL_LABELS } from '../../../shared/character/spells/spellTables.js';
import { getSpellSlots } from '../../../shared/character/spells/spellcasting.js';
import { addCreatedSlot, availableRegularSlotLevels, consumeSlot, getPactSlotUsed, getPactSlotUsedKey, getRegularSlotUsed, lowestAvailableSlotLevel, persistUsedSlots, recoverPactSlots } from '../../../shared/character/spells/spellSlots.js';

// The dialogs a spent resource can open (useResourceSideEffects), one hook per
// family: its state, how it opens and what confirming it does. Each takes
// the sheet context { C, sheet, resources, setResources, onNotice,
// onUpdateSheet, onUpdateCharacter, resMaxMap, resNameMap }.

// Font of Magic: spend Sorcery Points for a temporary slot, or a slot for points.
export function useSorceryPointSlots(ctx) {
  const { C, sheet, resources, setResources, onNotice, onUpdateSheet, onUpdateCharacter, resMaxMap } = ctx;
  const [createSlotDialog, setCreateSlotDialog] = useState(null);
  const [createSlotSelection, setCreateSlotSelection] = useState(null);
  const [convertSlotDialog, setConvertSlotDialog] = useState(null);
  const [convertSlotSelection, setConvertSlotSelection] = useState(null);

  const openCreateSlotDialog = (result) => {
    const currentSP = Number(result?.currentSP || 0);
    const table = result?.conversionTable || {};
    const levels = Object.entries(table)
      .filter(([level, cost]) => currentSP >= cost)
      .map(([level, cost]) => ({ level: Number(level), cost }));
    if (!levels.length) {
      onNotice?.(result?.label || 'Create Spell Slot', 'Not enough Sorcery Points.');
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
    if (beforeSP < cost) { onNotice?.('Create Spell Slot', 'Not enough Sorcery Points.'); return; }
    res[createSlotDialog.sourceKey] = beforeSP - cost;
    setResources(res);
    addCreatedSlot(sheet, level, onUpdateSheet, onUpdateCharacter);
    setCreateSlotDialog(null);
    setCreateSlotSelection(null);
    onNotice?.('Create Spell Slot', `Created a temporary level ${level} spell slot (lasts until Long Rest).`);
  };

  const openConvertSlotDialog = (result) => {
    const levels = availableRegularSlotLevels(getSpellSlots(C)?.regular || [], sheet);
    if (!levels.length) {
      onNotice?.(result?.label || 'Convert Spell Slot', 'No spell slots available to convert.');
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
    if (afterSP <= beforeSP) { onNotice?.('Convert Spell Slot', 'Sorcery Points already at maximum.'); return; }
    consumeSlot(getSpellSlots(C)?.regular || [], sheet, level, onUpdateSheet, onUpdateCharacter);
    res[targetKey] = afterSP;
    setResources(res);
    setConvertSlotDialog(null);
    setConvertSlotSelection(null);
    onNotice?.('Convert Spell Slot', `Converted a level ${level} spell slot into ${spGain} Sorcery Points.`);
  };

  return { openCreateSlotDialog, openConvertSlotDialog, createSlotDialog, setCreateSlotDialog, createSlotSelection, setCreateSlotSelection, convertSlotDialog, setConvertSlotDialog, convertSlotSelection, setConvertSlotSelection, confirmCreateSlot, confirmConvertSlot };
}

// Wild Resurgence: a Wild Shape use for a level 1 slot, or a slot for a use.
export function useWildResurgence(ctx) {
  const { C, sheet, resources, setResources, onNotice, onUpdateSheet, onUpdateCharacter, resMaxMap } = ctx;
  const [wildResurgenceDialog, setWildResurgenceDialog] = useState(null);

  const openWildResurgenceDialog = (result) => {
    if (!result) return;
    const opts = [];
    if (result.hasWildShape) opts.push({ key: 'shape_to_slot', label: 'Expend 1 Wild Shape use to create a temporary level 1 spell slot', icon: 'paw-print' });
    if (result.hasAvailableSlot) opts.push({ key: 'slot_to_shape', label: 'Spend a spell slot (level 1+) to regain 1 Wild Shape use', icon: 'sparkles' });
    if (!opts.length) {
      onNotice?.(result.label || 'Wild Resurgence', 'No Wild Shape uses or spell slots available.');
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
      if (beforeWS <= 0) { onNotice?.('Wild Resurgence', 'No Wild Shape uses available.'); return; }
      res.wild_shape = beforeWS - 1;
      setResources(res);
      addCreatedSlot(sheet, 1, onUpdateSheet, onUpdateCharacter);
      onNotice?.('Wild Resurgence', 'Expended 1 Wild Shape use to create a temporary level 1 spell slot.');
    } else if (choice === 'slot_to_shape') {
      const regularSlots = getSpellSlots(C)?.regular || [];
      const level = lowestAvailableSlotLevel(regularSlots, sheet);
      const consumed = level > 0 && consumeSlot(regularSlots, sheet, level, onUpdateSheet, onUpdateCharacter);
      if (!consumed) { onNotice?.('Wild Resurgence', 'No available spell slots to expend.'); return; }
      const res = { ...resources };
      const beforeWS = Number(res.wild_shape || 0);
      res.wild_shape = Math.min(resMaxMap.wild_shape ?? 0, beforeWS + 1);
      setResources(res);
        onNotice?.('Wild Resurgence', 'Regained 1 Wild Shape use by spending a spell slot.');
    }
  };

  return { openWildResurgenceDialog, wildResurgenceDialog, setWildResurgenceDialog, confirmWildResurgence };
}

// Expending a spell slot to recover uses of another resource.
export function useSlotForResource(ctx) {
  const { C, sheet, resources, setResources, onNotice, onUpdateSheet, onUpdateCharacter, resNameMap } = ctx;
  const [spendSlotRecoverDialog, setSpendSlotRecoverDialog] = useState(null);
  const [spendSlotRecoverSelection, setSpendSlotRecoverSelection] = useState(null);

  const openSpendSlotRecoverResource = (result) => {
    if (!result?.targetKey) return;
    const levels = availableRegularSlotLevels(getSpellSlots(C)?.regular || [], sheet);
    if (!levels.length) {
      onNotice?.(result?.label || 'Spell Slot Recovery', 'No spell slots available to expend.');
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
      onNotice?.(spendSlotRecoverDialog.label, `${resNameMap[targetKey] || targetKey} already at maximum.`);
      setSpendSlotRecoverDialog(null);
      setSpendSlotRecoverSelection(null);
      return;
    }
    const afterTarget = Math.min(max, beforeTarget + amount);
    const actualRecover = afterTarget - beforeTarget;
    if (actualRecover <= 0) {
      onNotice?.(spendSlotRecoverDialog.label, `${resNameMap[targetKey] || targetKey} already at maximum.`);
      setSpendSlotRecoverDialog(null);
      setSpendSlotRecoverSelection(null);
      return;
    }
    consumeSlot(getSpellSlots(C)?.regular || [], sheet, level, onUpdateSheet, onUpdateCharacter);
    res[targetKey] = afterTarget;
    setResources(res);
    setSpendSlotRecoverDialog(null);
    setSpendSlotRecoverSelection(null);
    const label = resNameMap[targetKey] || targetKey;
    onNotice?.(spendSlotRecoverDialog.label, `Recovered ${actualRecover} ${label} by expending a level ${level} spell slot.`);
  };

  return { openSpendSlotRecoverResource, spendSlotRecoverDialog, setSpendSlotRecoverDialog, spendSlotRecoverSelection, setSpendSlotRecoverSelection, confirmSpendSlotRecover };
}

// Pact Magic slots a resource spends, or recovers at once.
export function usePactSlotEffects(ctx) {
  const { C, sheet, onNotice, onUpdateSheet, onUpdateCharacter } = ctx;
  const [consumePactSlotDialog, setConsumePactSlotDialog] = useState(null);

  const openConsumePactSlotDialog = (result) => {
    const slots = getSpellSlots(C);
    if (!slots?.pact?.level) {
      onNotice?.(result?.label || 'Spend Pact Slot', 'No Pact Magic slots available.');
      return;
    }
    const pactLevel = Number(slots.pact.level);
    const pactCount = Number(slots.pact.count || 0);
    const used = sheet?.spellSlotUsed || {};
    const expended = getPactSlotUsed(used, pactLevel);
    const available = pactCount - expended;
    if (available <= 0) {
      onNotice?.(result?.label || 'Spend Pact Slot', 'No Pact Magic slots available. Take a Short Rest to recover them.');
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
    onNotice?.(consumePactSlotDialog.label, `Expended ${amount} Pact Magic slot${amount > 1 ? 's' : ''} (level ${level}).`);
  };

  const applyPactSlotRecovery = (result) => {
    if (!(result?.recover > 0)) return;
    const level = Number(result.slotLevel || 1);
    const recovery = recoverPactSlots(sheet?.spellSlotUsed, level, result.recover);
    if (!recovery) return;
    const { used, recovered } = recovery;
    persistUsedSlots(used, onUpdateSheet, onUpdateCharacter);
    const label = result.label || 'Spell Recovery';
    onNotice?.(label, `Recovered ${recovered} Pact Magic slot${recovered === 1 ? '' : 's'}`);
  };

  return { openConsumePactSlotDialog, applyPactSlotRecovery, consumePactSlotDialog, setConsumePactSlotDialog, confirmConsumePactSlot };
}

// Arcane Recovery style budgets: pick expended slots up to a level total.
export function useSlotRecovery(ctx) {
  const { C, sheet, resources, setResources, onNotice, onUpdateSheet, onUpdateCharacter, resMaxMap, resNameMap } = ctx;
  const [slotRecovery, setSlotRecovery] = useState(null);
  const [slotRecoverySelection, setSlotRecoverySelection] = useState({});
  const slotRecoverySpent = slotRecovery
    ? slotRecovery.levels.reduce((sum, entry) => sum + (entry.level * Number(slotRecoverySelection[String(entry.level)] || 0)), 0)
    : 0;
  const slotRecoveryRemaining = slotRecovery ? Math.max(0, slotRecovery.budget - slotRecoverySpent) : 0;

  const openSpellSlotRecovery = (result, key) => {
    const budget = Math.max(0, Number(result?.budget || 0));
    if (!budget) return;
    const maxSlotLevel = Math.max(1, Math.min(9, Number(result?.maxSlotLevel || 9)));
    const regularSlots = getSpellSlots(C)?.regular || [];
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
      onNotice?.(result?.label || resNameMap[key] || 'Spell Recovery', 'No expended eligible spell slots to recover.');
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
              onNotice?.('Arcane Recovery', `Recovered 1 Bladesong use (${Math.min(bladeMax, bladeCur + 1)}/${bladeMax})`);
        }
      }
    }

    onNotice?.(
      slotRecovery.label,
      `Recovered ${recovered} slot${recovered === 1 ? '' : 's'}${details.length ? ` (${details.join(', ')})` : ''}`,
    );
  };

  return { openSpellSlotRecovery, slotRecovery, setSlotRecovery, slotRecoverySelection, adjustSlotRecoveryLevel, confirmSlotRecovery, slotRecoverySpent, slotRecoveryRemaining };
}
