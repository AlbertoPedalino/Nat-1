import { useTheme } from '@mui/material';
import { BASE_PALETTE_ID } from './colors.js';
import { BASE_STYLE_ID, styleShapes } from './shapes.js';

// The viewer's choice the page is drawn in (ThemeChoiceProvider builds the
// theme with it), for what cannot read the theme's CSS variables.

// The palette: what a canvas resolves the palette's roles in
// (resolveColors, vttCanvasColors).
export function usePaletteId() {
  return useTheme().gmboard?.paletteId || BASE_PALETTE_ID;
}

// The style's id, and its shapes: what a part worked out in code (a gem's
// facets, a meter's cuts) is cut from.
export function useStyleId() {
  return useTheme().gmboard?.styleId || BASE_STYLE_ID;
}

export function useStyleShapes() {
  return styleShapes(useStyleId());
}
