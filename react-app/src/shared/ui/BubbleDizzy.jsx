import { Box } from '@mui/material';
import { UI_COLORS, OPACITY } from './colors.js';

// A natural 1 leaves its speech bubble seeing stars: the cartoon "bonk on the
// head", three inked stars circling above it for a few turns before they fade.
// Each star rides an ellipse made of two swings — one left and right, one up
// and down, a quarter turn apart — so it stays upright as it goes round, the
// way the stars over a dazed cartoon head do. It takes no clicks; for reduced
// motion there are no stars. `delay` holds them back (the home logo's die
// sees stars only once it lands on its 1); `reachX`, `reachY` and `starSize`
// fit the orbit to a bigger head.
const ORBIT_MS = 900;
const TURNS = 3;
const STARS = 3;
const REACH_X = 46;
const REACH_Y = 12;
const STAR_SIZE = 24;

// A five-pointed star in a 24-unit box.
const STAR_PATH = 'M12 2.5l2.8 6.2 6.7.6-5.1 4.4 1.6 6.6L12 16.9l-6 3.4 1.6-6.6-5.1-4.4 6.7-.6z';

const swing = (name, axis, reach) => ({
  [`@keyframes ${name}`]: {
    from: { transform: `translate${axis}(${-reach}px)` },
    to: { transform: `translate${axis}(${reach}px)` },
  },
});

export default function BubbleDizzy({ delay = 0, reachX = REACH_X, reachY = REACH_Y, starSize = STAR_SIZE }) {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        left: '50%',
        top: -reachY - starSize / 2,
        width: 0,
        height: 0,
        pointerEvents: 'none',
        zIndex: 2,
        animation: `gbDizzyFade ${ORBIT_MS * TURNS}ms linear ${delay}ms both`,
        '@keyframes gbDizzyFade': {
          '0%': { opacity: 0 },
          '10%, 80%': { opacity: 1 },
          '100%': { opacity: 0 },
        },
        '@media (prefers-reduced-motion: reduce)': { display: 'none' },
      }}
    >
      {Array.from({ length: STARS }, (_, index) => {
        // Each star a third of a turn behind the one before.
        const phase = -(ORBIT_MS / STARS) * index;
        return (
          <Box
            key={index}
            sx={{
              position: 'absolute',
              animation: `gbDizzyX${reachX} ${ORBIT_MS / 2}ms ease-in-out ${phase}ms infinite alternate`,
              ...swing(`gbDizzyX${reachX}`, 'X', reachX),
            }}
          >
            <Box
              sx={{
                animation: `gbDizzyY${reachY} ${ORBIT_MS / 2}ms ease-in-out ${phase - ORBIT_MS / 4}ms infinite alternate`,
                ...swing(`gbDizzyY${reachY}`, 'Y', reachY),
              }}
            >
              <Box
                component="svg"
                viewBox="0 0 24 24"
                sx={{
                  display: 'block',
                  width: starSize,
                  height: starSize,
                  ml: `${-starSize / 2}px`,
                  mt: `${-starSize / 2}px`,
                  opacity: index === 1 ? OPACITY.heavy : 1,
                }}
              >
                <path d={STAR_PATH} fill={UI_COLORS.accent} stroke={UI_COLORS.edge} strokeWidth={2} strokeLinejoin="round" />
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
