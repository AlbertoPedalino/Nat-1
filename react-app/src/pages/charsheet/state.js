import { calcMaxHP } from './logic/calculations.js';
import { normalizeCurrency } from '../../shared/character/currency.js';

export function deriveSheetState(C) {
  const baseMax = Math.max(1, calcMaxHP(C));
  const maxHPBonus = Number(C?.maxHPBonus || 0);
  const maxHP = Math.max(1, baseMax + maxHPBonus);
  const storedCurrent = C?.currentHP;
  const currentHP = Math.max(0, Math.min(maxHP, typeof storedCurrent === 'number' ? storedCurrent : maxHP));
  const tempHP = Math.max(0, Number(C?.tempHP || 0));

  const deathSavesRaw = C?.deathSaves || {};
  const deathSaves = {
    success: Math.max(0, Math.min(3, Number(deathSavesRaw.success) || 0)),
    fail: Math.max(0, Math.min(3, Number(deathSavesRaw.fail) || 0)),
  };

  const usedHD = Number(C?.usedHD || 0);
  const usedHDPoolsRaw = C?.usedHDPools;
  const usedHDPools = usedHDPoolsRaw && typeof usedHDPoolsRaw === 'object' && !Array.isArray(usedHDPoolsRaw) ? usedHDPoolsRaw : {};

  const spellSlotUsed = C?.spellSlotsUsed && typeof C.spellSlotsUsed === 'object' ? C.spellSlotsUsed : {};
  const createdSpellSlots = C?.createdSpellSlots && typeof C.createdSpellSlots === 'object' ? C.createdSpellSlots : {};
  const arcaneArmorItemKey = C?.arcaneArmorItemKey || null;

  const sheetInventory = Array.isArray(C?.inventory) ? JSON.parse(JSON.stringify(C.inventory)) : [];
  const sheetCurrency = normalizeCurrency(
    C?.currency && typeof C.currency === 'object' ? C.currency : { cp: 0, sp: 0, gp: 10, pp: 0 },
  );

  const sheetInspiration = Boolean(C?.inspiration);
  const activeConditions = Array.isArray(C?.activeConditions) ? C.activeConditions : [];
  const exhaustionLevel = Math.max(0, Math.min(6, Math.floor(Number(C?.exhaustionLevel) || 0)));
  const xpStored = Number(C?.xp || 0);
  const notes = C?.notes ?? '';

  return {
    currentHP, maxHP, maxHPBonus, tempHP, deathSaves, usedHD, usedHDPools, spellSlotUsed, createdSpellSlots,
    sheetInventory, sheetCurrency, sheetInspiration, activeConditions, exhaustionLevel, xpStored, notes, arcaneArmorItemKey,
  };
}
