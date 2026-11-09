import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';
import { OPACITY } from '../../../shared/ui/colors.js';

export const placementCardSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1.25,
  p: 1,
  borderRadius: 1,
  border: `1px solid ${vttAlpha(VTT_COLORS.accent, OPACITY.shade)}`,
  bgcolor: vttAlpha(VTT_COLORS.black, OPACITY.shade),
  userSelect: 'none',
  touchAction: 'pan-y',
  WebkitTouchCallout: 'none',
  '&:hover': {
    borderColor: vttAlpha(VTT_COLORS.accent, OPACITY.strong),
    bgcolor: vttAlpha(VTT_COLORS.accent, OPACITY.wash),
  },
};

export const noticeSx = { color: 'warning.main', fontSize: FONT_SIZES.lg, lineHeight: 1.4 };
export const instanceRowSx = { display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, width: '100%' };
export const instanceNameSx = { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' };

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
