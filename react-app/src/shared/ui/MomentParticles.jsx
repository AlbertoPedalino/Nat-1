import { Box } from '@mui/material';
import { OPACITY, UI_COLORS, uiMix } from './colors.js';
import { PARTICLE_GLYPHS, particleLayout } from './momentParticles.js';

// A roll's moment's particles round its bubble (momentParticles.js): its
// glyphs laid out for the throw (`seed`), moving in their mode and drawn in
// their look. They sit over the bubble's edge, take no clicks, and for
// reduced motion there are none. Laid inside the bubble, which must be
// positioned.

// Each mode's frames and how long one particle lives (ms). The travel comes
// from each particle's variables (--dx, --dy, --turn), so the frames are
// written once.
const MODES = Object.freeze({
  // A sparkle's twinkle: popping out, twinkling a few times, fading.
  pop: { ms: 4800, easing: 'ease-in-out', frames: {
    '0%': { opacity: 1, transform: 'scale(0) rotate(-40deg)' },
    '8%': { transform: 'scale(1.3) rotate(8deg)' },
    '15%': { transform: 'scale(1) rotate(0deg)' },
    '30%': { transform: 'scale(0.7) rotate(18deg)' },
    '45%': { transform: 'scale(1.1) rotate(0deg)' },
    '60%': { transform: 'scale(0.75) rotate(-14deg)' },
    '75%': { opacity: 1, transform: 'scale(1) rotate(0deg)' },
    '100%': { opacity: 0, transform: 'scale(0.3) rotate(20deg)' },
  } },
  rise: { ms: 2400, easing: 'ease-out', frames: {
    '0%': { opacity: 0, transform: 'translate(0, 10px) scale(.4)' },
    '15%': { opacity: 1, transform: 'translate(0, 0) scale(1)' },
    '100%': { opacity: 0, transform: 'translate(var(--dx), var(--dy)) scale(.8) rotate(var(--turn))' },
  } },
  fall: { ms: 2200, easing: 'cubic-bezier(.45,0,.9,.6)', frames: {
    '0%': { opacity: 0, transform: 'translate(0, -10px) rotate(0)' },
    '12%': { opacity: 1 },
    '100%': { opacity: 0, transform: 'translate(var(--dx), var(--dy)) rotate(var(--turn))' },
  } },
  fly: { ms: 1600, easing: 'cubic-bezier(.15,.7,.3,1)', frames: {
    '0%': { opacity: 0, transform: 'translate(0, 0) scale(.3)' },
    '10%, 80%': { opacity: 1 },
    '100%': { opacity: 0, transform: 'translate(var(--dx), var(--dy)) scale(1) rotate(var(--turn))' },
  } },
  // Tossed like a coin: out and up, spinning on its edge so its face flashes.
  toss: { ms: 1700, easing: 'cubic-bezier(.2,.6,.4,1)', frames: {
    '0%': { opacity: 0, transform: 'translate(0, 0) scale(.4) rotateY(0)' },
    '10%': { opacity: 1 },
    '50%': { transform: 'translate(calc(var(--dx) * .6), calc(var(--dy) - 20px)) scale(1) rotateY(540deg)' },
    '85%': { opacity: 1 },
    '100%': { opacity: 0, transform: 'translate(var(--dx), calc(var(--dy) + 30px)) scale(.9) rotateY(1080deg)' },
  } },
  ring: { ms: 1500, easing: 'ease-out', frames: {
    '0%': { opacity: OPACITY.veil, transform: 'scale(.3)' },
    '100%': { opacity: 0, transform: 'scale(2.6)' },
  } },
  blink: { ms: 2600, easing: 'ease-in-out', frames: {
    '0%': { opacity: 0, transform: 'scaleY(0)' },
    '14%, 40%, 52%': { opacity: 1, transform: 'scaleY(1)' },
    '46%': { transform: 'scaleY(.08)' },
    '84%': { opacity: 1, transform: 'scaleY(1)' },
    '100%': { opacity: 0, transform: 'scaleY(0)' },
  } },
  glitch: { ms: 1400, easing: 'steps(1)', frames: {
    '0%, 25%, 70%, 100%': { opacity: 0, transform: 'translateX(0)' },
    '10%': { opacity: 1, transform: 'translateX(0)' },
    '35%, 80%': { opacity: 1, transform: 'translateX(var(--dx))' },
    '55%': { opacity: 1, transform: 'translateX(0) scaleX(1.6)' },
  } },
});

// The two swings an orbiting particle rides (left and right, up and down, a
// quarter turn apart) so it stays upright as it circles: the stars over a
// dazed cartoon head. One turn takes ORBIT_MS; they go round ORBIT_TURNS
// times, `reach` px out, fade, and stop: never left turning unseen.
const ORBIT_MS = 900;
const ORBIT_TURNS = 3;
const ORBIT_REACH = Object.freeze({ x: 46, y: 12 });

// How each look paints a glyph: its fill, its line and any filter on it.
function paintOf(look, color) {
  const dark = uiMix(color, UI_COLORS.black, 0.55);
  switch (look) {
    case 'glow': return { fill: color, line: 'none', detail: UI_COLORS.white, filter: `drop-shadow(0 0 3px ${color}) drop-shadow(0 0 7px ${color})` };
    case 'flat': return { fill: color, line: 'none', detail: dark, crisp: true };
    case 'soft': return { fill: color, line: 'none', detail: dark, filter: 'blur(.5px)', opacity: OPACITY.veil };
    // Dark against a dark page: an outline and a halo in the colour carry it.
    case 'silhouette': return { fill: UI_COLORS.surfaceDarkest, line: color, detail: UI_COLORS.surfaceDarkest, filter: `drop-shadow(0 0 2px ${color}) drop-shadow(0 0 5px ${color})` };
    case 'sepia': return { fill: uiMix(color, UI_COLORS.paper, 0.5), line: UI_COLORS.onPaper, detail: UI_COLORS.onPaper };
    case 'gold': return { fill: color, line: dark, detail: dark, filter: `drop-shadow(0 0 3px ${uiMix(color, UI_COLORS.white, 0.4)})` };
    default: return { fill: color, line: UI_COLORS.edge, detail: UI_COLORS.edge };
  }
}

function Glyph({ glyph, color, look }) {
  const shape = PARTICLE_GLYPHS[glyph];
  const paint = paintOf(look, color);
  return (
    <Box
      component="svg"
      viewBox="0 0 24 24"
      sx={{ display: 'block', width: '100%', height: '100%', overflow: 'visible', filter: paint.filter, opacity: paint.opacity }}
      shapeRendering={paint.crisp ? 'crispEdges' : undefined}
    >
      {shape.line ? <path d={shape.line} fill="none" stroke={paint.fill} strokeWidth="2.4" strokeLinecap="round" /> : null}
      {shape.d ? <path d={shape.d} fill={paint.fill} fillRule={shape.evenodd ? 'evenodd' : undefined} stroke={paint.line} strokeWidth="1.4" strokeLinejoin="round" /> : null}
      {shape.detail ? <path d={shape.detail} fill="none" stroke={paint.detail} strokeWidth="1.3" strokeLinecap="round" /> : null}
    </Box>
  );
}

const layerSx = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  zIndex: 2,
  perspective: '400px',
  '@media (prefers-reduced-motion: reduce)': { display: 'none' },
};

// `delay` (ms) holds them back (the home die sees stars only once it lands on
// its 1); `reach` fits an orbit to a bigger head.
export default function MomentParticles({
  glyph, mode, count, size: [least, most], colors, look = 'ink', seed = '', delay = 0, reach = ORBIT_REACH,
}) {
  const layout = particleLayout(mode, count, seed);
  const sizeOf = (index) => least + ((index * 7919) % 11) / 10 * (most - least);
  const colorOf = (index) => UI_COLORS[colors[index % colors.length]];

  if (mode === 'orbit') {
    const swing = (name, axis, far) => ({ [`@keyframes ${name}`]: { from: { transform: `translate${axis}(-${far}px)` }, to: { transform: `translate${axis}(${far}px)` } } });
    return (
      <Box
        aria-hidden
        sx={{
          ...layerSx,
          inset: 'auto',
          left: '50%',
          top: -reach.y - most / 2,
          width: 0,
          height: 0,
          animation: `gbParticleOrbitFade ${ORBIT_MS * ORBIT_TURNS}ms linear ${delay}ms both`,
          '@keyframes gbParticleOrbitFade': { '0%': { opacity: 0 }, '10%, 80%': { opacity: 1 }, '100%': { opacity: 0 } },
        }}
      >
        {layout.map((_, index) => {
          // Each a share of a turn behind the one before.
          const phase = -(ORBIT_MS / count) * index;
          return (
            <Box key={index} sx={{ position: 'absolute', animation: `gbParticleOrbitX${reach.x} ${ORBIT_MS / 2}ms ease-in-out ${delay + phase}ms ${ORBIT_TURNS * 2} alternate both`, ...swing(`gbParticleOrbitX${reach.x}`, 'X', reach.x) }}>
              <Box sx={{ animation: `gbParticleOrbitY${reach.y} ${ORBIT_MS / 2}ms ease-in-out ${delay + phase - ORBIT_MS / 4}ms ${ORBIT_TURNS * 2 + 1} alternate both`, ...swing(`gbParticleOrbitY${reach.y}`, 'Y', reach.y) }}>
                <Box sx={{ width: sizeOf(index), height: sizeOf(index), ml: `${-sizeOf(index) / 2}px`, mt: `${-sizeOf(index) / 2}px`, opacity: index === 1 ? OPACITY.heavy : 1 }}>
                  <Glyph glyph={glyph} color={colorOf(index)} look={look} />
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  }

  const { ms, easing, frames } = MODES[mode];
  const name = `gbParticle${mode[0].toUpperCase()}${mode.slice(1)}`;
  return (
    <Box aria-hidden sx={{ ...layerSx, [`@keyframes ${name}`]: frames }}>
      {layout.map(({ x, y, delay: wait, dx, dy, turn }, index) => {
        const size = mode === 'ring' ? most * 3 : sizeOf(index);
        return (
          <Box
            key={index}
            sx={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              width: size,
              height: size,
              ml: `${-size / 2}px`,
              mt: `${-size / 2}px`,
              '--dx': `${dx.toFixed(0)}px`,
              '--dy': `${dy.toFixed(0)}px`,
              '--turn': `${turn.toFixed(0)}deg`,
              opacity: 0,
              animation: `${name} ${ms}ms ${easing} ${(delay / 1000 + wait).toFixed(2)}s both`,
            }}
          >
            <Glyph glyph={glyph} color={colorOf(index)} look={look} />
          </Box>
        );
      })}
    </Box>
  );
}
