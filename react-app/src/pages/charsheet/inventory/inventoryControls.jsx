import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { SURFACES } from '../../../shared/ui/surfaces.js';

// Looks shared by the inventory tab's two sections: the add-item search and
// the owned inventory list. Their group chips are ItemGroupFilter.

export const compactInputSx = {
  '& input': { fontSize: FONT_SIZES.lg, py: 1 },
};

export const inventorySectionSx = {
  ...SURFACES.inset,
  p: 1,
  mb: 1,
};
