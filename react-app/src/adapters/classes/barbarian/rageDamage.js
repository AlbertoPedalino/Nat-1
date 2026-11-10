// A Barbarian's Rage Damage bonus by Barbarian level (Rage table, XPHB).
export function rageDamageBonus(barbarianLevel) {
  const level = Number(barbarianLevel || 1);
  if (level >= 16) return 4;
  if (level >= 9) return 3;
  return 2;
}
