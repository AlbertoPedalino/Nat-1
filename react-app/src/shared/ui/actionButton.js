import { CONTROL_FONT_SIZES } from './fonts.js';
import { UI_COLORS, OPACITY } from './colors.js';
import { TEXT_STYLES } from './textStyles.js';
import { toggleSx } from './pressable.js';
import { washImage } from './surfaces.js';

// The label of a compact action button in a button group (the sheet's Rest
// group, the dice control): small uppercase display face, one line, the buttons of
// a group sharing its width.
export const actionButtonTextSx = {
  flex: 1,
  whiteSpace: 'nowrap',
  ...TEXT_STYLES.label,
  fontSize: CONTROL_FONT_SIZES.normal,
};

// A compact action button in one colour: its label in it, the inked edge every
// button has, and a faint wash of the colour on hover — laid over the button's
// own background, so a button with a solid fill (a floating one) stays solid.
export function actionButtonToneSx(color) {
  return {
    color,
    borderColor: UI_COLORS.edge,
    '&:hover': { borderColor: UI_COLORS.edge, backgroundImage: washImage(color, OPACITY.soft) },
  };
}

// A small toggle (a filter, an open panel): the raised toggle (toggleSx,
// filled in gold while on) in the uppercase display face.
export function goldToggleSx(active) {
  return {
    ...toggleSx(active),
    minHeight: 0,
    px: 1.25,
    py: 0.5,
    borderRadius: 1,
    ...TEXT_STYLES.label,
    fontSize: CONTROL_FONT_SIZES.small,
    whiteSpace: 'nowrap',
  };
}

// A button that carries content rather than a label: an option with a line
// of description under its name, a vertical tab with its summary, a button
// that shows a chosen value (the atmosphere, "+1h"). It keeps the words as
// written instead of the controls' spaced capitals; the only place a
// button's lettering is turned back (guarded).
export const CONTENT_BUTTON_SX = Object.freeze({
  textTransform: 'none',
  letterSpacing: 0,
});
