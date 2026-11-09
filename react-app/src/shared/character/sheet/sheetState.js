import { computeMaxHp } from '../combat/hp.js';
import { DEFAULT_CURRENCY, normalizeCurrency } from '../inventory/currency.js';
import { sheetVitals } from '../combat/vitals.js';
import { clamp } from '../../numbers.js';

export function deriveSheetState(C) {
  // RAW 2024: Wild Shape keeps your own Hit Points (no beast HP pool), so maxHP
  // is always your class-based max — transforming only adds Temporary HP.
  // baseMaxHP stays on the sheet: every vitals change is computed from it.
  const baseMaxHP = Math.max(1, computeMaxHp(C));
  const {
    currentHP, maxHP, maxHPBonus, tempHP, deathSaves, activeConditions, activeEffects,
  } = sheetVitals(C || {}, baseMaxHP);

  const usedHD = Number(C?.usedHD || 0);
  const usedHDPoolsRaw = C?.usedHDPools;
  const usedHDPools = usedHDPoolsRaw && typeof usedHDPoolsRaw === 'object' && !Array.isArray(usedHDPoolsRaw) ? usedHDPoolsRaw : {};

  const spellSlotUsed = C?.spellSlotsUsed && typeof C.spellSlotsUsed === 'object' ? C.spellSlotsUsed : {};
  const createdSpellSlots = C?.createdSpellSlots && typeof C.createdSpellSlots === 'object' ? C.createdSpellSlots : {};
  const arcaneArmorItemKey = C?.arcaneArmorItemKey || null;

  const sheetInventory = Array.isArray(C?.inventory) ? structuredClone(C.inventory) : [];
  const sheetCurrency = normalizeCurrency(
    C?.currency && typeof C.currency === 'object' ? C.currency : { ...DEFAULT_CURRENCY },
  );

  const sheetInspiration = Boolean(C?.inspiration);
  const exhaustionLevel = clamp(Math.floor(Number(C?.exhaustionLevel) || 0), 0, 6);
  const xpStored = Number(C?.xp || 0);
  const notes = C?.notes ?? '';

  return {
    currentHP, maxHP, baseMaxHP, maxHPBonus, tempHP, deathSaves, usedHD, usedHDPools, spellSlotUsed, createdSpellSlots,
    sheetInventory, sheetCurrency, sheetInspiration, activeConditions, activeEffects, exhaustionLevel, xpStored, notes, arcaneArmorItemKey,
  };
}
