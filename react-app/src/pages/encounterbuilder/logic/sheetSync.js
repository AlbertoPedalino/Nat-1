import { clampInt, numberOr } from './monsterUtils.js';

function finiteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clampNonNegativeInt(value, fallback = 0) {
  return Math.max(0, Math.round(numberOr(value, fallback)));
}

function clampHpMax(value) {
  const hpMax = finiteNumber(value);
  return hpMax == null ? null : clampInt(hpMax, 1, 999, 10);
}

function getDeathSave(raw, sheetKey, combatKey) {
  if (!raw || typeof raw !== 'object') return 0;
  return clampInt(raw[sheetKey] ?? raw[combatKey], 0, 3, 0);
}

export function sheetVitalsToCombat(summary = {}) {
  const hpMax = clampHpMax(summary.maxHP ?? summary.hpMax);
  const current = finiteNumber(summary.currentHP ?? summary.hpCurrent);
  const hpCurrent = current == null
    ? null
    : Math.max(0, Math.min(hpMax == null ? current : hpMax, Math.round(current)));
  const deathSaves = summary.deathSaves || {};
  return {
    hpMax,
    hpCurrent,
    deathSaves: {
      s: getDeathSave(deathSaves, 'success', 's'),
      f: getDeathSave(deathSaves, 'fail', 'f'),
    },
    tempHP: clampNonNegativeInt(summary.tempHP, 0),
  };
}

export function combatantToSheetPatch(combatant = {}) {
  const hpMax = finiteNumber(combatant.hpMax);
  const current = Math.round(numberOr(combatant.hpCurrent, hpMax ?? 0));
  return {
    currentHP: Math.max(0, Math.min(hpMax == null ? current : hpMax, current)),
    tempHP: clampNonNegativeInt(combatant.tempHP, 0),
    deathSaves: {
      success: getDeathSave(combatant.deathSaves, 'success', 's'),
      fail: getDeathSave(combatant.deathSaves, 'fail', 'f'),
    },
  };
}

export function sheetVitalsToSheetPatch(vitals = {}) {
  const combatVitals = sheetVitalsToCombat(vitals);
  return combatantToSheetPatch({
    hpCurrent: combatVitals.hpCurrent ?? 0,
    hpMax: combatVitals.hpMax,
    tempHP: combatVitals.tempHP,
    deathSaves: combatVitals.deathSaves,
  });
}

export function sheetPatchKey(patch = {}) {
  return JSON.stringify({
    currentHP: Math.max(0, Math.round(numberOr(patch.currentHP, 0))),
    tempHP: clampNonNegativeInt(patch.tempHP, 0),
    deathSaves: {
      success: getDeathSave(patch.deathSaves, 'success', 's'),
      fail: getDeathSave(patch.deathSaves, 'fail', 'f'),
    },
  });
}
