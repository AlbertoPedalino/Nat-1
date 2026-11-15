import { PALETTES } from '../shared/ui/colors.js';
import { BASE_STYLE_ID, SHAPE_STYLES } from '../shared/ui/shapes.js';
import { getStorageJson, setStorageJson } from '../shared/storage/storage.js';

// The viewer's theme: the look's style (`style`: one of SHAPE_STYLES) and the
// mode it is drawn in (`mode`: dark, light, or `system` to follow the
// device). Each style draws each mode in a palette of its own (its
// `palettes`), so the palette follows from the two. Kept in this browser
// (index.html reads the same key before the app draws).
export const THEME_CHOICE_KEY = 'gb:theme';

export const SYSTEM_MODE = 'system';

export const MODE_CHOICES = Object.freeze([
  Object.freeze({ id: SYSTEM_MODE, label: 'System' }),
  Object.freeze({ id: 'dark', label: 'Dark' }),
  Object.freeze({ id: 'light', label: 'Light' }),
]);

export const STYLE_CHOICES = Object.freeze(Object.values(SHAPE_STYLES).map(({ id, label }) => Object.freeze({ id, label })));

// Dark until the light palettes are reviewed: then `system`.
export const DEFAULT_THEME_CHOICE = Object.freeze({ mode: 'dark', style: BASE_STYLE_ID });

// A choice as kept, made whole. A choice kept before modes (`colors`: a
// palette's id) is read as the mode of that palette.
export function normalizeThemeChoice(raw) {
  const asked = raw?.mode ?? (raw?.colors === SYSTEM_MODE ? SYSTEM_MODE : PALETTES[raw?.colors]?.mode);
  const mode = MODE_CHOICES.some(({ id }) => id === asked) ? asked : DEFAULT_THEME_CHOICE.mode;
  const style = SHAPE_STYLES[raw?.style] ? raw.style : DEFAULT_THEME_CHOICE.style;
  return { mode, style };
}

export function readThemeChoice() {
  return normalizeThemeChoice(getStorageJson(THEME_CHOICE_KEY, null));
}

export function writeThemeChoice(choice) {
  setStorageJson(THEME_CHOICE_KEY, normalizeThemeChoice(choice));
}

// The mode a choice is drawn in: `system` is light where the device asks
// for light, dark otherwise.
export function resolvedMode(mode, prefersLight) {
  if (mode === SYSTEM_MODE) return prefersLight ? 'light' : 'dark';
  return mode === 'light' ? 'light' : 'dark';
}

// The palette a style is drawn in for a mode ('dark' or 'light').
export function paletteForStyle(styleId, mode) {
  const style = SHAPE_STYLES[styleId] || SHAPE_STYLES[BASE_STYLE_ID];
  return style.palettes[mode] || style.palettes.dark;
}
