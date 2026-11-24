import { seededRandom } from '../seededRandom.js';
import { polygonPath, starCorners } from './handDrawing.js';

// The particles a roll's moment throws round its bubble (MomentParticles.jsx,
// shapes.js moments.<moment>.effect): a `glyph`, the
// `mode` they move in, how many (`count`), their `size` ([least, most] px),
// their `colors` (palette roles, in turn) and their `look`. A new effect is
// one entry here (a glyph, a mode or a look) and data in shapes.js.

const dot = (x, y, r) => `M${x} ${y - r}a${r} ${r} 0 1 0 .01 0z`;
const VIRUS_KNOBS = [[12, 3], [19.8, 7.5], [19.8, 16.5], [12, 21], [4.2, 16.5], [4.2, 7.5]];

// Each glyph in a 24-unit box, the one drawing of it in the app (a gem relit
// sparkles with `sparkle`, the home die sees `star`s): `d` its filled shape
// (`evenodd` where it has holes), `line` a shape only drawn as a line,
// `detail` lines drawn over it a shade darker (a coin's face, a virus's
// stems).
export const PARTICLE_GLYPHS = Object.freeze({
  sparkle: { d: 'M12 1C13 8 16 11 23 12C16 13 13 16 12 23C11 16 8 13 1 12C8 11 11 8 12 1Z' },
  star: { d: 'M12 2.5l2.8 6.2 6.7.6-5.1 4.4 1.6 6.6L12 16.9l-6 3.4 1.6-6.6-5.1-4.4 6.7-.6z' },
  pow: { d: polygonPath(starCorners({ points: 8, reach: 11.5, inner: 5, centre: [12, 12] })) },
  bat: { d: 'M12 9c1-2 2-3 2-3l1 2c2-2 5-3 8-2-2 1-3 3-3 6-2-1-4 0-5 2-1-1-2-1-3-1s-2 0-3 1c-1-2-3-3-5-2 0-3-1-5-3-6 3-1 6 0 8 2l1-2s1 1 2 3z' },
  drop: { d: 'M12 2C10 8 6 11 6 15a6 6 0 0 0 12 0c0-4-4-7-6-13z' },
  ring: { line: 'M12 3a9 9 0 1 0 0.01 0z' },
  spark: { d: 'M11 1h2l1 9 9 1v2l-9 1-1 9h-2l-1-9-9-1v-2l9-1z' },
  casing: { d: 'M9 3h6l1 4v14H8V7z', detail: 'M8 9h8' },
  puff: { d: 'M7 17a4 4 0 0 1 0-8 5 5 0 0 1 9-2 4 4 0 0 1 2 8 4 4 0 0 1-5 3 4 4 0 0 1-6-1z' },
  // A gold doubloon: a disc, its rim and a cross struck on it.
  doubloon: { d: dot(12, 12, 10), detail: `${dot(12, 12, 7)} M12 7.5v9 M7.5 12h9` },
  bubble: { line: dot(12, 12, 8) },
  nut: { d: `M12 2l8.7 5v10L12 22l-8.7-5V7z${dot(12, 12, 3.5)}`, evenodd: true },
  ember: { d: 'M12 2l4 10-4 10-4-10z' },
  rock: { d: 'M5 9l5-5 7 2 4 6-3 7-8 2-6-5z' },
  petal: { d: 'M12 2c5 4 6 12 0 20-6-8-5-16 0-20z' },
  leaf: { d: 'M4 20C4 9 11 3 21 3c0 10-6 17-17 17z', detail: 'M4 20L14 10' },
  eye: { d: `M1 12C6 5 18 5 23 12 18 19 6 19 1 12z${dot(12, 12, 4)}`, evenodd: true },
  pixel: { d: 'M6 6h12v12H6z' },
  pixelCoin: { d: 'M8 2h8v2h2v2h2v12h-2v2h-2v2H8v-2H6v-2H4V6h2V4h2zM10 6v12h4V6z', evenodd: true },
  shard: { d: 'M12 1l6 9-4 13-9-9z' },
  // A virus: a body and six knobbed stems.
  virus: { d: `${dot(12, 12, 4.6)}${VIRUS_KNOBS.map(([x, y]) => dot(x, y, 1.8)).join('')}`, detail: VIRUS_KNOBS.map(([x, y]) => `M12 12L${x} ${y}`).join('') },
});

// The ways particles move (MomentParticles.jsx holds their frames): popping
// up round the edge and twinkling, rising, falling, flying out, tossed
// spinning (a coin), rings spreading, eyes blinking open, or circling over
// the bubble (seeing stars).
export const PARTICLE_MODES = Object.freeze(['pop', 'rise', 'fall', 'fly', 'toss', 'ring', 'blink', 'orbit']);

// How a particle is drawn: inked like the comic, lit (no ink, a glow), flat
// (hard pixels), soft (a little blurred), a dark silhouette with a halo, or
// struck gold (a coin: its face a shade darker).
export const PARTICLE_LOOKS = Object.freeze(['ink', 'glow', 'flat', 'soft', 'silhouette', 'gold']);

// Where the popping particles stand round the bubble (% of it), most of them
// along the top and the left: the dice toast sits in the screen's lower
// right corner, where its other sides run off the screen.
const EDGE_SPOTS = [[-6, 8], [14, -14], [38, -20], [64, -12], [88, -18], [-9, 52], [-4, 92], [103, 40], [104, 80], [50, 112]];

// Each particle's place and drift for a throw (`seed`): `x`, `y` (% of the
// bubble), `delay` (s), `dx`, `dy` (px) and `turn` (deg) where it travels.
export function particleLayout(mode, count, seed) {
  const random = seededRandom(`particles:${mode}:${seed}`);
  return Array.from({ length: count }, (_, index) => {
    if (mode === 'pop' || mode === 'blink') {
      const [x, y] = EDGE_SPOTS[(mode === 'blink' ? index * 3 : index) % EDGE_SPOTS.length];
      return { x, y, delay: index * (mode === 'blink' ? 0.18 : 0.12) + random() * 0.1, dx: 0, dy: 0, turn: 0 };
    }
    if (mode === 'rise') return { x: 8 + random() * 84, y: 70 + random() * 30, delay: random() * 0.9, dx: (random() - 0.5) * 50, dy: -90, turn: (random() - 0.5) * 120 };
    if (mode === 'fall') return { x: 4 + random() * 92, y: -8 + random() * 20, delay: random() * 0.9, dx: (random() - 0.5) * 60, dy: 110, turn: (random() - 0.5) * 400 };
    if (mode === 'fly' || mode === 'toss') {
      const angle = random() * Math.PI * 2;
      const reach = 70 + random() * 50;
      return { x: 50, y: 62, delay: random() * 0.25, dx: Math.cos(angle) * reach, dy: Math.sin(angle) * reach * 0.8 - (mode === 'toss' ? 30 : 0), turn: (random() - 0.5) * 720 };
    }
    if (mode === 'ring') return { x: 50, y: 62, delay: index * 0.35, dx: 0, dy: 0, turn: 0 };
    // orbit: spread evenly round the circle they ride.
    return { x: 50, y: 0, delay: (-index * 0.9) / count, dx: 0, dy: 0, turn: 0 };
  });
}
