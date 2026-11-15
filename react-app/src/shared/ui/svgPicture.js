import { readsPalette } from './colors.js';
import { styleShapes } from './shapes.js';
import { themedValue } from './themedValues.js';

// An SVG drawing as a CSS image (`backgroundImage: svgPicture(svg)`): the one
// way the interface turns markup it builds into a picture (a die's face, a
// bubble's shape, a panel bar's notch). A picture reads no CSS variables, so
// one drawn in the palette's roles is drawn once per palette in its hexes and
// given as a themed value (themedValues.js): it follows the chosen palette.
export function svgPicture(svg) {
  if (!readsPalette(svg)) return dataPicture(svg);
  return themedValue(`picture:${svg}`, (resolve) => dataPicture(resolve(svg)));
}

// A picture cut in the style's shapes (the ornament, the die glyph, a burst):
// `draw(shapes)` answers its SVG for a style's shapes (shapes.js), and it is
// drawn once per style and palette. `key` names the drawing (with what it is
// drawn in, as a colour), the same key being the same picture.
export function svgStylePicture(key, draw) {
  return themedValue(`style-picture:${key}`, (resolve, { styleId }) => dataPicture(resolve(draw(styleShapes(styleId)))));
}

export function dataPicture(svg) {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
