import { normalizeConditions } from './conditions.js';
import { normalizeEffects } from './combatEffects.js';
import { clamp, clampInt, numberOr } from '../../numbers.js';

// Vitals are the character `data` fields kept in sync between the sheet and the
// encounter combat: current HP, temp HP, max-HP bonus, death saves, active
// conditions and reminders.
//
// SYNCED_VITALS is the single declarative source of truth. Each descriptor owns
// its own mapping + clamps, so heterogeneous shapes (scalars, nested objects,
// future arrays) each handle their quirks while every consumer stays generic:
// the sheet-side helpers below and the encounter combat mappers in
// pages/encounterbuilder/logic/sheetSync.js both iterate this list.
//
// To sync a NEW field: add ONE descriptor here, add its `data` key to
// character_vital_keys() in supabase/13_character_vitals.sql (the health
// command, the preservation trigger and the digest all read that one list; a
// test keeps it equal to SYNCED_DATA_KEYS), and read it in the digest's
// fromFields (shared/campaign/characterDigest.js).
//
//   data      - key name in the character `data` blob
//   combat    - key name on a combat combatant
//   toCombat  - read a data/combat source + clamp into the combat value
//   toData    - read a combatant + clamp into the cloud `data` value
//   clampData - clamp a raw `data` value (with a fallback) for the sheet
//   normalize - stable form used to build echo-suppression keys
//   defaultCombat - optional; value when neither payload nor combatant has one

function clampNonNegativeInt(value, fallback = 0) {
  return Math.max(0, Math.round(numberOr(value, fallback)));
}

function getDeathSave(raw, sheetKey, combatKey) {
  if (!raw || typeof raw !== 'object') return 0;
  return clampInt(raw[sheetKey] ?? raw[combatKey], 0, 3, 0);
}

// Death saves are `{ success, fail }`, each 0-3, on sheets and in fights alike;
// fights saved before that used `{ s, f }`, which is still read. The one clamp
// every view uses.
export function clampDeathSaveCount(value) {
  return clampInt(value, 0, 3, 0);
}

export function normalizeDeathSaves(value) {
  return { success: getDeathSave(value, 'success', 's'), fail: getDeathSave(value, 'fail', 'f') };
}

export const SYNCED_VITALS = [
  {
    data: 'currentHP',
    combat: 'hpCurrent',
    toCombat: (src, { hpMax }) => {
      const v = numberOr(src.currentHP ?? src.hpCurrent, null);
      return v == null ? null : clamp(Math.round(v), 0, hpMax ?? v);
    },
    toData: (c, { hpMax }) => {
      const cur = Math.round(numberOr(c.hpCurrent, hpMax ?? 0));
      return clamp(cur, 0, hpMax ?? cur);
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
    // The whole list travels, including `exhaustion`. The encounter cannot set
    // exhaustion (its level lives outside this list and is not synced), so
    // carrying the key through untouched is what stops a combat round-trip from
    // wiping a player's exhaustion off their sheet.
    data: 'activeConditions',
    combat: 'activeConditions',
    // Absent means "this payload says nothing about conditions", so the caller
    // falls back to what the combatant already has. An empty ARRAY is a real
    // value meaning "none left" and still propagates. Without that distinction
    // a partial payload silently wipes conditions, exactly as an absent
    // currentHP used to resolve to 0 rather than to full.
    toCombat: (src) => (src.activeConditions == null ? null : normalizeConditions(src.activeConditions)),
    // Used when neither the payload nor the combatant knows anything: a fresh
    // combatant starts with no conditions rather than with a null.
    defaultCombat: () => [],
    toData: (c) => normalizeConditions(c.activeConditions),
    clampData: (value, fallback) => normalizeConditions(value ?? fallback),
    normalize: (v) => normalizeConditions(v),
  },
  {
    // Reminders (combatEffects.js). Same absent-vs-empty
    // rule as conditions: absent says nothing, [] means "none left".
    data: 'activeEffects',
    combat: 'activeEffects',
    toCombat: (src) => (src.activeEffects == null ? null : normalizeEffects(src.activeEffects)),
    defaultCombat: () => [],
    toData: (c) => normalizeEffects(c.activeEffects),
    clampData: (value, fallback) => normalizeEffects(value ?? fallback),
    normalize: (v) => normalizeEffects(v),
  },
  {
    data: 'deathSaves',
    combat: 'deathSaves',
    toCombat: (src) => {
      const ds = src.deathSaves || {};
      return { success: getDeathSave(ds, 'success', 's'), fail: getDeathSave(ds, 'fail', 'f') };
    },
    toData: (c) => {
      const ds = c.deathSaves || {};
      return { success: getDeathSave(ds, 'success', 's'), fail: getDeathSave(ds, 'fail', 'f') };
    },
    clampData: (value, fallback) => ({
      success: clampInt(value?.success ?? fallback?.success, 0, 3, 0),
      fail: clampInt(value?.fail ?? fallback?.fail, 0, 3, 0),
    }),
    normalize: normalizeDeathSaves,
  },
];

export const SYNCED_DATA_KEYS = SYNCED_VITALS.map((field) => field.data);

// Max HP: the rules' base maximum (computeMaxHp) plus the synced bonus, never
// below 1. The one formula the sheet, the digest and the health commands use.
export function maxHpFor(baseMax, bonus) {
  return Math.max(1, Math.max(1, Math.round(Number(baseMax) || 0)) + clampInt(bonus, -999, 999, 0));
}

// A character's synced vitals as every view shows them: clamped to valid
// ranges against its max HP (an absent current HP means undamaged), with that
// max HP alongside.
export function sheetVitals(raw = {}, baseMax) {
  const maxHP = maxHpFor(baseMax, raw?.maxHPBonus);
  return { ...clampCharacterVitals(raw || {}, { maxHP, fallback: { currentHP: maxHP } }), maxHP };
}

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

// How hurt a creature looks: 'healthy' above half its Hit Points, 'wounded'
// above a quarter, 'critical' below that. Each view paints the three its way.
export function hpTone(current, max) {
  const ratio = Number(max) > 0 ? Number(current) / Number(max) : 0;
  if (ratio > 0.5) return 'healthy';
  if (ratio > 0.25) return 'wounded';
  return 'critical';
}

// `tones[hpTone(current, max)]`: the colour a readout takes from a palette of
// the three tones (HP_TONE_COLORS, VTT_HP_TONE_COLORS).
export function hpToneColor(current, max, tones) {
  return tones[hpTone(current, max)];
}
