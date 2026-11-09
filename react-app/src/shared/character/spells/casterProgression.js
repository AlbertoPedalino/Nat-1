import { FULL_SLOTS, HALF_SLOTS, PACT_SLOTS, THIRD_SLOTS } from './spellTables.js';
import { clamp } from '../../numbers.js';

// Spell slots from caster progressions (XPHB 2024), for the builder and the
// sheet alike: a class's own table, the multiclass table when more than one
// class has Spellcasting, and Pact Magic kept apart.

const clampLevel = (level) => clamp(Math.floor(Number(level) || 1), 1, 20);

// 'full' | 'half' | 'third' | 'artificer' | 'pact', or null. Accepts the
// 5etools spellings ('1/2', '1/3').
export function normalizeCasterProgression(value) {
  const v = String(value || '').toLowerCase();
  if (v === '1/2') return 'half';
  if (v === '1/3') return 'third';
  return ['full', 'half', 'third', 'artificer', 'pact'].includes(v) ? v : null;
}

// What a class adds to the multiclass caster level.
export function casterContribution(progression, level) {
  const prog = normalizeCasterProgression(progression);
  const lv = clampLevel(level);
  if (prog === 'full') return lv;
  if (prog === 'half') return Math.floor(lv / 2);
  if (prog === 'artificer') return Math.ceil(lv / 2);
  if (prog === 'third') return Math.floor(lv / 3);
  return 0;
}

// A single class's spell slots by level (index 0 = 1st level).
export function progressionSlots(progression, level) {
  const prog = normalizeCasterProgression(progression);
  const lv = clampLevel(level);
  if (prog === 'full') return FULL_SLOTS[lv] || [];
  if (prog === 'half' || prog === 'artificer') return HALF_SLOTS[lv] || [];
  if (prog === 'third') return THIRD_SLOTS[lv] || [];
  return [];
}

// Pact Magic at a Warlock level: { count, level }.
export function pactSlots(level) {
  const row = PACT_SLOTS[clampLevel(level)] || {};
  return { count: row.slots || 0, level: row.level || 1 };
}

// The highest spell level a slot list (and Pact Magic) reaches.
export function maxSlotLevel({ regular = [], pact = null } = {}) {
  const regularMax = regular.reduce((max, count, index) => (count ? index + 1 : max), 0);
  return Math.max(regularMax, Number(pact?.level || 0));
}

// The highest spell level one class can learn at its level.
export function maxSpellLevelFor(progression, level) {
  const prog = normalizeCasterProgression(progression);
  if (prog === 'pact') return pactSlots(level).level;
  return maxSlotLevel({ regular: progressionSlots(prog, level) });
}

// A character's slots from its casting classes ([{ progression, level }]):
// { regular, pact }.
export function combinedSpellSlots(casters) {
  const list = (casters || []).filter((entry) => normalizeCasterProgression(entry?.progression));
  const pactEntry = list.find((entry) => normalizeCasterProgression(entry.progression) === 'pact');
  const pact = pactEntry ? pactSlots(pactEntry.level) : null;
  const regular = list.filter((entry) => normalizeCasterProgression(entry.progression) !== 'pact');
  if (!regular.length) return { regular: [], pact };
  if (regular.length === 1) return { regular: progressionSlots(regular[0].progression, regular[0].level), pact };
  const casterLevel = regular.reduce((sum, entry) => sum + casterContribution(entry.progression, entry.level), 0);
  return { regular: casterLevel > 0 ? FULL_SLOTS[Math.min(20, casterLevel)] || [] : [], pact };
}
