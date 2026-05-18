import { getMod, getFinal, calcMaxHP, getSkillProficiency, getSkillBonus, getPB, hasSaveProficiency, getSaveBonus, getLevelFromXp, getXpForNextLevel } from './logic/calculations.js';
import { mapCharacterToBuilderState } from '../../shared/builderSync.js';
import { getStorageItem, getStorageJson, setStorageItem, setStorageJson } from '../../shared/storage.js';

export function loadCharacter() {
  const ch = getStorageJson('5e_current_char', null);
  if (ch && ch.bladesongActive == null) ch.bladesongActive = false;
  return ch;
}

export function loadSheetState(C) {
  const rawHP = parseInt(getStorageItem('5e_hp_current'));
  const rawMaxBonus = parseInt(getStorageItem('5e_hp_max_bonus'));
  const baseMax = Math.max(1, calcMaxHP(C));
  const maxHPBonus = isNaN(rawMaxBonus) ? 0 : rawMaxBonus;
  const maxHP = Math.max(1, baseMax + maxHPBonus);
  let currentHP = isNaN(rawHP) ? maxHP : rawHP;
  currentHP = Math.max(0, Math.min(maxHP, currentHP));
  const tempHP = Math.max(0, parseInt(getStorageItem('5e_hp_temp')) || 0);

  const ds = getStorageJson('5e_death_saves', {});
  const deathSaves = {
    success: Math.max(0, Math.min(3, parseInt(ds.success) || 0)),
    fail: Math.max(0, Math.min(3, parseInt(ds.fail) || 0)),
  };

  const usedHD = parseInt(getStorageItem('5e_hd_used')) || 0;
  const usedHDPoolsRaw = getStorageJson('5e_hd_used_pools', {});
  const usedHDPools = usedHDPoolsRaw && typeof usedHDPoolsRaw === 'object' && !Array.isArray(usedHDPoolsRaw) ? usedHDPoolsRaw : {};

  const spellSlotUsed = getStorageJson('5e_slots_used', {});
  const createdSpellSlots = getStorageJson('5e_created_slots', {});
  const arcaneArmorItemKey = getStorageItem('5e_arcane_armor_item') || null;

  let sheetInventory = getStorageJson('5e_inventory', C.inventory || []);
  if (Array.isArray(sheetInventory) && !sheetInventory.length && Array.isArray(C?.inventory) && C.inventory.length) {
    sheetInventory = JSON.parse(JSON.stringify(C.inventory));
  }

  const sheetCurrency = getStorageJson('5e_currency', C.currency || { cp: 0, sp: 0, ep: 0, gp: 10, pp: 0 });

  const sheetInspiration = getStorageItem('5e_inspiration') === 'true' || C?.inspiration || false;

  const rawConditions = getStorageJson('5e_conditions_active', []);
  const activeConditions = Array.isArray(rawConditions) ? rawConditions : [];

  const xpStored = parseInt(getStorageItem('5e_xp', C.xp || 0));

  const notesRaw = getStorageItem('5e_notes', '');
  let notes;
  try { notes = JSON.parse(notesRaw); } catch { notes = notesRaw; }

  return {
    currentHP, maxHP, maxHPBonus, tempHP, deathSaves, usedHD, usedHDPools, spellSlotUsed, createdSpellSlots,
    sheetInventory, sheetCurrency, sheetInspiration, activeConditions, xpStored, notes, arcaneArmorItemKey,
  };
}

export function saveHPState(currentHP, tempHP, maxHPBonus) {
  setStorageItem('5e_hp_current', currentHP);
  setStorageItem('5e_hp_temp', tempHP);
  setStorageItem('5e_hp_max_bonus', maxHPBonus);
}

export function saveDeathSaves(deathSaves) {
  setStorageJson('5e_death_saves', deathSaves);
}

export function saveInspiration(val) {
  setStorageItem('5e_inspiration', val ? 'true' : 'false');
}

export function saveConditions(conditions) {
  setStorageJson('5e_conditions_active', conditions);
}

export function saveInventory(inventory) {
  setStorageJson('5e_inventory', inventory || []);
}

export function saveCurrency(currency) {
  setStorageJson('5e_currency', currency || {});
}

export function saveCurrentCharacter(character) {
  setStorageJson('5e_current_char', character);
  syncBuilderState(character);
}

function syncBuilderState(character) {
  if (!character || typeof character !== 'object') return;
  try {
    const previous = getStorageJson('5e_builder_state', {});
    const mapped = mapCharacterToBuilderState(character);
    setStorageJson('5e_builder_state', { ...previous, ...mapped });
  } catch {}
}

export function loadResources(C) {
  return getStorageJson('5e_resources', {});
}

export function saveResources(resources) {
  setStorageJson('5e_resources', resources);
}

export function loadFreeCastUses() {
  return getStorageJson('5e_freecast_used', {});
}

export function saveFreeCastUses(uses) {
  setStorageJson('5e_freecast_used', uses);
}

export function getEncumberedLevel(C, inventory) {
  if (!C) return 0;
  const strength = getFinal(C, 'str');
  const carryCap = strength * 15;
  const totalWeight = (inventory || []).reduce((s, i) => s + ((i.weight || i.weightLb || 0) * (i.qty || i.quantity || 1)), 0);
  if (totalWeight > carryCap) return 2;
  if (totalWeight > carryCap * 0.666) return 1;
  return 0;
}
