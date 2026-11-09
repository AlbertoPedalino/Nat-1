import { VTT_COLORS, vttAlpha } from '../../../shared/vtt/colors.js';
import { FONT_SIZES } from '../../../shared/ui/fonts.js';

export const placementCardSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1.25,
  p: 1,
  borderRadius: 1,
  border: `1px solid ${vttAlpha(VTT_COLORS.gold, 0.25)}`,
  bgcolor: vttAlpha(VTT_COLORS.black, 0.22),
  userSelect: 'none',
  touchAction: 'pan-y',
  WebkitTouchCallout: 'none',
  '&:hover': {
    borderColor: vttAlpha(VTT_COLORS.gold, 0.6),
    bgcolor: vttAlpha(VTT_COLORS.gold, 0.06),
  },
};

export const noticeSx = { color: 'warning.main', fontSize: FONT_SIZES.lg, lineHeight: 1.4 };
export const instanceRowSx = { display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, width: '100%' };
export const instanceNameSx = { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' };

// A save that is not in this browser yet: picking it downloads it.
export const cloudBadgeSx = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.4,
  ml: 'auto',
  flexShrink: 0,
  px: 0.6,
  fontSize: FONT_SIZES.sm,
  color: 'gmboard.vtt.gold',
  border: '1px solid',
  borderColor: 'gmboard.vtt.goldBorder',
  borderRadius: 1,
};
