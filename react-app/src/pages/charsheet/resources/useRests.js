import { useCallback, useState } from 'react';
import { getMod, getFinal, clampExhaustion } from '../../../shared/character/sheet/sheetStats.js';
import { applyVitalCommand } from '../../../shared/character/combat/vitalCommands.js';
import { clearCraftedByFlag, VANISH_ON_LONG_REST_FLAGS } from '../../../shared/character/inventory/craftedItemState.js';
import { longRestCharacterPatch } from '../../../shared/character/resources/longRest.js';
import {
  applyResourceRest,
  getAllResourceDefs,
  getHitDicePools,
  getUsedHitDiceTotal,
} from '../../../shared/character/resources/restResources.js';
import { clearedToggles } from '../state/toggleState.js';
import { applyFreeCastRest } from '../../../shared/character/spells/spellFreeCasts.js';
import { getFreeCastDefsForCharacter } from '../spells/spellFreeCastDefs.js';
import { adapterRegistry } from '../../../adapters/registry.js';
import { rollDie } from '../../../shared/character/dice/dice.js';

// Short and Long Rest: the dialogs' state and what confirming each one does to
// HP, Hit Dice, slots, resources, free casts, toggles and rest-bound features.
export function useRests({ C, sheet, setSheet, resources, setResources, freeCastUses, setFreeCastUses, persist, showDiceToast, showNotice }) {
  const [shortRestOpen, setShortRestOpen] = useState(false);
  const [longRestOpen, setLongRestOpen] = useState(false);
  const [hdToSpend, setHdToSpend] = useState({});

  const openShortRest = useCallback(() => {
    setHdToSpend({});
    setShortRestOpen(true);
  }, []);

  const confirmShortRest = useCallback(() => {
    let s = { ...sheet };
    let res = { ...resources };
    const conMod = getMod(getFinal(C, 'con'));
    const pools = getHitDicePools(C, s.usedHDPools, s.usedHD);
    const spendByPool = {};

    let totalHeal = 0;
    const rolls = [];
    pools.forEach((pool) => {
      const n = Math.max(0, Math.min(Number(hdToSpend[pool.key] || 0), pool.remaining));
      if (!n) return;
      spendByPool[pool.key] = n;
      for (let i = 0; i < n; i++) {
        const v = rollDie(pool.faces);
        rolls.push({ v, faces: pool.faces, label: pool.label });
        totalHeal += v + conMod;
      }
    });
    const totalSpent = getUsedHitDiceTotal(spendByPool);

    const patch = {};
    // The healing is the shared modifyHp command, as the cloud applies it.
    const heal = { type: 'modifyHp', delta: Math.max(0, totalHeal) };
    if (totalSpent > 0) {
      const vitals = applyVitalCommand(s, heal, s.baseMaxHP);
      s = { ...s, ...vitals };
      const nextUsedPools = {};
      pools.forEach((pool) => {
        nextUsedPools[pool.key] = pool.used + (spendByPool[pool.key] || 0);
      });
      s.usedHDPools = nextUsedPools;
      s.usedHD = getUsedHitDiceTotal(nextUsedPools);
      Object.assign(patch, vitals, { usedHD: s.usedHD, usedHDPools: s.usedHDPools });
    }

    if (C) {
      res = applyResourceRest(res, getAllResourceDefs(C), C, 'short');
      setResources(res);
      patch.resources = res;
      const nextFC = applyFreeCastRest(freeCastUses, getFreeCastDefsForCharacter(C), 'short');
      setFreeCastUses(nextFC);
      patch.freeCastUses = nextFC;
    }

    setSheet(s);
    if (Object.keys(patch).length) persist(patch, { command: heal });
    setShortRestOpen(false);
    if (totalSpent > 0) {
      showDiceToast('Short Rest', `Healed ${totalHeal} HP (${totalSpent} HD spent)`, totalHeal, rolls);
    } else {
      showNotice('Short Rest', 'Short Rest complete (no Hit Dice spent).');
    }
  }, [sheet, resources, freeCastUses, C, hdToSpend, persist, showDiceToast, showNotice]);

  const openLongRest = useCallback(() => {
    setLongRestOpen(true);
  }, []);

  const confirmLongRest = useCallback(() => {
    let res = { ...resources };
    // A long rest lowers Exhaustion by 1 (XPHB 2024). Hit points, temporary HP,
    // death saves and the conditions are the shared longRest command's, as the
    // cloud applies it.
    const exhaustionLevel = clampExhaustion((sheet.exhaustionLevel || 0) - 1);
    const command = { type: 'longRest', exhaustionLevel };
    const vitals = applyVitalCommand(sheet, command, sheet.baseMaxHP);
    const s = {
      ...sheet,
      ...vitals,
      exhaustionLevel,
      usedHD: 0,
      usedHDPools: {},
      spellSlotUsed: {},
      createdSpellSlots: {},
    };

    // Crafted items that last only until a Long Rest (Tinker's Magic, Fast
    // Crafting) vanish now. Replicate Magic Item items persist and are untouched.
    const prunedInv = clearCraftedByFlag(s.sheetInventory || [], VANISH_ON_LONG_REST_FLAGS);
    const inventoryVanished = prunedInv.length !== (s.sheetInventory || []).length;
    if (inventoryVanished) s.sheetInventory = prunedInv;

    const patch = {
      ...vitals,
      usedHD: 0, usedHDPools: {},
      spellSlotsUsed: {}, createdSpellSlots: {},
      exhaustionLevel,
    };
    if (inventoryVanished) patch.inventory = prunedInv;

    if (C) {
      res = applyResourceRest(res, getAllResourceDefs(C), C, 'long');
      setResources(res);
      patch.resources = res;
      const nextFC = applyFreeCastRest(freeCastUses, getFreeCastDefsForCharacter(C), 'long');
      setFreeCastUses(nextFC);
      patch.freeCastUses = nextFC;
      Object.assign(patch, clearedToggles(C));
      Object.assign(patch, longRestCharacterPatch(C));
    }

    if (C?.speciesName) {
      const grants = adapterRegistry.getSpeciesLongRestGrants(C.speciesName, C.speciesSource);
      if (grants?.inspiration) {
        s.sheetInspiration = true;
        patch.inspiration = true;
      }
    }

    setSheet(s);
    persist(patch, { command });
    setLongRestOpen(false);
    showNotice('Long Rest', 'Fully restored!');
  }, [sheet, resources, freeCastUses, C, persist, showNotice]);

  return {
    openShortRest,
    openLongRest,
    shortRestOpen,
    longRestOpen,
    closeShortRest: () => setShortRestOpen(false),
    closeLongRest: () => setLongRestOpen(false),
    hdToSpend,
    setHdToSpend,
    confirmShortRest,
    confirmLongRest,
  };
}
