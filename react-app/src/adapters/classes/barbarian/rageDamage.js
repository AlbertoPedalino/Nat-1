// A Barbarian's Rage Damage bonus by Barbarian level (Rage table, XPHB): +2,
// +3 from level 9, +4 from level 16.
export const RAGE_DAMAGE_LEVELS = Object.freeze([1, 9, 16]);

export function rageDamageBonus(barbarianLevel) {
  const level = Number(barbarianLevel || 1);
  return 2 + RAGE_DAMAGE_LEVELS.filter((step) => step > 1 && level >= step).length;
}
