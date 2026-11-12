import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import { FONT_SIZES, LINE_HEIGHTS } from '../../../shared/ui/fonts.js';
import { OPACITY } from '../../../shared/ui/colors.js';
import { tintedSurfaceSx } from '../../../shared/ui/surfaces.js';
import { ONE_LINE_SX } from '../../../shared/ui/textStyles.js';
import { DRAG_SOURCE_SX } from '../../../shared/ui/interactive.js';

export const placementCardSx = {
  ...DRAG_SOURCE_SX,
  display: 'flex',
  alignItems: 'center',
  gap: 1.25,
  p: 1,
  borderRadius: 1,
  border: `1px solid ${vttAlpha(VTT_COLORS.accent, OPACITY.shade)}`,
  // Washed over the map dialog's own surface, so the card stays solid.
  ...tintedSurfaceSx(VTT_COLORS.black, { amount: OPACITY.shade, base: VTT_COLORS.surface }),
  '&:hover': {
    borderColor: vttAlpha(VTT_COLORS.accent, OPACITY.strong),
    ...tintedSurfaceSx(VTT_COLORS.accent, { amount: OPACITY.wash, base: VTT_COLORS.surface }),
  },
};

export const noticeSx = { color: 'warning.main', fontSize: FONT_SIZES.lg, lineHeight: LINE_HEIGHTS.normal };
export const instanceRowSx = { display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, width: '100%' };
export const instanceNameSx = ONE_LINE_SX;

// A save that is not in this browser yet: picking it downloads it.
export const cloudBadgeSx = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.5,
  ml: 'auto',
  flexShrink: 0,
  px: 0.5,
  fontSize: FONT_SIZES.sm,
  color: 'gmboard.vtt.accent',
  border: '1px solid',
  borderColor: 'gmboard.vtt.accentBorder',
  borderRadius: 1,
};
