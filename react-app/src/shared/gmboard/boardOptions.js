import { clamp } from '../numbers.js';
// The choices a GM Board offers (seasons, weather, mounts, terrain, population,
// tiers), shared with the battle map's hexcrawl and dungeon panels.
export const SEASONS = Object.freeze(['Spring', 'Summer', 'Autumn', 'Winter']);

export const WEATHER_OVERRIDE_OPTIONS = Object.freeze([
  { weather: 'Clear', intensity: '', label: 'Clear', sub: '' },
  { weather: 'Rain', intensity: 'Light', label: 'Light', sub: '×1 time' },
  { weather: 'Rain', intensity: 'Moderate', label: 'Moderate', sub: '×2 time' },
  { weather: 'Rain', intensity: 'Heavy', label: 'Heavy', sub: '×2 + Dis' },
  { weather: 'Snow', intensity: 'Light', label: 'Light', sub: '×2 time' },
  { weather: 'Snow', intensity: 'Moderate', label: 'Moderate', sub: '×2 + Dis' },
  { weather: 'Snow', intensity: 'Heavy', label: 'Heavy', sub: '×4 + Dis' },
]);

// What the party is travelling on. A mount does not change what a hex is, only
// how long it takes to cross: at ×2 a four-hour forest is two hours of forest.
// The presets are the ones a table reaches for; the multiplier is free, because
// every setting has its own beasts and somebody will want ×6.
export const MOUNT_OPTIONS = Object.freeze([
  { id: 'foot', label: 'On foot', speed: 1, sub: 'full time' },
  { id: 'riding', label: 'Riding', speed: 2, sub: 'half' },
  { id: 'fast', label: 'Fast mount', speed: 3, sub: 'a third' },
  { id: 'flying', label: 'Flying', speed: 4, sub: 'a quarter' },
]);

// A cart is slower than walking and a phoenix is faster than anything, so the
// range is generous — but never zero, which would be a hex that takes no time
// and a party that crosses a continent for free.
export const MIN_MOUNT_SPEED = 0.25;

export const MAX_MOUNT_SPEED = 20;

export function normalizeMountSpeed(value) {
  const speed = Number(value);
  if (!Number.isFinite(speed) || speed <= 0) return 1;
  // Quarters: ×1.5 is a real answer, ×1.37 is a spreadsheet.
  const quartered = Math.round(speed * 4) / 4;
  return clamp(quartered, MIN_MOUNT_SPEED, MAX_MOUNT_SPEED);
}

export const TERRAIN_OPTIONS = Object.freeze([
  { id: 'road', label: 'Road', hours: 1, sub: '+1h' },
  { id: 'plains', label: 'Plains', hours: 2, sub: '+2h' },
  { id: 'forest', label: 'Forest', hours: 4, sub: '+4h' },
  { id: 'mountain', label: 'Mountain', hours: 8, sub: '+8h' },
]);

export const HEX_POPULATION_OPTIONS = Object.freeze([
  { id: 'unexplored', label: 'Unexplored', thr: 1, sub: 'trigger: 1 only' },
  { id: 'frontier', label: 'Frontier', thr: 2, sub: 'trigger: 1–2' },
  { id: 'settled', label: 'Settled', thr: 3, sub: 'trigger: 1–3' },
]);

export const DUNGEON_POPULATION_OPTIONS = Object.freeze([
  { id: 'random', label: 'Random', thr: 0, sub: '1–3 random' },
  { id: 'unexplored', label: 'Unexplored', thr: 1, sub: '×1 roll' },
  { id: 'frontier', label: 'Frontier', thr: 2, sub: '×2 rolls' },
  { id: 'settled', label: 'Settled', thr: 3, sub: '×3 rolls' },
]);

export const DUNGEON_ROOM_POP_LABELS = Object.freeze({
  1: 'Unexplored',
  2: 'Peripheral',
  3: 'Populated',
});

export const TIER_OPTIONS = Object.freeze([
  { tier: 1, label: 'Tier 1', shortLabel: 'T1', levels: 'Levels 1–4', shortLevels: 'Lv 1–4' },
  { tier: 2, label: 'Tier 2', shortLabel: 'T2', levels: 'Levels 5–10', shortLevels: 'Lv 5–10' },
  { tier: 3, label: 'Tier 3', shortLabel: 'T3', levels: 'Levels 11–16', shortLevels: 'Lv 11–16' },
  { tier: 4, label: 'Tier 4', shortLabel: 'T4', levels: 'Levels 17–20', shortLevels: 'Lv 17–20' },
]);

export const QUEST_SCOPE_OPTIONS = Object.freeze([
  { id: 'random', label: 'Random', thr: 0, sub: '1–3 d8 random' },
  { id: 'small', label: 'Small', thr: 1, sub: '1d8' },
  { id: 'medium', label: 'Medium', thr: 2, sub: '2d8 max' },
  { id: 'large', label: 'Large', thr: 3, sub: '3d8 max' },
]);
