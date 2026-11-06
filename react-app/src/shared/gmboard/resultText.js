import { formatNumber } from '../ui/numberFormat.js';

// The two numbers a rolled fight is run on, said the same way by the dungeon
// room, the quest, the hexcrawl step and the map panel: "Level 5 · 1,100 XP/PC".
// The difficulty is left to the caller, which shows it as a badge or a word.
export function encounterDetail(data) {
  return [
    data?.lv != null ? `Level ${data.lv}` : null,
    data?.xp != null ? `${formatNumber(data.xp)} XP/PC` : null,
  ].filter(Boolean).join(' · ');
}
