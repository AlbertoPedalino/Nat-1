import { battleMapCompactFieldSx } from '../map/battleMapSurface.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
// Looks shared by the piece menu (TokenMenu) and its sections.

export const compactFieldSx = battleMapCompactFieldSx;

export const sectionTitleSx = {
  color: 'text.secondary',
  fontSize: FONT_SIZES.xs,
  fontWeight: 800,
  letterSpacing: '0.035em',
  lineHeight: 1.2,
};
