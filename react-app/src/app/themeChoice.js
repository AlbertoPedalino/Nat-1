import { PALETTES } from '../shared/ui/colors.js';
import { BASE_STYLE_ID, SHAPE_STYLES, currentStyleId } from '../shared/ui/shapes.js';
import { getStorageJson, setStorageJson } from '../shared/storage/storage.js';
import { DICE_COLORS, DICE_STYLES } from '../shared/ui/diceSets.js';

// The viewer's theme: the look's style (`style`: one of SHAPE_STYLES), the
// mode it is drawn in (`mode`: dark, light, or `system` to follow the
// device) and the dice they roll with (diceSets.js): their cut (`diceStyle`)
// and their colours (`diceColors`), each a theme's, or `style` for the
// chosen style's own. Each style draws each mode in a palette of its
// own (its `palettes`), so the palette follows from the two. Kept in this
// browser (index.html reads the same key before the app draws).
export const THEME_CHOICE_KEY = 'gb:theme';

const SYSTEM_MODE = 'system';

export const MODE_CHOICES = Object.freeze([
  Object.freeze({ id: SYSTEM_MODE, label: 'System' }),
  Object.freeze({ id: 'dark', label: 'Dark' }),
  Object.freeze({ id: 'light', label: 'Light' }),
]);

export const STYLE_CHOICES = Object.freeze(Object.values(SHAPE_STYLES).map(({ id, label }) => Object.freeze({ id, label })));

// The chosen style's own dice (their cut or their colours), whatever it is.
export const STYLE_DICE = 'style';

// Dark until the light palettes are reviewed: then `system`.
export const DEFAULT_THEME_CHOICE = Object.freeze({
  mode: 'dark', style: BASE_STYLE_ID, diceStyle: STYLE_DICE, diceColors: STYLE_DICE,
});

// A choice as kept, made whole. A choice kept before modes (`colors`: a
// palette's id) is read as the mode of that palette.
export function normalizeThemeChoice(raw) {
  const asked = raw?.mode ?? (raw?.colors === SYSTEM_MODE ? SYSTEM_MODE : PALETTES[raw?.colors]?.mode);
  const mode = MODE_CHOICES.some(({ id }) => id === asked) ? asked : DEFAULT_THEME_CHOICE.mode;
  // A style kept under an old name is read as it is named now.
  const [style, diceStyle, diceColors] = [raw?.style, raw?.diceStyle, raw?.diceColors].map(currentStyleId);
  return {
    mode,
    style: SHAPE_STYLES[style] ? style : DEFAULT_THEME_CHOICE.style,
    diceStyle: DICE_STYLES[diceStyle] ? diceStyle : STYLE_DICE,
    diceColors: DICE_COLORS[diceColors] ? diceColors : STYLE_DICE,
  };
}

// The dice a choice rolls with ({ style, colors }, diceSets.js): each the one
// picked, or the chosen style's.
export function chosenDice(choice) {
  return {
    style: choice.diceStyle === STYLE_DICE ? choice.style : choice.diceStyle,
    colors: choice.diceColors === STYLE_DICE ? choice.style : choice.diceColors,
  };
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
