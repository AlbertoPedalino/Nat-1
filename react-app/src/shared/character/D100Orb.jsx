import { Box } from '@mui/material';

// A d100 is close enough to a sphere that drawing one hundred independently
// composited CSS planes buys very little motion and costs a great deal. This
// single clipped texture keeps the same neutral faceted form in physical throws
// and result surfaces without implying that the die must be percentile-based.
export default function D100Orb({
  value,
  size = 58,
  color = '#edd48a',
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
        opacity: dimmed ? 0.35 : 1,
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
  border: '2px solid rgb(190, 153, 70)',
  bgcolor: 'rgb(55, 45, 30)',
  boxShadow: [
    'inset -12px -14px 18px rgba(0, 0, 0, 0.62)',
    'inset 8px 7px 12px rgba(255, 225, 145, 0.16)',
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
    'linear-gradient(32deg, transparent 0 36%, rgba(236, 202, 119, 0.16) 36% 51%, transparent 51%)',
    'linear-gradient(147deg, rgba(20, 17, 13, 0.34) 0 29%, transparent 29% 67%, rgba(242, 207, 122, 0.12) 67%)',
    'conic-gradient(from 11deg at 52% 48%, rgb(83,68,42) 0 12.5%, rgb(58,49,34) 12.5% 25%, rgb(105,84,45) 25% 37.5%, rgb(67,56,37) 37.5% 50%, rgb(119,92,48) 50% 62.5%, rgb(62,51,35) 62.5% 75%, rgb(91,72,42) 75% 87.5%, rgb(54,46,34) 87.5% 100%)',
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
  px: 0.35,
  transform: 'translate(-50%, -50%) scale(0.82)',
  opacity: 0,
  display: 'grid',
  placeItems: 'center',
  border: '1px solid rgba(237, 212, 138, 0.74)',
  borderRadius: '999px',
  bgcolor: 'rgba(9, 8, 7, 0.82)',
  boxShadow: '0 2px 9px rgba(0,0,0,0.52)',
  fontFamily: '"Cinzel", Georgia, serif',
  fontWeight: 800,
  lineHeight: 1,
  transition: 'opacity 150ms ease-out, transform 180ms cubic-bezier(0.2, 0.9, 0.25, 1.18)',
  '&[data-visible="true"]': {
    opacity: 1,
    transform: 'translate(-50%, -50%) scale(1)',
  },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
  },
};
