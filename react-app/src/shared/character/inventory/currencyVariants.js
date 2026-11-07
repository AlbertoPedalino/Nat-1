import { UI_COLORS } from '../../ui/colors.js';
import { UI_FONTS } from '../../ui/fonts.js';

// Accent colors shared across every variant.
export const HOVER_SUBTRACT = UI_COLORS.danger;
export const HOVER_ADD = UI_COLORS.success;

export const buttonBaseSx = {
  borderRadius: 0,
  '&.Mui-disabled': {
    opacity: 0.35,
  },
};

// Per-mode visual config. Add a new mode by adding an entry here — the coin
// components read it through currencyVariant() and never branch on the mode name.
const VARIANTS = {
  builder: {
    fontFamily: undefined,
    box: { bgcolor: 'background.paper', p: 1 },
    labelGap: 0.6,
    labelTop: { fontSize: '0.66rem', letterSpacing: '0.04em' },
    labelBottom: { fontSize: '0.58rem', letterSpacing: '0.04em' },
    field: { variant: 'outlined', fontSize: '0.9rem', color: 'text.primary', py: '6px' },
    stepper: {
      columns: '24px minmax(34px, 1fr) 24px',
      mt: 0.5,
      bgcolor: 'background.default',
      button: 24,
      icon: 13,
      stepFontSize: '0.7rem',
      stepColor: 'text.secondary',
    },
  },
  sheet: {
    fontFamily: UI_FONTS.display,
    box: { bgcolor: UI_COLORS.headerBg, p: '4px 3px' },
    labelGap: 0.35,
    labelTop: { fontSize: '0.52rem', letterSpacing: '0.08em' },
    labelBottom: { fontSize: '0.48rem', letterSpacing: '0.08em' },
    field: { variant: 'standard', fontSize: '0.85rem', color: UI_COLORS.goldLight, py: '2px' },
    stepper: {
      columns: '20px minmax(26px, 1fr) 20px',
      mt: 0.3,
      bgcolor: UI_COLORS.ink,
      button: 20,
      icon: 11,
      stepFontSize: '0.6rem',
      stepColor: UI_COLORS.goldLight,
    },
  },
};

// The visual config of one mode ('builder' or 'sheet'; builder by default).
export function currencyVariant(mode) {
  return VARIANTS[mode] ?? VARIANTS.builder;
}
