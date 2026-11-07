import { adapterRegistry } from '../../../adapters/index.js';
import {
  usePactSlotEffects, useSlotForResource, useSlotRecovery, useSorceryPointSlots, useWildResurgence,
} from './resourceEffectDialogs.js';
import { getSheetSlots } from '../spells/spellcasting.js';

// What spending an adapter resource triggers (registered with
// registerResourceSideEffect): recovering slots or resources at once, or opening
// a dialog to pick a slot — Font of Magic (create / convert), Wild Resurgence,
// spending a slot to recover a resource, spending a Pact Magic slot, and
// Arcane Recovery style budgets. `handleResChange` is the card's +/- handler;
// `dialogs` is the state the SlotDialogs render, from one hook per dialog
// family (resourceEffectDialogs.js).
export function useResourceSideEffects(ctx) {
  const { C, sheet, resources, setResources, onShowToast, resMaxMap, resNameMap } = ctx;
  const sorcery = useSorceryPointSlots(ctx);
  const wildResurgence = useWildResurgence(ctx);
  const slotForResource = useSlotForResource(ctx);
  const pact = usePactSlotEffects(ctx);
  const recovery = useSlotRecovery(ctx);

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

  const handleResChange = (key, delta) => {
    if (!resources || !setResources) return;
    const max = resMaxMap[key] ?? 1;
    const res = { ...resources };
    res[key] = Math.max(0, Math.min(max, (res[key] || 0) + delta));
    setResources(res);

    if (delta < 0) {
      const sideEffect = adapterRegistry.getResourceSideEffect(key);
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
          pact.applyPactSlotRecovery(result);
        } else if (result?.type === 'recover_spell_slots') {
          recovery.openSpellSlotRecovery(result, key);
        } else if (result?.type === 'recover_resource') {
          applyResourceRecovery(result);
        } else if (result?.type === 'create_spell_slot_from_points') {
          sorcery.openCreateSlotDialog(result);
        } else if (result?.type === 'convert_spell_slot_to_points') {
          sorcery.openConvertSlotDialog(result);
        } else if (result?.type === 'wild_resurgence') {
          wildResurgence.openWildResurgenceDialog(result);
        } else if (result?.type === 'spend_slot_recover_resource') {
          slotForResource.openSpendSlotRecoverResource(result);
        } else if (result?.type === 'consume_pact_slot') {
          pact.openConsumePactSlotDialog(result);
        }
      }
    }
  };

  return {
    handleResChange,
    // What SlotDialogs renders.
    dialogs: { ...sorcery, ...wildResurgence, ...slotForResource, ...pact, ...recovery },
  };
}
