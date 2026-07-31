import { DIFFICULTY_COLORS, DIFFICULTY_LABELS, XT } from './constants.js';
import { clampInt, numberOr } from './monsterUtils.js';

export function calculateDifficulty(encounter, party) {
  const totalXp = (Array.isArray(encounter) ? encounter : [])
    .reduce((sum, item) => sum + numberOr(item.xp, 0) * clampInt(item.qty, 0, 99, 0), 0);
  const count = clampInt(party?.count, 1, 10, 4);
  const level = clampInt(party?.level, 1, 20, 1);
  const thresholds = XT[level - 1].map((value) => value * count);
  let difficultyIndex = -1;
  for (let i = thresholds.length - 1; i >= 0; i -= 1) {
    if (totalXp >= thresholds[i]) {
      difficultyIndex = i;
      break;
    }
  }
  return {
    totalXp,
    thresholds,
    difficultyIndex,
    label: difficultyIndex < 0 ? 'Trivial' : DIFFICULTY_LABELS[difficultyIndex],
    color: difficultyIndex < 0 ? DIFFICULTY_COLORS[0] : DIFFICULTY_COLORS[difficultyIndex],
    percent: thresholds[3] > 0 ? Math.min(100, Math.round((totalXp / thresholds[3]) * 100)) : 0,
  };
}
