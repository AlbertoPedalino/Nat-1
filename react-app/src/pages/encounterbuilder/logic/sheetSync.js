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
    out[field.combat] = fromVitals == null ? field.toCombat(combatant, { hpMax }) : fromVitals;
  }
  // Current HP is the only field whose clamp depends on the resolved hpMax.
  out.hpCurrent = Math.max(0, Math.min(hpMax, Math.round(numberOr(out.hpCurrent, hpMax))));
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
