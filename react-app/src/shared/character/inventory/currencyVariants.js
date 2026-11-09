import { UI_COLORS, OPACITY } from '../../ui/colors.js';
import { UI_FONTS, FONT_SIZES, LETTER_SPACINGS } from '../../ui/fonts.js';

// Accent colors shared across every variant.
export const HOVER_SUBTRACT = UI_COLORS.danger;
export const HOVER_ADD = UI_COLORS.success;

export const buttonBaseSx = {
  borderRadius: 0,
  '&.Mui-disabled': {
    opacity: OPACITY.line,
  },
};

// Per-mode visual config. Add a new mode by adding an entry here — the coin
// components read it through currencyVariant() and never branch on the mode name.
const VARIANTS = {
  builder: {
    fontFamily: undefined,
    box: { bgcolor: 'background.paper', p: 1 },
    labelGap: 0.6,
    labelTop: { fontSize: FONT_SIZES.sm, letterSpacing: LETTER_SPACINGS.sm },
    labelBottom: { fontSize: FONT_SIZES.xxs, letterSpacing: LETTER_SPACINGS.sm },
    field: { variant: 'outlined', fontSize: FONT_SIZES.xxl, color: 'text.primary', py: '6px' },
    stepper: {
      columns: '24px minmax(34px, 1fr) 24px',
      mt: 0.5,
      bgcolor: 'background.default',
      button: 24,
      icon: 13,
      stepFontSize: FONT_SIZES.md,
      stepColor: 'text.secondary',
    },
  },
  sheet: {
    fontFamily: UI_FONTS.display,
    box: { bgcolor: UI_COLORS.surfaceHeader, p: '4px 3px' },
    labelGap: 0.35,
    labelTop: { fontSize: FONT_SIZES.xxxs, letterSpacing: LETTER_SPACINGS.lg },
    labelBottom: { fontSize: FONT_SIZES.xxxs, letterSpacing: LETTER_SPACINGS.lg },
    field: { variant: 'standard', fontSize: FONT_SIZES.xxl, color: UI_COLORS.accentText, py: '2px' },
    stepper: {
      columns: '20px minmax(26px, 1fr) 20px',
      mt: 0.3,
      bgcolor: UI_COLORS.surfaceSunken,
      button: 20,
      icon: 11,
      stepFontSize: FONT_SIZES.xs,
      stepColor: UI_COLORS.accentText,
    },
  },
};

// The visual config of one mode ('builder' or 'sheet'; builder by default).
export function currencyVariant(mode) {
  return VARIANTS[mode] ?? VARIANTS.builder;
}
