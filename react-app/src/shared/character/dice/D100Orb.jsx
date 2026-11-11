import { Box } from '@mui/material';
import { TEXT_STYLES } from '../../ui/textStyles.js';
import { OPACITY, UI_COLORS, uiAlpha } from '../../ui/colors.js';
import { LINE_HEIGHTS } from '../../ui/fonts.js';

// A d100 is close enough to a sphere that drawing one hundred independently
// composited CSS planes buys very little motion and costs a great deal. This
// single clipped texture keeps the same neutral faceted form in physical throws
// and result surfaces without implying that the die must be percentile-based.
export default function D100Orb({
  value,
  size = 58,
  color = UI_COLORS.onDie,
  dimmed = false,
  revealed = true,
  textureRef,
  resultRef,
}) {
  return (
    <Box
      role="img"
      aria-label={`d100 result ${value}`}
      data-die-shape="d100-orb"
      sx={{
        ...orbSx,
        width: size,
        height: size,
        opacity: dimmed ? OPACITY.line : 1,
      }}
    >
      <Box
        ref={textureRef}
        data-d100-orb="true"
        sx={textureSx}
      />
      <Box sx={lightSx} />
      <Box
        ref={resultRef}
        data-d100-result="true"
        data-visible={revealed ? 'true' : undefined}
        sx={{
          ...resultSx,
          color,
          fontSize: `${Math.max(8, size * 0.24)}px`,
        }}
      >
        {value}
      </Box>
    </Box>
  );
}

const orbSx = {
  position: 'relative',
  overflow: 'hidden',
  flex: '0 0 auto',
  borderRadius: '50%',
  // Green with a cream rim, like every other die and the app's icon.
  border: `2px solid ${UI_COLORS.dieEdge}`,
  bgcolor: UI_COLORS.dieFace,
  boxShadow: [
    'inset -12px -14px 18px rgba(0, 0, 0, 0.62)',
    `inset 8px 7px 12px ${uiAlpha(UI_COLORS.onDie, OPACITY.fill)}`,
    '0 2px 3px rgba(0, 0, 0, 0.38)',
  ].join(', '),
};

// Larger than the circular window so quaternion-driven shifts and rotation
// never expose an empty corner. Several hard-stop gradients read as facets but
// remain one composited element instead of one element per face.
const textureSx = {
  position: 'absolute',
  width: '148%',
  height: '148%',
  left: '-24%',
  top: '-24%',
  borderRadius: '50%',
  willChange: 'transform',
  background: [
    `linear-gradient(32deg, transparent 0 36%, ${uiAlpha(UI_COLORS.onDie, OPACITY.fill)} 36% 51%, transparent 51%)`,
    `linear-gradient(147deg, rgba(20, 17, 13, 0.34) 0 29%, transparent 29% 67%, ${uiAlpha(UI_COLORS.onDie, OPACITY.tint)} 67%)`,
    // Lighter greens over the orb's own deep green: the facets.
    `conic-gradient(from 11deg at 52% 48%, ${[OPACITY.strong, OPACITY.tint, OPACITY.heavy, OPACITY.line, OPACITY.solid, OPACITY.fill, OPACITY.veil, OPACITY.wash]
      .map((alpha, index) => `${uiAlpha(UI_COLORS.dieFaceLit, alpha)} ${index * 12.5}% ${(index + 1) * 12.5}%`)
      .join(', ')})`,
  ].join(', '),
};

const lightSx = {
  position: 'absolute',
  inset: 0,
  borderRadius: '50%',
  pointerEvents: 'none',
  background: 'radial-gradient(circle at 31% 24%, rgba(255,245,207,0.3), transparent 20%, transparent 58%, rgba(0,0,0,0.28) 82%)',
};

const resultSx = {
  position: 'absolute',
  left: '50%',
  top: '50%',
  minWidth: '68%',
  height: '42%',
  px: 0.25,
  transform: 'translate(-50%, -50%) scale(0.82)',
  opacity: 0,
  display: 'grid',
  placeItems: 'center',
  border: `1px solid ${uiAlpha(UI_COLORS.onDie, OPACITY.heavy)}`,
  borderRadius: 999,
  bgcolor: 'rgba(9, 8, 7, 0.82)',
  boxShadow: '0 2px 9px rgba(0,0,0,0.52)',
  ...TEXT_STYLES.figure,
  lineHeight: LINE_HEIGHTS.none,
  transition: 'opacity 150ms ease-out, transform 180ms cubic-bezier(0.2, 0.9, 0.25, 1.18)',
  '&[data-visible="true"]': {
    opacity: 1,
    transform: 'translate(-50%, -50%) scale(1)',
  },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
  },
};
