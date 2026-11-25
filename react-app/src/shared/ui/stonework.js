import { OPACITY } from './colors.js';
import { STROKE_ENDS, inkStroke, polygonPath, sketch } from './handDrawing.js';
import { seededRandom } from '../seededRandom.js';

// Stone, as the hand-drawing kit draws it (handDrawing.js: Rough.js sketches,
// perfect-freehand brush strokes): what the gothic's headstones are made of,
// wherever one stands (the ability scores, abilityDrawing.js; a roll's toast,
// toastDrawing.js), and the earth a row of them is set in. Pieces coloured by
// the palette's role names.


// The solid shadow under what is drawn here, its outline `d` dropped down
// and to the right.
const solidShadow = (d) => ({ tag: 'path', d, fill: 'edge', transform: 'translate(4 4)' });

// A stone's cut, in a box w by h: a tall arch, a low one, squared shoulders.
const CUTS = Object.freeze({
  arch: (w, h) => `M0 ${h} V${w * 0.5} A${w / 2} ${w * 0.5} 0 0 1 ${w} ${w * 0.5} V${h} Z`,
  low: (w, h) => `M0 ${h} V${w * 0.3} A${w / 2} ${w * 0.3} 0 0 1 ${w} ${w * 0.3} V${h} Z`,
  square: (w, h) => `M0 ${h} V12 Q0 0 12 0 H${w - 12} Q${w} 0 ${w} 12 V${h} Z`,
});

// A stone w by h, cut as `cut`: its solid shadow, its sketched outline, its
// hatched shade, a border carved inside it.
export function stonePieces(w, h, cut, seed) {
  const d = CUTS[cut](w, h);
  // The carved border: the stone's own outline, drawn again a little smaller
  // inside it (worked out once, as the drawing is).
  const inset = `translate(${w * 0.07} ${h * 0.045}) scale(0.86 0.93)`;
  return [
    solidShadow(d),
    ...sketch('path', d, { seed, roughness: 0.9, bowing: 0.7, stroke: 'edge', strokeWidth: 2.4, fill: 'outline', fillStyle: 'solid' }),
    ...sketch('path', d, { seed: seed + 1, roughness: 0.7, fill: 'edge', fillStyle: 'hachure', hachureAngle: -38, hachureGap: 7, fillWeight: 1.1, opacity: OPACITY.shade }),
    {
      tag: 'g',
      transform: inset,
      opacity: OPACITY.strong,
      children: sketch('path', d, { seed: seed + 2, roughness: 0.6, stroke: 'edge', strokeWidth: 1.3 }),
    },
  ];
}

// A cross about (cx, cy), `s` px to its arm: two brush strokes.
export function crossPieces(cx, cy, s) {
  return [
    inkStroke([[cx, cy - s, 0.5], [cx, cy - s * 0.2, 0.9], [cx, cy + s * 1.2, 0.5]], s * 0.5, { start: { taper: 0, cap: true }, end: { taper: s, cap: true } }),
    inkStroke([[cx - s * 0.75, cy - s * 0.3, 0.6], [cx, cy - s * 0.32, 0.9], [cx + s * 0.75, cy - s * 0.3, 0.6]], s * 0.45, STROKE_ENDS.blunt),
  ];
}

// A skull about (cx, cy), `s` px to its side: sketched, its eyes the stone.
export function skullPieces(cx, cy, s, seed) {
  return [
    ...sketch('circle', cx, cy + s * 0.3, s * 1.7, { seed, roughness: 0.7, stroke: 'edge', strokeWidth: 1.2, fill: 'edge', fillStyle: 'solid' }),
    ...sketch('rectangle', cx - s * 0.42, cy + s * 0.8, s * 0.84, s * 0.6, { seed: seed + 1, roughness: 0.6, stroke: 'edge', fill: 'edge', fillStyle: 'solid' }),
    ...[-0.36, 0.36].flatMap((side) => sketch('circle', cx + side * s, cy + s * 0.34, s * 0.48, { seed: seed + 2, roughness: 0.4, fill: 'outline', fillStyle: 'solid' })),
  ];
}

// A crack: one brush stroke from `from` on, kinked at every step, a branch
// off it.
export function crackPieces(from, steps, size = 3) {
  let [x, y] = from;
  const points = [[x, y, 0.2]];
  steps.forEach(([dx, dy], i) => { x += dx; y += dy; points.push([x, y, Math.max(0.15, 0.9 - i * 0.12)]); });
  const [bx, by] = points[Math.min(2, points.length - 1)];
  return [inkStroke(points, size), inkStroke([[bx, by, 0.6], [bx + 7, by + 2, 0.4], [bx + 12, by + 8, 0.1]], size * 0.7)];
}

// The earth a row of stones is set in: a clod `thick` px deep whose surface
// runs through `sills` ([x, y] each, left to right: where it stands against
// each stone, so it rises and falls with them and covers each as much) and
// `past` px beyond the first and the last, thinning to its middle line at
// each end; its solid shadow, its sketched outline, its hatched shade, a few
// pebbles lying in it.
export function earthPieces(sills, thick, past, seed) {
  const random = seededRandom(`earth-${seed}`);
  const [left, right] = [sills[0][0] - past, sills[sills.length - 1][0] + past];
  const steps = Math.max(4, Math.round((right - left) / 18));
  // Its surface at x: straight from one sill to the next, level past the
  // first and the last.
  const level = (x) => {
    const next = sills.findIndex(([sill]) => sill >= x);
    if (next <= 0) return sills[next === 0 ? 0 : sills.length - 1][1];
    const [[x1, y1], [x2, y2]] = [sills[next - 1], sills[next]];
    return y1 + ((y2 - y1) * (x - x1)) / (x2 - x1 || 1);
  };
  // How much of its depth the clod has `u` of the way along: none at its
  // ends, all of it a step in.
  const heap = (u) => Math.min(1, Math.sin(u * Math.PI) * 4);
  const at = (u) => left + (right - left) * u;
  // A point of its outline `u` of the way along: on its surface (`side` -1)
  // or its underside (1), a little uneven.
  const edge = (u, side) => [at(u), level(at(u)) + thick / 2 + side * (thick / 2 + random() * 2) * heap(u)];
  const surface = Array.from({ length: steps + 1 }, (_, i) => edge(i / steps, -1));
  const under = Array.from({ length: steps - 1 }, (_, i) => edge(1 - (i + 1) / steps, 1));
  const clod = [...surface, ...under, surface[0]];
  const count = Math.round((right - left) / 70);
  const pebbles = Array.from({ length: count }, (_, i) => {
    const x = at((i + 0.3 + random() * 0.5) / count);
    return sketch('ellipse', x, level(x) + thick * (0.55 + random() * 0.2), 4 + random() * 3, 3 + random(), {
      seed: seed + 10 + i, roughness: 0.7, stroke: 'edge', strokeWidth: 1, fill: 'outline', fillStyle: 'solid',
    });
  }).flat();
  return [
    solidShadow(polygonPath(clod)),
    ...sketch('curve', clod, { seed, roughness: 1, bowing: 0.6, stroke: 'edge', strokeWidth: 2.2, fill: 'onPaper', fillStyle: 'solid' }),
    ...sketch('curve', clod, { seed: seed + 1, roughness: 0.8, fill: 'edge', fillStyle: 'hachure', hachureAngle: 24, hachureGap: 6, fillWeight: 1, opacity: OPACITY.line }),
    ...pebbles,
  ];
}
