import { UI_FONTS } from './fonts.js';
import { UI_COLORS, uiAlpha } from './colors.js';

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

// A small toggle that lights up in gold while on (a filter, an open panel):
// uppercase Cinzel, quiet when off.
export function goldToggleSx(active) {
  return {
    minHeight: 0,
    px: '10px',
    py: '3px',
    border: 1,
    borderColor: active ? UI_COLORS.gold : 'divider',
    borderRadius: 1,
    bgcolor: active ? uiAlpha(UI_COLORS.gold, 0.12) : 'transparent',
    color: active ? UI_COLORS.goldLight : 'text.secondary',
    fontFamily: UI_FONTS.display,
    fontSize: '0.58rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    '&:hover': {
      borderColor: UI_COLORS.gold,
      color: UI_COLORS.goldLight,
      bgcolor: uiAlpha(UI_COLORS.gold, active ? 0.18 : 0.08),
    },
  };
}
