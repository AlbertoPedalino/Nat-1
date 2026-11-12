import { FONT_SIZES } from './fonts.js';

// Heights of the interface's small pieces, in steps: tags and badges (`xxs`–
// `md`), compact rows and controls (`lg`–`xl`), toolbar fields and tabs
// (`xxl`–`huge`). Shapes drawn to their own size (round swatches, colour
// bars, avatars, map pieces) are geometry and keep their own.
export const CONTROL_HEIGHTS = Object.freeze({
  xxs: 16,
  xs: 18,
  sm: 20,
  md: 24,
  lg: 28,
  xl: 32,
  xxl: 36,
  huge: 40,
});

// A text field in a dense panel (the sheet's search boxes, a custom item's
// weight and cost): the input's text and padding brought down to the panel.
export const COMPACT_INPUT_SX = Object.freeze({
  '& .MuiInputBase-input': { fontSize: FONT_SIZES.lg, py: 1 },
});
