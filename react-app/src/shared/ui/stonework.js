import { OPACITY } from './colors.js';
import { STROKE_ENDS, inkStroke, sketch } from './handDrawing.js';

// Stone, as the hand-drawing kit draws it (handDrawing.js: Rough.js sketches,
// perfect-freehand brush strokes): what the gothic's headstones are made of,
// wherever one stands (the ability scores, abilityDrawing.js; a roll's toast,
// toastDrawing.js). Pieces coloured by the palette's role names.


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
    { tag: 'path', d, fill: 'edge', transform: 'translate(4 4)' },
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
