import { clampInt, numberOr } from './monsterUtils.js';
import { SYNCED_VITALS } from '../../../shared/character/vitals.js';

// The synced-field contract (which fields, how they map/clamp) lives in
// shared/character/vitals.js. These functions are the encounter-side combat
// mappers driven by that single registry; adding a field there flows through here.
export { SYNCED_DATA_KEYS } from '../../../shared/character/vitals.js';

function finiteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clampHpMax(value) {
  const hpMax = finiteNumber(value);
  return hpMax == null ? null : clampInt(hpMax, 1, 999, 10);
}

// Normalize any data/combat source into the combat-vitals shape (derived hpMax +
// every synced field), driven by the registry.
export function sheetVitalsToCombat(source = {}) {
  const hpMax = clampHpMax(source.maxHP ?? source.hpMax);
  const out = { hpMax };
  for (const field of SYNCED_VITALS) out[field.combat] = field.toCombat(source, { hpMax });
  return out;
}

// Resolve a combatant's synced vital fields from inbound vitals, with the
// combatant's own values as fallback. Single source used by launch seeding
// (buildCombat) and live sync (applySheetVitals).
export function resolveCombatVitals(combatant = {}, vitals = {}) {
  const mapped = sheetVitalsToCombat(vitals);
  const hpMax = mapped.hpMax ?? clampInt(combatant.hpMax, 1, 999, 10);
  const out = { hpMax };
  for (const field of SYNCED_VITALS) {
    const fromVitals = mapped[field.combat];
    if (fromVitals != null) {
      out[field.combat] = fromVitals;
      continue;
    }
    // The payload says nothing about this field, so keep what the combatant
    // already has; only when neither side knows does the descriptor's default
    // apply.
    const own = field.toCombat(combatant, { hpMax });
    out[field.combat] = own == null && field.defaultCombat ? field.defaultCombat() : own;
  }
  // Current HP is the only field whose clamp depends on the resolved hpMax.
  // `toCombat` returns null when no current HP is known anywhere (a party
  // member typed straight into the encounter only carries hpMax); that means
  // "undamaged", so it resolves to full. The `?? hpMax` has to happen before
  // numberOr, because Number(null) is 0 — a finite value that would silently
  // win over the fallback and drop the combatant to 0 HP.
  out.hpCurrent = Math.max(0, Math.min(hpMax, Math.round(numberOr(out.hpCurrent ?? hpMax, hpMax))));
  out.isDead = out.hpCurrent === 0 && out.deathSaves.f >= 3;
  return out;
}

// True when a combatant already matches resolved vitals (idempotence guard).
// Derived from resolveCombatVitals so the field set lives in exactly one place.
export function combatVitalsMatch(combatant, v) {
  return JSON.stringify(resolveCombatVitals(combatant, combatant)) === JSON.stringify(v);
}

// Build the cloud `data` patch from a combatant (combat -> sheet), via registry.
export function combatantToSheetPatch(combatant = {}) {
  const hpMax = finiteNumber(combatant.hpMax);
  const patch = {};
  for (const field of SYNCED_VITALS) patch[field.data] = field.toData(combatant, { hpMax });
  return patch;
}

export function sheetVitalsToSheetPatch(vitals = {}) {
  return combatantToSheetPatch(sheetVitalsToCombat(vitals));
}

export function sheetPatchKey(patch = {}) {
  const normalized = {};
  for (const field of SYNCED_VITALS) normalized[field.data] = field.normalize(patch[field.data]);
  return JSON.stringify(normalized);
}
