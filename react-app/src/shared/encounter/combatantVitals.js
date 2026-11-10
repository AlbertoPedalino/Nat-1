import { resolveCombatVitals, combatVitalsMatch } from './sheetSync.js';
import {
  normalizeConditions,
  DEAD_CONDITION_KEY,
  EXHAUSTION_KEY,
} from '../character/combat/conditions.js';
import { addReminder, normalizeEffects, removeEffect } from '../character/combat/combatEffects.js';
import { changeHp, clampCombatHpMax, clampTempHp, tempHpAfter } from '../character/combat/vitals.js';
import { clamp, numberOr } from '../numbers.js';
import {
  clickedDeathSaveCount, markDead, resolveMortality, revive, toggleMortalCondition, withDeathSave,
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


// Conditions are per-combatant; for a player linked to a sheet they ride the
// vitals sync, so a GM's call lands on the player's own sheet.
export function toggleCombatantCondition(combat, id, key) {
  if (key === EXHAUSTION_KEY) return combat; // graded, and its level is not ours to set
  return updateCombatant(combat, id, (combatant) => (
    fromMortal(combatant, toggleMortalCondition(mortalState(combatant), key))
  ));
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
  const tempHP = tempHpAfter(temp, command?.type, n);
  if (tempHP !== undefined) return { tempHP };
  switch (command?.type) {
    case 'modifyHp': {
      const next = changeHp({ current, temp }, n);
      return { hpCurrent: clampHp(next.current), ...(next.temp !== temp ? { tempHP: next.temp } : {}) };
    }
    case 'setHp': return { hpCurrent: clampHp(n) };
    case 'modifyMaxHp': return hpCommandFields(before, { type: 'setMaxHp', value: (hpMax ?? current) + n });
    case 'setMaxHpBonus': {
      const baseMax = (hpMax ?? current) - (Number(before?.maxHPBonus) || 0);
      return hpCommandFields(before, { type: 'setMaxHp', value: baseMax + n });
    }
    case 'setMaxHp': {
      const max = clampCombatHpMax(n, hpMax ?? 1);
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

// A hit point command on one combatant, with mortality resolved (0 HP is Dead
// for a monster, dying for a player; regaining hit points clears a player's
// death saves). Only the fields it changes are written, so the result diffs
// into a minimal fight patch (monsterVitalsPatch). The builder, the battle
// map's creatures and its loose pieces all step hit points through this.
export function applyCombatantHpCommand(combatant, command) {
  const fields = hpCommandFields(combatant, command);
  const next = { ...combatant, ...fields };
  if (!Object.hasOwn(fields, 'hpCurrent') || fields.hpCurrent === combatant?.hpCurrent) return next;
  return withHp(next, combatant, fields.hpCurrent);
}

export function applyHpCommand(combat, id, command) {
  return updateCombatant(combat, id, (combatant) => applyCombatantHpCommand(combatant, command));
}

// An edit typed in a creature's map menu: the fields it carries are what the
// GM changed (`hpCurrent`, `conditions`, `effects`), applied to the combatant
// as it stands now. Marking Dead drops it to 0 HP, removing Dead brings it
// back at 1, a typed 0 is Dead.
export function applyCombatantEdit(combatant, edit = {}) {
  let next = combatant;
  if (Object.hasOwn(edit, 'conditions')) {
    const conditions = normalizeConditions(edit.conditions);
    const wasDead = normalizeConditions(combatant?.activeConditions).includes(DEAD_CONDITION_KEY);
    const nowDead = conditions.includes(DEAD_CONDITION_KEY);
    next = { ...next, activeConditions: conditions };
    if (nowDead && !wasDead) next = killCombatant(next);
    else if (wasDead && !nowDead) next = reviveCombatant(next);
  }
  if (edit.hpCurrent != null && Number.isFinite(Number(edit.hpCurrent))) {
    next = applyCombatantHpCommand(next, { type: 'setHp', value: edit.hpCurrent });
  }
  if (Object.hasOwn(edit, 'effects')) next = { ...next, activeEffects: normalizeEffects(edit.effects) };
  return next;
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

// `next` at `hpCurrent` (already clamped by hpCommandFields), Dead, isDead and
// a player's death saves following it; only what moved is written.
function withHp(next, before, hpCurrent) {
  const player = before?.type === 'player';
  const saves = player && hpCurrent > 0 && before.deathSaves ? { success: 0, fail: 0 } : before?.deathSaves;
  const conditions = Array.isArray(before?.activeConditions) ? before.activeConditions : [];
  const resolved = resolveMortality({ player, hp: hpCurrent, deathSaves: saves, conditions });
  const out = { ...next, hpCurrent };
  if (normalizeConditions(conditions).join('|') !== resolved.conditions.join('|')) out.activeConditions = resolved.conditions;
  if (Boolean(before?.isDead) !== resolved.dead) out.isDead = resolved.dead;
  if (player && resolved.deathSaves !== before?.deathSaves) out.deathSaves = resolved.deathSaves;
  return out;
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
