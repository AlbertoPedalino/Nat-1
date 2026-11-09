import { battleMapCompactFieldSx } from '../map/battleMapSurface.js';
import { FONT_SIZES, LETTER_SPACINGS, FONT_WEIGHTS } from '../../../shared/ui/fonts.js';
// Looks shared by the piece menu (TokenMenu) and its sections.

export const compactFieldSx = battleMapCompactFieldSx;

export const sectionTitleSx = {
  color: 'text.secondary',
  fontSize: FONT_SIZES.xs,
  fontWeight: FONT_WEIGHTS.heavy,
  letterSpacing: LETTER_SPACINGS.sm,
  lineHeight: 1.2,
};
