import { adapterRegistry } from '../../../adapters/index.js';
import {
  buyCreatedSlot, usePactSlotEffects, useSlotForResource, useSlotRecovery, useSorceryPointSlots,
} from './resourceEffectDialogs.js';
import { getSpellSlots } from '../../../shared/character/spells/spellcasting.js';
import { clamp } from '../../../shared/numbers.js';

// What spending an adapter resource, or pressing a card's `effect` button,
// triggers (registered with registerResourceSideEffect): a notice, recovering
// slots or resources at once, or opening
// a dialog to pick a slot — Font of Magic (create / convert), spending a slot
// to recover a resource (Wild Resurgence's Wild Shape use), spending another
// resource for a spell slot (its level 1 slot), spending a Pact Magic slot, and
// Arcane Recovery style budgets. `handleResChange` is the card's +/- handler,
// `handleEffect` its effect button;
// `dialogs` is the state the SlotDialogs render, from one hook per dialog
// family (resourceEffectDialogs.js).
export function useResourceSideEffects(ctx) {
  const { C, sheet, resources, setResources, onNotice, resMaxMap, resNameMap } = ctx;
  const sorcery = useSorceryPointSlots(ctx);
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
      onNotice?.(result.label || 'Resource Recovery', `${resNameMap[targetKey] || targetKey} already at maximum.`);
      return;
    }
    res[targetKey] = after;
    setResources(res);
    onNotice?.(result.label || 'Resource Recovery', `Recovered ${recovered} ${resNameMap[targetKey] || targetKey}`);
  };

  // One use of `costKey` for a temporary spell slot of `slotLevel`; with none
  // of it left, the use just spent on the card is given back.
  const applyResourceForSlot = (result, spentKey, res) => {
    const label = result.label || 'Spell Slot';
    const costName = resNameMap[result.costKey] || result.costKey;
    if (!buyCreatedSlot(ctx, res, result.costKey, 1, result.slotLevel)) {
      if (spentKey) setResources({ ...res, [spentKey]: Number(res[spentKey] || 0) + 1 });
      onNotice?.(label, `No ${costName} use left to expend.`);
      return;
    }
    onNotice?.(label, `Expended 1 ${costName} use for a level ${result.slotLevel} spell slot.`);
  };

  const handleResChange = (key, delta) => {
    if (!resources || !setResources) return;
    const max = resMaxMap[key] ?? 1;
    const res = { ...resources };
    res[key] = clamp((res[key] || 0) + delta, 0, max);
    setResources(res);
    if (delta < 0) runSideEffect(key, res, key);
  };

  // A card's `effect`: its side effect with no resource spent.
  const handleEffect = (key) => {
    if (!resources || !setResources) return;
    runSideEffect(key, { ...resources }, null);
  };

  // What the side effect registered under `key` does, on the resources `res`;
  // `spentKey`: the resource a use was just spent from, if any (given back
  // when the effect cannot happen).
  const runSideEffect = (key, res, spentKey) => {
    const sideEffect = adapterRegistry.getResourceSideEffect(key);
    if (typeof sideEffect === 'function') {
      let result = null;
      try {
        const slots = getSpellSlots(C);
        // `resourceMax`: the resolved maximum of each resource, so a side
        // effect never re-derives one (resMaxMap).
        result = sideEffect({ character: C, sheet, resources: res, resourceMax: resMaxMap, slots });
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
      } else if (result?.type === 'spend_resource_for_slot') {
        applyResourceForSlot(result, spentKey, res);
      } else if (result?.type === 'notice') {
        onNotice?.(result.label, result.message);
      } else if (result?.type === 'spend_slot_recover_resource') {
        slotForResource.openSpendSlotRecoverResource(result);
      } else if (result?.type === 'consume_pact_slot') {
        pact.openConsumePactSlotDialog(result);
      }
    }
  };

  return {
    handleResChange,
    handleEffect,
    // What SlotDialogs renders.
    dialogs: { ...sorcery, ...slotForResource, ...pact, ...recovery },
  };
}
