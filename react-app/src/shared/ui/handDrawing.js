import rough from 'roughjs';
import { getStroke } from 'perfect-freehand';
import { roundToTenth } from '../numbers.js';

// The kit every hand-drawn part of a panel is drawn with (panelGrip.js,
// panelBanner.js): Rough.js's sketchy shapes and perfect-freehand's brush
// strokes, worked out as plain data a page draws with HandDrawnSvg.jsx.
//
// A drawing is a list of pieces: `{ tag, ...geometry, fill, stroke,
// strokeWidth, opacity, blur }`, where `tag` is an SVG element ('path',
// 'circle', 'rect', 'line', 'polyline') and `fill` / `stroke` name a role of
// the palette (colors.js UI_COLORS) or 'none'; `blur` softens it to a glow.
// A group, `{ tag: 'g', children, clip, transform, crisp }`, holds pieces
// cut to the path `clip`, moved by `transform`, drawn on the pixel grid
// where `crisp`. The same input draws the same pieces: every random choice
// comes from a seed (seededRandom.js).

export const unit = ([x, y]) => {
  const length = Math.hypot(x, y) || 1;
  return [x / length, y / length];
};

// A path's numbers to a tenth of a px: what is drawn is unchanged, the page
// carries a third of the text.
const tidy = (d) => d.replace(/-?\d+\.\d+(e-?\d+)?/g, (number) => String(roundToTenth(Number(number))));

// A closed path through points.
export const polygonPath = (points) => `M${points.map(([x, y]) => `${roundToTenth(x)} ${roundToTenth(y)}`).join(' L')} Z`;

// A brush stroke along `points` ([x, y, pressure]), `size` px at full
// pressure, as a closed, smoothed outline (perfect-freehand).
const BRUSH = Object.freeze({
  thinning: 0.9,
  smoothing: 0.6,
  streamline: 0.2,
  simulatePressure: false,
  start: { taper: 0, cap: true },
  end: { taper: 0, cap: true },
});
export function brushPath(points, size, options = {}) {
  const stroke = getStroke(points, { ...BRUSH, size, ...options });
  const d = stroke.reduce((acc, [x0, y0], i, all) => {
    const [x1, y1] = all[(i + 1) % all.length];
    acc.push(roundToTenth(x0), roundToTenth(y0), roundToTenth((x0 + x1) / 2), roundToTenth((y0 + y1) / 2));
    return acc;
  }, ['M', roundToTenth(stroke[0][0]), roundToTenth(stroke[0][1]), 'Q']);
  d.push('Z');
  return d.join(' ');
}

// The bounds of a brush stroke's outline, for what must know how far it reaches.
export function brushBounds(points, size, options = {}) {
  const stroke = getStroke(points, { ...BRUSH, size, ...options });
  const xs = stroke.map(([x]) => x);
  const ys = stroke.map(([, y]) => y);
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
}

const generator = rough.generator();
// A Rough.js shape (`shape` one of its generator's: 'path', 'line',
// 'rectangle', 'ellipse', 'circle', 'polygon', 'linearPath', 'curve', 'arc'),
// its colours as role names, as pieces. `opacity` fades every piece of it.
export function sketch(shape, ...args) {
  const options = args[args.length - 1];
  const { opacity, ...drawing } = options;
  return generator.toPaths(generator[shape](...args.slice(0, -1), { stroke: 'none', ...drawing }))
    .map(({ d, fill, stroke, strokeWidth }) => ({
      tag: 'path', d: tidy(d), fill: fill || 'none', stroke: stroke || 'none', strokeWidth, opacity,
    }));
}

// A torn edge from (x0, y) to (x1, y): a point every `step` px, each up to
// `amp` px off the line; its two ends on it.
export function raggedEdge(x0, x1, y, amp, step, random) {
  const count = Math.max(2, Math.round(Math.abs(x1 - x0) / step));
  return Array.from({ length: count + 1 }, (_, i) => [
    x0 + ((x1 - x0) * i) / count,
    y + (i === 0 || i === count ? 0 : (random() - 0.5) * 2 * amp),
  ]);
}

// The worked-out drawings of one kind, kept per size: the same panel size
// draws the same, so it is worked out once.
export function drawingCache(draw, limit = 200) {
  const drawn = new Map();
  return (...key) => {
    const id = key.join(' ');
    if (!drawn.has(id)) {
      if (drawn.size > limit) drawn.clear();
      drawn.set(id, draw(...key));
    }
    return drawn.get(id);
  };
}
