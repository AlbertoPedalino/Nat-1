import { UI_FONTS } from './fonts.js';
import { uiAlpha } from './colors.js';

// The label of a compact action button in a button group (the sheet's Rest
// group, the dice control): small uppercase Cinzel, one line, the buttons of
// a group sharing its width.
export const actionButtonTextSx = {
  flex: 1,
  whiteSpace: 'nowrap',
  fontFamily: UI_FONTS.display,
  fontSize: '0.625rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};

// A compact action button in one colour: its label and edge, a stronger edge
// and a faint wash on hover — laid over the button's own background, so a
// button with a solid fill (a floating one) stays solid.
export function actionButtonToneSx(color) {
  const wash = uiAlpha(color, 0.08);
  return {
    color,
    borderColor: uiAlpha(color, 0.4),
    '&:hover': { borderColor: color, backgroundImage: `linear-gradient(${wash}, ${wash})` },
  };
}
