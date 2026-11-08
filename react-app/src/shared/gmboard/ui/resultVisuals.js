import { Coins, Compass, Flame, Leaf, Minus, Swords, Tent } from 'lucide-react';
import { eventKind } from '../tables.js';

// How a rolled result looks wherever it is shown (dungeon room, quest, Roll
// tab, hexcrawl step): an icon and a tone, the tone being a key of the theme's
// `palette.gmboard.result`.
const EVENT_VISUALS = Object.freeze({
  encounter: { icon: Swords, tone: 'encounter' },
  loot: { icon: Coins, tone: 'loot' },
  camp: { icon: Tent, tone: 'camp' },
  trap: { icon: Flame, tone: 'trap' },
  nothing: { icon: Minus, tone: 'none' },
  other: { icon: Compass, tone: 'trigger' },
});

const COMPLICATION_VISUALS = Object.freeze({
  Encounter: { icon: Swords, tone: 'encounter' },
  'Environment Damage': { icon: Flame, tone: 'trap' },
  Environment: { icon: Leaf, tone: 'environment' },
  None: { icon: Minus, tone: 'none' },
});

export function eventVisual(ev) {
  return EVENT_VISUALS[eventKind(ev)];
}

export function complicationVisual(type) {
  return Object.hasOwn(COMPLICATION_VISUALS, type) ? COMPLICATION_VISUALS[type] : COMPLICATION_VISUALS.None;
}

// A colour from one of the board's tone groups (`result`, `difficulty`,
// `rarity`, …) by row value; Common's colour when the value has none.
export function boardTone(palette, group, key) {
  const tones = palette.gmboard[group] || {};
  return Object.hasOwn(tones, key) ? tones[key] : palette.gmboard.rarity.Common;
}
