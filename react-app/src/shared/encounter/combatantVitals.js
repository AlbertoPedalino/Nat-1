import { resolveCombatVitals, combatVitalsMatch } from './sheetSync.js';
import {
  normalizeConditions,
  toggleCondition as toggleConditionKey,
  DEAD_CONDITION_KEY,
  EXHAUSTION_KEY,
} from '../character/combat/conditions.js';
import { addReminder, normalizeEffects, removeEffect } from '../character/combat/combatEffects.js';
import { clamp, clampInt, numberOr } from '../numbers.js';
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

// The hit point commands every surface sends for a combatant — the builder's
// buttons and the map's menu use the character health command names — and the
// conditions and reminders that travel the same way.
export const HP_COMMANDS = Object.freeze([
  'modifyHp', 'setHp', 'setTempHp', 'modifyTempHp', 'setMaxHp', 'modifyMaxHp', 'setMaxHpBonus',
]);
export const MARK_COMMANDS = Object.freeze([
  'toggleCombatantCondition', 'clearCombatantConditions', 'addCombatantEffect', 'removeCombatantEffect', 'clearCombatantEffects',
]);

// The hit point fields a command changes, and only those: damage takes
// temporary HP first (RAW), healing never passes the maximum, lowering the
// maximum lowers current HP but raising it heals nothing, and a maximum change
// is tracked as a maxHPBonus delta so the base maximum (hpMax - maxHPBonus)
// stays recoverable. A creature with no maximum yet is not clamped, and starts
// whole when it gets one. A command without a number changes nothing.
export function hpCommandFields(before, command) {
  const raw = Number(command?.delta ?? command?.value);
  if (!Number.isFinite(raw)) return {};
  const n = Math.trunc(raw);
  const hpMax = before?.hpMax == null ? null : Math.round(Number(before.hpMax));
  const current = Math.round(Number(before?.hpCurrent ?? hpMax ?? 0));
  const temp = clampTempHp(before?.tempHP);
  const clampHp = (value, max = hpMax) => Math.max(0, max == null ? value : Math.min(max, value));
  switch (command?.type) {
    case 'modifyHp': {
      const absorbed = n < 0 ? Math.min(temp, -n) : 0;
      return { hpCurrent: clampHp(current + n + absorbed), ...(absorbed ? { tempHP: temp - absorbed } : {}) };
    }
    case 'setHp': return { hpCurrent: clampHp(n) };
    case 'setTempHp': return { tempHP: Math.max(0, n) };
    case 'modifyTempHp': return { tempHP: Math.max(0, temp + n) };
    case 'modifyMaxHp': return hpCommandFields(before, { type: 'setMaxHp', value: (hpMax ?? current) + n });
    case 'setMaxHpBonus': {
      const baseMax = (hpMax ?? current) - (Number(before?.maxHPBonus) || 0);
      return hpCommandFields(before, { type: 'setMaxHp', value: baseMax + n });
    }
    case 'setMaxHp': {
      const max = clampInt(n, 1, 999, hpMax ?? 1);
      if (max === hpMax) return {};
      return {
        hpMax: max,
        hpCurrent: before?.hpCurrent == null ? max : clampHp(current, max),
        maxHPBonus: (Number(before?.maxHPBonus) || 0) + (max - (hpMax ?? max)),
      };
    }
    default: throw new Error('Unknown creature health command.');
  }
}

// A hit point command on one combatant of the fight, with mortality resolved
// (0 HP is Dead for a monster, dying for a player; healing clears death saves).
export function applyHpCommand(combat, id, command) {
  return updateCombatant(combat, id, (combatant) => {
    const { hpCurrent, ...rest } = hpCommandFields(combatant, command);
    const next = { ...combatant, ...rest };
    return hpCurrent === undefined ? next : applyHp(next, hpCurrent);
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
  const hpCurrent = clamp(Math.round(value), 0, numberOr(combatant.hpMax, 1));
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
  return withMortality(combatant, clamp(
    Math.round(numberOr(combatant.hpCurrent, combatant.hpMax)),
    0,
    numberOr(combatant.hpMax, 1),
  ));
}
