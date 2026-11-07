import { resolveCombatVitals, combatVitalsMatch } from './sheetSync.js';
import {
  normalizeConditions,
  toggleCondition as toggleConditionKey,
  DEAD_CONDITION_KEY,
  EXHAUSTION_KEY,
} from '../character/combat/conditions.js';
import { addReminder, normalizeEffects, removeEffect } from '../character/combat/combatEffects.js';
import { clampInt, numberOr } from '../numbers.js';
import {
  clickedDeathSaveCount, markDead, resolveMortality, revive, withDeathSave,
} from '../character/combat/mortality.js';

// A combatant's vitals in a running fight: hit points, temporary and maximum
// HP, death saves, conditions and reminders, dying and reviving, and vitals
// arriving from a character sheet.

// The fight with one combatant replaced by `updater(combatant)`.
function updateCombatant(combat, id, updater) {
  return {
    ...combat,
    combatants: (combat.combatants || []).map((combatant) => (
      combatant.id === id ? updater(combatant) : combatant
    )),
  };
}

export function clampTempHp(value) {
  return Math.max(0, Math.round(numberOr(value, 0)));
}

// Conditions are per-combatant; for a player linked to a sheet they ride the
// vitals sync, so a GM's call lands on the player's own sheet.
export function toggleCombatantCondition(combat, id, key) {
  if (key === EXHAUSTION_KEY) return combat; // graded, and its level is not ours to set
  if (key === DEAD_CONDITION_KEY) {
    return updateCombatant(combat, id, (combatant) => (
      normalizeConditions(combatant.activeConditions).includes(DEAD_CONDITION_KEY)
        ? reviveCombatant(combatant)
        : killCombatant(combatant)
    ));
  }
  return updateCombatant(combat, id, (combatant) => ({
    ...combatant,
    activeConditions: normalizeConditions(toggleConditionKey(combatant.activeConditions, key)),
  }));
}

// Clears what this surface can set. Exhaustion survives: the encounter never
// owns `exhaustionLevel`, so dropping the key here would leave a player's sheet
// with a level and no condition to show for it.
export function clearCombatantConditions(combat, id) {
  return updateCombatant(combat, id, (combatant) => {
    const active = normalizeConditions(combatant.activeConditions);
    const alive = active.includes(DEAD_CONDITION_KEY) ? reviveCombatant(combatant) : combatant;
    return {
      ...alive,
      activeConditions: active.filter((condition) => condition === EXHAUSTION_KEY),
    };
  });
}

// Reminders ("Bardic Inspiration", "Guidance") on a combatant: the
// `activeEffects` list (combatEffects.js). A linked player's are sent to the
// sheet by the dispatch, a monster's stay in the fight.
export function addCombatantEffect(combat, id, { text } = {}) {
  return updateCombatant(combat, id, (combatant) => ({
    ...combatant,
    activeEffects: addReminder(combatant.activeEffects, text),
  }));
}

export function removeCombatantEffect(combat, id, effectId) {
  return updateCombatant(combat, id, (combatant) => ({
    ...combatant,
    activeEffects: removeEffect(combatant.activeEffects, effectId),
  }));
}

export function clearCombatantEffects(combat, id) {
  return updateCombatant(combat, id, (combatant) => (
    normalizeEffects(combatant.activeEffects).length ? { ...combatant, activeEffects: [] } : combatant
  ));
}

export function setDeathSave(combat, id, type, value) {
  if (!['success', 'fail'].includes(type)) return combat;
  return updateCombatant(combat, id, (combatant) => {
    if (!combatant.deathSaves) return combatant;
    const count = clickedDeathSaveCount(combatant.deathSaves[type], value);
    return fromMortal(combatant, withDeathSave(mortalState(combatant), type, count));
  });
}

export function modifyHp(combat, id, delta) {
  const amount = numberOr(delta, 0);
  return updateCombatant(combat, id, (combatant) => {
    if (amount >= 0) {
      // Healing goes straight to current HP; temporary HP is unaffected.
      return applyHp(combatant, numberOr(combatant.hpCurrent, 0) + amount);
    }
    // Damage depletes temporary HP first (D&D RAW), then current HP.
    const temp = clampTempHp(combatant.tempHP);
    const absorbed = Math.min(temp, -amount);
    const next = applyHp(combatant, numberOr(combatant.hpCurrent, 0) - (-amount - absorbed));
    return absorbed ? { ...next, tempHP: temp - absorbed } : next;
  });
}

export function setHp(combat, id, value) {
  return updateCombatant(combat, id, (combatant) => applyHp(combatant, numberOr(value, combatant.hpCurrent)));
}

export function setMaxHp(combat, id, value) {
  return updateCombatant(combat, id, (combatant) => {
    const hpMax = clampInt(value, 1, 999, combatant.hpMax);
    if (hpMax === combatant.hpMax) return combatant;
    // Lowering max can't leave current above it; raising max never auto-heals.
    const hpCurrent = Math.min(numberOr(combatant.hpCurrent, hpMax), hpMax);
    const next = applyHp({
      ...combatant,
      hpMax,
    }, hpCurrent);
    // Track the change as a maxHPBonus delta so base max (hpMax - maxHPBonus)
    // stays recoverable for the "Max+" control. Base max is constant, so
    // ΔmaxHP === ΔmaxHPBonus. For linked PCs this also drives outbound sync,
    // which writes maxHPBonus so the sheet re-derives the same max; for monsters
    // it's inert bookkeeping (they never sync).
    next.maxHPBonus = numberOr(combatant.maxHPBonus, 0) + (hpMax - numberOr(combatant.hpMax, hpMax));
    return next;
  });
}

export function setTempHp(combat, id, value) {
  return updateCombatant(combat, id, (combatant) => {
    const tempHP = clampTempHp(value);
    return tempHP === clampTempHp(combatant.tempHP) ? combatant : { ...combatant, tempHP };
  });
}

export function applySheetVitals(combat, sourceId, vitals) {
  const charId = String(sourceId || '');
  if (!combat || !charId) return combat;
  let changed = false;
  const combatants = (combat.combatants || []).map((combatant) => {
    if (combatant?.type !== 'player' || String(combatant.sourceId || '') !== charId) return combatant;
    const v = resolveCombatVitals(combatant, vitals || {});
    if (combatVitalsMatch(combatant, v)) return combatant;
    changed = true;
    return { ...combatant, ...v };
  });
  return changed ? { ...combat, combatants } : combat;
}

// The combatant at `hpCurrent`, with Dead, isDead and death saves resolved
// from it (mortality.js).
function withMortality(combatant, hpCurrent) {
  const { dead, conditions, deathSaves } = resolveMortality({
    player: combatant.type === 'player',
    hp: hpCurrent,
    deathSaves: combatant.deathSaves,
    conditions: combatant.activeConditions,
  });
  return { ...combatant, hpCurrent, isDead: dead, activeConditions: conditions, deathSaves };
}

// Regaining hit points clears the death saves.
function applyHp(combatant, value) {
  const hpCurrent = Math.max(0, Math.min(numberOr(combatant.hpMax, 1), Math.round(value)));
  const healed = hpCurrent > 0 && combatant.deathSaves ? { ...combatant, deathSaves: { success: 0, fail: 0 } } : combatant;
  return withMortality(healed, hpCurrent);
}

// A combatant in the neutral shape mortality.js works on, and back.
function mortalState(combatant) {
  return {
    player: combatant.type === 'player',
    hp: combatant.hpCurrent,
    deathSaves: combatant.deathSaves,
    conditions: combatant.activeConditions,
  };
}

function fromMortal(combatant, { hp, deathSaves, conditions, dead }) {
  return { ...combatant, hpCurrent: hp, deathSaves, activeConditions: conditions, isDead: dead };
}

function killCombatant(combatant) {
  return fromMortal(combatant, markDead(mortalState(combatant)));
}

function reviveCombatant(combatant) {
  return fromMortal(combatant, revive(mortalState(combatant)));
}

// A combatant read back from a saved fight, its HP clamped and its mortality
// resolved again.
export function restoreCombatantMortality(combatant) {
  return withMortality(combatant, Math.max(0, Math.min(
    numberOr(combatant.hpMax, 1),
    Math.round(numberOr(combatant.hpCurrent, combatant.hpMax)),
  )));
}
