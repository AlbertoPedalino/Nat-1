// Artillerist Artificer — Eldritch Cannon active state (EFA 2024).
//
// Eldritch Cannon (lv.3): as a Magic action you create a Small or Tiny cannon
// (AC 18, HP = 5 × Artificer level, immune poison/psychic). It lasts 1 hour or
// until reduced to 0 HP; you can dismiss it early. You get one free creation per
// Long Rest, or you may expend a spell slot to create another. On each of your
// turns you can take a Bonus Action (within 60 ft) to have it use any of three
// options — Flamethrower, Force Ballista, or Protector — so the type is NOT
// fixed at creation.
//
// Scaling (Explosive Cannon, lv.9): the cannon's damage rolls and the Protector
// Temporary HP both increase by 1d8 (2d8 → 3d8, Protector 1d8 → 2d8).
//
// Fortified Position (lv.15): you can have TWO cannons at once — the state is an
// array so the sheet simply renders one board per cannon.
//
// Shape of `C.eldritchCannons` (empty array when none active):
//   [ { size: 'S' | 'T', hpCurrent: number }, ... ]
//
// Cannon HP is tracked locally on the character (like the Wild Shape form); it
// is NOT a synced combat vital — it never touches the player's own HP.

import { classLevel } from './classLevel.js';

export const CANNON_SIZE_LABEL = { S: 'Small', T: 'Tiny' };

// Artificer level (single-class or multiclass) — drives HP, damage scaling and
// how many cannons may be active.
export function artificerLevel(C) {
  return classLevel(C, 'Artificer');
}

// AC 18 is fixed by the stat block; expose it as a constant for the panel.
export const CANNON_AC = 18;

// HP = 5 × Artificer level (minimum 5 so a freshly-created cannon is never 0).
export function cannonMaxHp(level) {
  return Math.max(5, 5 * Number(level || 0));
}

// Max simultaneous cannons: 2 from level 15 (Fortified Position), else 1.
export function maxCannons(level) {
  return Number(level || 0) >= 15 ? 2 : 1;
}

// Explosive Cannon (lv.9) bumps every cannon damage roll by 1d8.
export function cannonDamageDice(level) {
  return Number(level || 0) >= 9 ? '3d8' : '2d8';
}

// Protector Temporary HP die, also bumped by 1d8 at level 9.
export function protectorThpDice(level) {
  return Number(level || 0) >= 9 ? '2d8' : '1d8';
}

export function getActiveCannons(C) {
  return Array.isArray(C?.eldritchCannons) ? C.eldritchCannons : [];
}

// Append a cannon. The caller spends the Long Rest use or a spell slot
// separately; this only records the cannon and its starting HP.
export function addCannonPatch(prev, cannon) {
  return { eldritchCannons: [...getActiveCannons(prev), cannon] };
}

// Remove the cannon at `index` (manual dismissal or destroyed at 0 HP).
export function removeCannonPatch(prev, index) {
  return { eldritchCannons: getActiveCannons(prev).filter((_, i) => i !== index) };
}

// Overwrite one cannon's current HP (already clamped by the caller).
export function updateCannonHpPatch(prev, index, hpCurrent) {
  return {
    eldritchCannons: getActiveCannons(prev).map(
      (c, i) => (i === index ? { ...c, hpCurrent } : c),
    ),
  };
}

// Long Rest cleanup — a cannon lasts at most 1 hour, so none survive a rest.
export function dismissAllCannonsPatch() {
  return { eldritchCannons: [] };
}
