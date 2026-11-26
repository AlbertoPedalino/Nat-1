import rough from 'roughjs';
import { getStroke } from 'perfect-freehand';
import { roundToTenth } from '../numbers.js';
import { OPACITY } from './colors.js';

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

// The outline of a box `w` by `h` px, its corner at (x, y).
export const boxPath = (w, h, x = 0, y = 0) => `M${x} ${y} H${x + w} V${y + h} H${x} Z`;

// The outline of a box `w` by `h` px with corners rounded `r` px, its corner at (x, y).
export const roundedBoxPath = (w, h, r, x = 0, y = 0) => `M${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} V${y + r} Q${x} ${y} ${x + r} ${y} Z`;

// A closed path through points.
export const polygonPath = (points) => `M${points.map(([x, y]) => `${roundToTenth(x)} ${roundToTenth(y)}`).join(' L')} Z`;

// A star's corners: `points` tips round `centre`, reaching `reach` (one for
// all, or one per tip), notched at `inner`, each tip leaning `lean` degrees,
// the first at `rotate` degrees, squashed to `squash` of its height (a roll's
// burst, a particle's glyph).
export function starCorners({ points, reach, inner, lean = 0, rotate = -90, centre: [cx, cy] = [50, 50], squash = 1 }) {
  const pick = (value, index) => (Array.isArray(value) ? value[index % value.length] : value);
  const at = (length, degrees) => [cx + length * Math.cos((degrees * Math.PI) / 180), cy + length * squash * Math.sin((degrees * Math.PI) / 180)];
  return Array.from({ length: points }, (_, index) => {
    const angle = rotate + (index * 360) / points;
    return [at(pick(reach, index), angle + pick(lean, index)), at(pick(inner, index), angle + 180 / points)];
  }).flat();
}

// The points of a crescent: inside the circle `outer` ([x, y, r]), outside
// `bite`, its two arcs met where the circles cross, each in `steps` steps (an
// astral banner's moons, a roll's eclipse).
export function crescentPoints([ox, oy, or], [bx, by, br], steps = 24) {
  const apart = Math.hypot(bx - ox, by - oy);
  const along = (or * or - br * br + apart * apart) / (2 * apart);
  const half = Math.sqrt(Math.max(0, or * or - along * along));
  const [ux, uy] = [(bx - ox) / apart, (by - oy) / apart];
  const meet = [ox + ux * along, oy + uy * along];
  const ends = [[meet[0] - uy * half, meet[1] + ux * half], [meet[0] + uy * half, meet[1] - ux * half]];
  const arc = ([cx, cy, r], from, to, keep) => {
    const a0 = Math.atan2(from[1] - cy, from[0] - cx);
    let sweep = Math.atan2(to[1] - cy, to[0] - cx) - a0;
    sweep = ((sweep % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const middle = a0 + sweep / 2;
    if (!keep([cx + Math.cos(middle) * r, cy + Math.sin(middle) * r])) sweep -= Math.PI * 2;
    return Array.from({ length: steps + 1 }, (_, i) => [cx + Math.cos(a0 + (sweep * i) / steps) * r, cy + Math.sin(a0 + (sweep * i) / steps) * r]);
  };
  const outside = ([x, y]) => Math.hypot(x - bx, y - by) > br;
  const inside = ([x, y]) => Math.hypot(x - ox, y - oy) < or;
  return [...arc([ox, oy, or], ends[0], ends[1], outside), ...arc([bx, by, br], ends[1], ends[0], inside).slice(1, -1)];
}

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

// A run from `from` to `to` ([x, y] each) sagging `drop` px at its middle, in
// `steps` steps: a thread between two pins, a wire between two posts.
export const sagPoints = ([x1, y1], [x2, y2], drop, steps = 10) => Array.from({ length: steps + 1 }, (_, i) => {
  const u = i / steps;
  return [x1 + (x2 - x1) * u, y1 + (y2 - y1) * u + Math.sin(u * Math.PI) * drop];
});

// A run of points with a point every `step` px along it, for what is laid
// along a run at even paces (a wire's twist, its barbs).
export function resampled(points, step) {
  const run = points.slice(0, -1).flatMap(([x1, y1], i) => {
    const [x2, y2] = points[i + 1];
    const count = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / step));
    return Array.from({ length: count }, (_, k) => [x1 + ((x2 - x1) * k) / count, y1 + ((y2 - y1) * k) / count]);
  });
  return [...run, points[points.length - 1]];
}

// How a brush stroke ends: thinning to nothing at both ends (`tapered`), cut
// square at both (`blunt`), or square where it starts and thinning to its tip
// (`pointed`: a stem, a feather).
export const STROKE_ENDS = Object.freeze({
  tapered: Object.freeze({ start: { taper: true, cap: true }, end: { taper: true, cap: true } }),
  blunt: Object.freeze({ start: { taper: 0, cap: true }, end: { taper: 0, cap: true } }),
  pointed: Object.freeze({ start: { taper: 0, cap: true }, end: { taper: true, cap: true } }),
});

// A brush stroke as a piece, in `fill` (a role): tapered unless told. In ink
// (`inkStroke`), what a drawing is marked with: a crack, a cross, a seal's
// mark.
export const brushStroke = (points, size, fill, options = STROKE_ENDS.tapered) => ({ tag: 'path', d: brushPath(points, size, { thinning: 0.85, ...options }), fill });
export const inkStroke = (points, size, options) => brushStroke(points, size, 'edge', options);

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

// The solid shadow under what is drawn in ink (a stone, a clod of earth, a
// strip of parchment): its outline `d` again, in the ink, dropped down and to
// the right.
export const solidShadow = (d) => ({ tag: 'path', d, fill: 'edge', transform: 'translate(4 4)' });

// The soft shadow under what is lit rather than drawn (a sheet of paper, a
// plate of steel, a lit banner): its outline `d` in black, blurred `blur` px
// and dropped as far straight under it (or moved by `shift`, [x, y] px), at
// `opacity`. What lifts it off the panel where no ink does.
export function softShadow(d, { blur = 3, opacity = OPACITY.strong, shift = [0, blur] } = {}) {
  const moved = `translate(${shift[0]} ${shift[1]})`;
  return { tag: 'path', d, fill: 'black', blur, opacity, transform: moved };
}

// The same shadow with no blur, close under what lies flat on the page (a
// tag, a sheet of iron, a belt): a blur is the dearest thing to paint, again
// wherever a scroll brings it into view, and many of them stuttered the scroll.
export const flatShadow = (d, { opacity = OPACITY.strong, shift = [1, 2] } = {}) => softShadow(d, { blur: 0, opacity, shift });

// A drawing's pieces with the box they are seen through: the w by h box they
// were drawn to and `reach` px past it, for a shadow and the sketch's wander.
export function drawingBox(pieces, w, h, reach = 6) {
  return { pieces, box: { left: -reach, top: -reach, width: w + reach * 2, height: h + reach * 2 } };
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
