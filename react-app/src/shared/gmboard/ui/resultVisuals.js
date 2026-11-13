import { Compass, Minus } from 'lucide-react';
import { eventKind } from '../tables.js';
import { GAME_ICONS } from '../../ui/gameIcons.js';

// How a rolled result looks wherever it is shown (dungeon room, quest, Roll
// tab, hexcrawl step): an icon and a tone, the tone being a key of the theme's
// `palette.gmboard.result`.
const EVENT_VISUALS = Object.freeze({
  encounter: { icon: GAME_ICONS.encounter, tone: 'encounter' },
  loot: { icon: GAME_ICONS.loot, tone: 'loot' },
  camp: { icon: GAME_ICONS.camp, tone: 'camp' },
  trap: { icon: GAME_ICONS.trap, tone: 'trap' },
  nothing: { icon: Minus, tone: 'none' },
  other: { icon: Compass, tone: 'trigger' },
});

const COMPLICATION_VISUALS = Object.freeze({
  Encounter: { icon: GAME_ICONS.encounter, tone: 'encounter' },
  'Environment Damage': { icon: GAME_ICONS.trap, tone: 'trap' },
  Environment: { icon: GAME_ICONS.environment, tone: 'environment' },
  None: { icon: Minus, tone: 'none' },
});

export function eventVisual(ev) {
  return EVENT_VISUALS[eventKind(ev)];
}

export function complicationVisual(type) {
  return Object.hasOwn(COMPLICATION_VISUALS, type) ? COMPLICATION_VISUALS[type] : COMPLICATION_VISUALS.None;
}

// A colour from one of the board's tone groups (`result`, `difficulty`,
// `rarity`, …) by row value; the neutral `result.none` when it has none.
export function boardTone(palette, group, key) {
  const tones = palette.gmboard[group] || {};
  return Object.hasOwn(tones, key) ? tones[key] : palette.gmboard.result.none;
}
