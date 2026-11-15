import { BASE_PALETTE_ID, UI_COLORS, readsPalette, resolveColors } from '../../ui/colors.js';
import { SHAPE_STYLES } from '../../ui/shapes.js';
import { dataPicture } from '../../ui/svgPicture.js';
import { themedValue } from '../../ui/themedValues.js';

// A die is the same dark solid in every palette (its face, rim and numbers
// are the dark palette's roles in all of them), so whatever is drawn on it —
// its numbers in the result's colour, a dropped die's quiet face — takes the
// colours of the style's dark palette, whatever the mode: on a light palette
// the page's dark text and pale surfaces would vanish on the green or wash
// the die out. On a dark palette these are the page's own colours.
function darkPaletteOf(styleId) {
  return SHAPE_STYLES[styleId]?.palettes.dark || BASE_PALETTE_ID;
}

// MUI's text tokens, as a die's colour may be given ('text.primary').
const TEXT_TOKENS = Object.freeze({ 'text.primary': UI_COLORS.textPrimary, 'text.secondary': UI_COLORS.textSecondary });

// A colour drawn on a die.
export function dieColor(color) {
  const role = TEXT_TOKENS[color] || color;
  if (!role || !readsPalette(role)) return role;
  return themedValue(`die-color:${role}`, (resolve, { styleId }) => resolveColors(role, darkPaletteOf(styleId)));
}

// A die's face drawn as a picture (svgPicture), in the die's colours.
export function diePicture(svg) {
  if (!readsPalette(svg)) return dataPicture(svg);
  return themedValue(`die-picture:${svg}`, (resolve, { styleId }) => dataPicture(resolveColors(svg, darkPaletteOf(styleId))));
}
