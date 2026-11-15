import { BASE_PALETTE_ID, PALETTES } from '../shared/ui/colors.js';
import { BASE_STYLE_ID, SHAPE_STYLES } from '../shared/ui/shapes.js';
import { getStorageJson, setStorageJson } from '../shared/storage/storage.js';

// The viewer's theme: two choices made apart, the palette's colours
// (`colors`: one of PALETTES, or `system` to follow the device's light or
// dark setting) and the look's style (`style`: one of SHAPE_STYLES). Kept in
// this browser (index.html reads the same key before the app draws).
export const THEME_CHOICE_KEY = 'gb:theme';

export const SYSTEM_COLORS = 'system';

export const COLOR_CHOICES = Object.freeze([
  Object.freeze({ id: SYSTEM_COLORS, label: 'System' }),
  ...Object.values(PALETTES).map(({ id, label }) => Object.freeze({ id, label })),
]);

export const STYLE_CHOICES = Object.freeze(Object.values(SHAPE_STYLES).map(({ id, label }) => Object.freeze({ id, label })));

// Dark until the light palette has colours of its own: then `system`.
export const DEFAULT_THEME_CHOICE = Object.freeze({ colors: BASE_PALETTE_ID, style: BASE_STYLE_ID });

export function normalizeThemeChoice(raw) {
  const colors = COLOR_CHOICES.some(({ id }) => id === raw?.colors) ? raw.colors : DEFAULT_THEME_CHOICE.colors;
  const style = SHAPE_STYLES[raw?.style] ? raw.style : DEFAULT_THEME_CHOICE.style;
  return { colors, style };
}

export function readThemeChoice() {
  return normalizeThemeChoice(getStorageJson(THEME_CHOICE_KEY, null));
}

export function writeThemeChoice(choice) {
  setStorageJson(THEME_CHOICE_KEY, normalizeThemeChoice(choice));
}

// The palette a choice of colours is drawn in: `system` takes the light one
// where the device asks for light, the dark one otherwise.
export function paletteForColors(colors, prefersLight) {
  if (colors === SYSTEM_COLORS) return prefersLight ? 'light' : 'dark';
  return PALETTES[colors] ? colors : BASE_PALETTE_ID;
}
