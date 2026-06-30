// Vitals are the character fields kept in sync between the encounter combat and
// the sheet: current HP, temp HP, and death saves. Single source of truth for the
// synced field set + clamping, so adding a synced field is a one-place change
// (mirror it in the encounter combat mapper and the patch_character_data allowlist).

function clampInt(value, min, max, fallback) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

// Extract the raw vitals subset from a stored character `data` object.
export function pickCharacterVitals(data = {}) {
  const deathSaves = data?.deathSaves || {};
  return {
    currentHP: data?.currentHP,
    tempHP: data?.tempHP,
    deathSaves: { success: deathSaves.success, fail: deathSaves.fail },
  };
}

// Clamp raw vitals to valid ranges. `maxHP` caps current HP (omit for no cap);
// `fallback` supplies values for fields missing from `raw` (e.g. the live sheet).
export function clampCharacterVitals(raw = {}, { maxHP = null, fallback = {} } = {}) {
  const rawDs = raw.deathSaves || {};
  const fbDs = fallback.deathSaves || {};
  const hpCap = maxHP == null ? Number.MAX_SAFE_INTEGER : maxHP;
  return {
    currentHP: clampInt(raw.currentHP ?? fallback.currentHP, 0, hpCap, 0),
    tempHP: clampInt(raw.tempHP ?? fallback.tempHP, 0, Number.MAX_SAFE_INTEGER, 0),
    deathSaves: {
      success: clampInt(rawDs.success ?? fbDs.success, 0, 3, 0),
      fail: clampInt(rawDs.fail ?? fbDs.fail, 0, 3, 0),
    },
  };
}
