import { FONT_SIZES } from './fonts.js';
import { UI_COLORS, uiAlpha, OPACITY } from './colors.js';
import { TEXT_STYLES } from './textStyles.js';

// The label of a compact action button in a button group (the sheet's Rest
// group, the dice control): small uppercase Cinzel, one line, the buttons of
// a group sharing its width.
export const actionButtonTextSx = {
  flex: 1,
  whiteSpace: 'nowrap',
  ...TEXT_STYLES.label,
  fontSize: FONT_SIZES.xs,
  
};

// A compact action button in one colour: its label and edge, a stronger edge
// and a faint wash on hover — laid over the button's own background, so a
// button with a solid fill (a floating one) stays solid.
export function actionButtonToneSx(color) {
  const wash = uiAlpha(color, OPACITY.soft);
  return {
    color,
    borderColor: uiAlpha(color, OPACITY.edge),
    '&:hover': { borderColor: color, backgroundImage: `linear-gradient(${wash}, ${wash})` },
  };
}

// A small toggle that lights up in gold while on (a filter, an open panel):
// uppercase Cinzel, quiet when off.
export function goldToggleSx(active) {
  return {
    minHeight: 0,
    px: 1.25,
    py: 0.5,
    border: 1,
    borderColor: active ? UI_COLORS.accent : 'divider',
    borderRadius: 1,
    bgcolor: active ? uiAlpha(UI_COLORS.accent, OPACITY.tint) : 'transparent',
    color: active ? UI_COLORS.accentText : 'text.secondary',
    ...TEXT_STYLES.label,
    fontSize: FONT_SIZES.xxs,
    whiteSpace: 'nowrap',
    '&:hover': {
      borderColor: UI_COLORS.accent,
      color: UI_COLORS.accentText,
      bgcolor: uiAlpha(UI_COLORS.accent, active ? OPACITY.fill : OPACITY.soft),
    },
  };
}
