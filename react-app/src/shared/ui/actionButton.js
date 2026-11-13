import { CONTROL_FONT_SIZES, FONT_WEIGHTS } from './fonts.js';
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

// The line of description inside a button, under its name (an option's
// "trigger: 1 only", "Lv 1–4"): the button's name keeps the controls'
// capitals, its description reads as every description does, in the prose
// face as written. The only place a button's lettering is turned back
// (guarded).
export const BUTTON_DESCRIPTION_SX = Object.freeze({
  ...TEXT_STYLES.prose,
  textTransform: 'none',
  letterSpacing: 0,
  fontWeight: FONT_WEIGHTS.regular,
});
