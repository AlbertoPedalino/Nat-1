import { UI_COLORS } from '../../../shared/ui/colors.js';

// Encounter difficulty (XPHB 2024 XP budgets) and the roll log size.
export const XT = Object.freeze([
  [50, 75, 100, 150],
  [100, 150, 200, 300],
  [150, 225, 400, 600],
  [250, 375, 500, 750],
  [500, 750, 1100, 1600],
  [600, 1000, 1400, 2100],
  [750, 1300, 1700, 2500],
  [1000, 1700, 2100, 3100],
  [1300, 2000, 2600, 3900],
  [1600, 2300, 3100, 4600],
  [1900, 2900, 4100, 6100],
  [2200, 3700, 4700, 7000],
  [2600, 4200, 5400, 8100],
  [2900, 4900, 6200, 9300],
  [3300, 5400, 7800, 11700],
  [3800, 6100, 9800, 14700],
  [4500, 7200, 11700, 17500],
  [5000, 8700, 14200, 21300],
  [5500, 10700, 17200, 25800],
  [6400, 13200, 22000, 33000],
]);

export const DIFFICULTY_LABELS = Object.freeze(['Low', 'Moderate', 'High', 'Deadly']);
export const DIFFICULTY_COLORS = Object.freeze([UI_COLORS.success, UI_COLORS.warning, UI_COLORS.difficultyHigh, UI_COLORS.danger]);
export const LOG_MAX = 60;
