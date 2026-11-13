import { Box } from '@mui/material';
import { UI_COLORS } from './colors.js';

// A natural 20 makes its speech bubble sparkle: four-pointed stars inked like
// everything else pop out all round its edge, one after another, twinkle a
// few times and fade, the magic counterpart of the stars a natural 1 sees
// (BubbleDizzy). They sit outside the bubble's edge, take no clicks, and for
// reduced motion there are none. Laid inside the bubble, which must be
// positioned.
const LIFE_MS = 4800;

// A four-pointed sparkle in a 24-unit box: every sparkle of the app (a
// natural 20's bubble, a gem relit: GemPip).
export const SPARKLE_PATH = 'M12 1C13 8 16 11 23 12C16 13 13 16 12 23C11 16 8 13 1 12C8 11 11 8 12 1Z';

// Where each sparkle stands round the bubble (`left`, `top` as % of it, the
// sparkle centred there), its size, colour and how long after the first it
// pops. Most stand along the top and the left: the dice toast sits in the
// screen's lower right corner, where its other sides run off the screen.
const SPARKLES = [
  { left: -6, top: 8, size: 30, color: UI_COLORS.accentHighlight, delay: 0 },
  { left: 14, top: -14, size: 20, color: UI_COLORS.spell, delay: 160 },
  { left: 38, top: -20, size: 26, color: UI_COLORS.accent, delay: 60 },
  { left: 64, top: -12, size: 18, color: UI_COLORS.accentHighlight, delay: 260 },
  { left: 88, top: -18, size: 28, color: UI_COLORS.spell, delay: 120 },
  { left: -9, top: 52, size: 20, color: UI_COLORS.spell, delay: 220 },
  { left: -4, top: 92, size: 24, color: UI_COLORS.accent, delay: 320 },
  { left: 103, top: 40, size: 22, color: UI_COLORS.accentHighlight, delay: 380 },
];

export default function BubbleSparkles() {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 2,
        '@media (prefers-reduced-motion: reduce)': { display: 'none' },
      }}
    >
      {SPARKLES.map(({ left, top, size, color, delay }, index) => (
        <Box
          key={index}
          component="svg"
          viewBox="0 0 24 24"
          sx={{
            position: 'absolute',
            left: `${left}%`,
            top: `${top}%`,
            width: size,
            height: size,
            ml: `${-size / 2}px`,
            mt: `${-size / 2}px`,
            display: 'block',
            overflow: 'visible',
            animation: `gbSparkle ${LIFE_MS}ms ease-in-out ${delay}ms both`,
            '@keyframes gbSparkle': {
              '0%': { opacity: 1, transform: 'scale(0) rotate(-40deg)' },
              '8%': { transform: 'scale(1.3) rotate(8deg)' },
              '15%': { transform: 'scale(1) rotate(0deg)' },
              '30%': { transform: 'scale(0.7) rotate(18deg)' },
              '45%': { transform: 'scale(1.1) rotate(0deg)' },
              '60%': { transform: 'scale(0.75) rotate(-14deg)' },
              '75%': { opacity: 1, transform: 'scale(1) rotate(0deg)' },
              '100%': { opacity: 0, transform: 'scale(0.3) rotate(20deg)' },
            },
          }}
        >
          <path d={SPARKLE_PATH} fill={color} stroke={UI_COLORS.edge} strokeWidth={2.2} strokeLinejoin="round" />
        </Box>
      ))}
    </Box>
  );
}
