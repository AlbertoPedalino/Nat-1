// Single source of truth for D&D 2024 (5.5e) character XP progression.
// Index i holds the total XP required to reach level i+1
// (level 1 = 0 XP … level 20 = 355,000 XP). Verified against the 2024 PHB.
export const XP_THRESHOLDS = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000,
];

export const MAX_LEVEL = 20;

/** Real character level (1..20) for a given total XP. */
export function levelFromXp(xp) {
  const x = Number(xp) || 0;
  let level = 1;
  for (let i = 1; i < XP_THRESHOLDS.length; i += 1) {
    if (x >= XP_THRESHOLDS[i]) level = i + 1;
  }
  return level;
}

/** Total XP required to reach `level` (1-indexed, clamped to 1..MAX_LEVEL). */
export function xpForLevel(level) {
  const clamped = Math.min(Math.max(Number(level) || 1, 1), MAX_LEVEL);
  return XP_THRESHOLDS[clamped - 1];
}

/** Progress percent (0..100) of `xp` within `level` toward the next level. */
export function xpProgressPct(xp, level) {
  if (level >= MAX_LEVEL) return 100;
  const current = xpForLevel(level);
  const next = xpForLevel(level + 1);
  if (next <= current) return 0;
  return Math.min(100, Math.round(((Number(xp) || 0) - current) / (next - current) * 100));
}
