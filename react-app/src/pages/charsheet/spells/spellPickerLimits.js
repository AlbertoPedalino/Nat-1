import { getSpellcastingProfile } from './spellcasting.js';
import { getClassSpellLimits } from '../../../shared/character/spells/spellProgression.js';

// How many cantrips and spells a class entry may pick at its level.

export function getPickerLimits(C, picker) {
  const level = Math.max(1, Math.min(20, Number(picker?.level || 1)));
  const profile = picker?.profile || getSpellcastingProfile(picker);
  const { cantrips, spells } = getClassSpellLimits(profile, level);
  return {
    cantrips: normalizeLimit(cantrips),
    spells: normalizeLimit(spells),
  };
}

export function normalizeLimit(value) {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : null;
}
