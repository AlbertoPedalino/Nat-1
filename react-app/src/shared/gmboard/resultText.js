import { formatNumber } from '../ui/numberFormat.js';
import { hasTableValue } from './tables.js';

// The two numbers a rolled fight is run on, said the same way by the dungeon
// room, the quest, the hexcrawl step and the map panel: "Level 5 · 1,100 XP/PC".
// The difficulty is left to the caller, which shows it as a badge or a word.
export function encounterDetail(data) {
  return [
    data?.lv != null ? `Level ${data.lv}` : null,
    data?.xp != null ? `${formatNumber(data.xp)} XP/PC` : null,
  ].filter(Boolean).join(' · ');
}

// A loot row's details on one line: "Rare · Fine · 500 gp + gem", or '' when
// the row found nothing.
export function lootDetail(loot) {
  if (!hasTableValue(loot?.rarity)) return '';
  const valueLine = [loot.value, loot.extra].filter(Boolean).join(' ');
  return [loot.rarity, loot.quality, valueLine].filter(Boolean).join(' · ');
}

// The dice behind a result: "d8(3)+d12(7)=10". A board roll is kept as
// `{ d8, d12, sum }` or, for 2d20, `{ d1, d2, sum }` (tableDice.js).
export function diceText(roll) {
  const dice = roll.d8 != null
    ? [[8, roll.d8], [12, roll.d12]]
    : [[20, roll.d1], [20, roll.d2]];
  return `${dice.map(([faces, value]) => `d${faces}(${value})`).join('+')}=${roll.sum}`;
}
