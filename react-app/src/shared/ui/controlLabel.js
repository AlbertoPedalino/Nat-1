import { FONT_SIZES, LINE_HEIGHTS } from './fonts.js';

// The name written beside or over a compact control (a checkbox in a menu, a
// slider's "Size 20 ft", a colour well's "Colour"): a step under the body
// text, set tight so the row keeps the control's own height. ToggleRow's
// dense rows and LabeledSlider letter their names with it.
export const CONTROL_LABEL_SX = Object.freeze({ fontSize: FONT_SIZES.sm, lineHeight: LINE_HEIGHTS.tight });
