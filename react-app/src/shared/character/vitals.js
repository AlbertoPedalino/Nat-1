// Vitals are the character `data` fields kept in sync between the sheet and the
// encounter combat: current HP, temp HP, max-HP bonus, and death saves.
//
// SYNCED_VITALS is the single declarative source of truth. Each descriptor owns
// its own mapping + clamps, so heterogeneous shapes (scalars, nested objects,
// future arrays) each handle their quirks while every consumer stays generic:
// the sheet-side helpers below and the encounter combat mappers in
// pages/encounterbuilder/logic/sheetSync.js both iterate this list.
//
// To sync a NEW field: add ONE descriptor here, and add its `data` key to the
// patch_character_data allowlist in supabase/combat_sync.sql (a test asserts the
// two never drift apart).
//
//   data      - key name in the character `data` blob
//   combat    - key name on a combat combatant
//   toCombat  - read a data/combat source + clamp into the combat value
//   toData    - read a combatant + clamp into the cloud `data` value
//   clampData - clamp a raw `data` value (with a fallback) for the sheet
//   normalize - stable form used to build echo-suppression keys

function numberOr(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function finiteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clampInt(value, min, max, fallback) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function clampNonNegativeInt(value, fallback = 0) {
  return Math.max(0, Math.round(numberOr(value, fallback)));
}

function getDeathSave(raw, sheetKey, combatKey) {
  if (!raw || typeof raw !== 'object') return 0;
  return clampInt(raw[sheetKey] ?? raw[combatKey], 0, 3, 0);
}

export const SYNCED_VITALS = [
  {
    data: 'currentHP',
    combat: 'hpCurrent',
    toCombat: (src, { hpMax }) => {
      const v = finiteNumber(src.currentHP ?? src.hpCurrent);
      return v == null ? null : Math.max(0, Math.min(hpMax ?? v, Math.round(v)));
    },
    toData: (c, { hpMax }) => {
      const cur = Math.round(numberOr(c.hpCurrent, hpMax ?? 0));
      return Math.max(0, Math.min(hpMax ?? cur, cur));
    },
    clampData: (value, fallback, { maxHP }) => clampInt(value ?? fallback, 0, maxHP == null ? Number.MAX_SAFE_INTEGER : maxHP, 0),
    normalize: (v) => Math.max(0, Math.round(numberOr(v, 0))),
  },
  {
    data: 'tempHP',
    combat: 'tempHP',
    toCombat: (src) => clampNonNegativeInt(src.tempHP, 0),
    toData: (c) => clampNonNegativeInt(c.tempHP, 0),
    clampData: (value, fallback) => clampNonNegativeInt(value ?? fallback, 0),
    normalize: (v) => clampNonNegativeInt(v, 0),
  },
  {
    data: 'maxHPBonus',
    combat: 'maxHPBonus',
    toCombat: (src) => Math.round(numberOr(src.maxHPBonus, 0)),
    toData: (c) => Math.round(numberOr(c.maxHPBonus, 0)),
    clampData: (value, fallback) => clampInt(value ?? fallback, -999, 999, 0),
    normalize: (v) => (v == null ? null : Math.round(numberOr(v, 0))),
  },
  {
    data: 'deathSaves',
    combat: 'deathSaves',
    toCombat: (src) => {
      const ds = src.deathSaves || {};
      return { s: getDeathSave(ds, 'success', 's'), f: getDeathSave(ds, 'fail', 'f') };
    },
    toData: (c) => {
      const ds = c.deathSaves || {};
      return { success: getDeathSave(ds, 'success', 's'), fail: getDeathSave(ds, 'fail', 'f') };
    },
    clampData: (value, fallback) => ({
      success: clampInt(value?.success ?? fallback?.success, 0, 3, 0),
      fail: clampInt(value?.fail ?? fallback?.fail, 0, 3, 0),
    }),
    normalize: (v) => ({ success: getDeathSave(v, 'success', 's'), fail: getDeathSave(v, 'fail', 'f') }),
  },
];

export const SYNCED_DATA_KEYS = SYNCED_VITALS.map((field) => field.data);

// Extract the raw synced-vitals subset from a stored character `data` object.
export function pickCharacterVitals(data = {}) {
  const out = {};
  for (const field of SYNCED_VITALS) out[field.data] = data?.[field.data];
  return out;
}

// Clamp raw vitals to valid `data` ranges. `maxHP` caps current HP (omit for no
// cap); `fallback` supplies values for fields missing from `raw`.
export function clampCharacterVitals(raw = {}, { maxHP = null, fallback = {} } = {}) {
  const out = {};
  for (const field of SYNCED_VITALS) out[field.data] = field.clampData(raw[field.data], fallback[field.data], { maxHP });
  return out;
}
