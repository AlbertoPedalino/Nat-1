// Areas of effect drawn on a scene: a circle, square, cone or line of a set
// size in feet, outlined or filled, optionally labelled and optionally burning,
// poisoned, frozen… An area is a drawing like any other mark (same table, same
// undo, eraser and realtime), told apart by its `area` description.
//
// Geometry lives in the drawing's two points, in cells: the origin and a tip.
// The distance between them is the reach — a circle's radius, half a square's
// side, a cone's or a line's length — and the direction from one to the other
// is where a cone or a line points, and which way a square is turned. A line's
// width is the one number the points cannot carry, so it rides in the
// description as `breadth` (cells).
//
// Squares placed before they could be turned stored a direction too (the way
// they happened to be dragged) and were drawn square to the map regardless:
// only a square marked `turned` follows its direction, so those stay as they
// were.

import { VTT_COLORS } from '../colors.js';
import { FEET_PER_CELL, formatFeet } from './measure.js';

export const AREA_SHAPES = Object.freeze(['circle', 'square', 'cone', 'line']);

// Order matters: the effect shader picks its look by position in this list.
export const AREA_EFFECTS = Object.freeze([
  { key: 'fire', label: 'Fire', color: VTT_COLORS.areaFire },
  { key: 'poison', label: 'Poison', color: VTT_COLORS.areaPoison },
  { key: 'cold', label: 'Cold', color: VTT_COLORS.areaCold },
  { key: 'acid', label: 'Acid', color: VTT_COLORS.areaAcid },
  { key: 'lightning', label: 'Lightning', color: VTT_COLORS.areaLightning },
  { key: 'necrotic', label: 'Necrotic', color: VTT_COLORS.areaNecrotic },
  { key: 'radiant', label: 'Radiant', color: VTT_COLORS.areaRadiant },
  { key: 'darkness', label: 'Darkness', color: VTT_COLORS.areaDarkness },
  { key: 'thorns', label: 'Thorns & roots', color: VTT_COLORS.areaThorns },
]);

const EFFECT_KEYS = AREA_EFFECTS.map((effect) => effect.key);

// What the area tool starts with. The size is not chosen here: it is dragged
// out on the map, a square at a time.
export const DEFAULT_AREA_OPTIONS = Object.freeze({
  shape: 'circle',
  filled: true,
  effect: null,
  breadthFt: 5,
  label: '',
});

// The tan of a 5e cone's half-angle: as wide at the far end as it is long.
export const CONE_SPREAD = 0.5;

// A square turns in steps of this many degrees: free enough to lie along a
// crooked corridor, and square to the map again without a steady hand.
export const SQUARE_TURN_STEP_DEG = 15;

// The direction a square dragged toward (dx, dy) faces, in radians, snapped to
// SQUARE_TURN_STEP_DEG. Shared by the area tool and the ruler.
export function squareTurn(dx, dy) {
  if (!Math.hypot(dx, dy)) return 0;
  const step = (SQUARE_TURN_STEP_DEG * Math.PI) / 180;
  return Math.round(Math.atan2(dy, dx) / step) * step;
}

const MAX_REACH_CELLS = 200;

function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function areaEffect(key) {
  return AREA_EFFECTS.find((effect) => effect.key === key) || null;
}

// Whatever came out of the database or a realtime payload, reduced to a
// description the canvas can trust — or null for an ordinary stroke.
export function normalizeArea(raw) {
  if (!raw || typeof raw !== 'object' || !AREA_SHAPES.includes(raw.shape)) return null;
  const area = {
    shape: raw.shape,
    filled: Boolean(raw.filled),
    effect: EFFECT_KEYS.includes(raw.effect) ? raw.effect : null,
  };
  if (raw.shape === 'line') {
    area.breadth = Math.min(MAX_REACH_CELLS, Math.max(0.1, numberOr(raw.breadth, 1)));
  }
  if (raw.shape === 'square' && raw.turned) area.turned = true;
  return area;
}

// Feet as typed in the panel, turned into cells on this map's scale.
export function feetToCells(feet, feetPerCell = FEET_PER_CELL) {
  const perCell = Number(feetPerCell) > 0 ? Number(feetPerCell) : FEET_PER_CELL;
  return Math.max(0, numberOr(feet, 0)) / perCell;
}

// On squares an origin lands on a grid line crossing or a square's centre:
// that is where a 5e sphere or cube is placed, and anything in between only
// leaves the edge cutting creatures in half. Hexes have no such points worth
// snapping to, so the origin stays where it was put.
export function snapAreaOrigin(point, { hex = false } = {}) {
  const x = numberOr(point?.x, 0);
  const y = numberOr(point?.y, 0);
  if (hex) return { x, y };
  return { x: Math.round(x * 2) / 2, y: Math.round(y * 2) / 2 };
}

// The two stored points for an area of `sizeCells` placed at `origin` and
// pointing toward `toward`. A square's size is its side, so its reach is half.
export function buildAreaPoints(shape, origin, toward, sizeCells) {
  const size = Math.min(MAX_REACH_CELLS, Math.max(0.1, numberOr(sizeCells, 1)));
  const reach = shape === 'square' ? size / 2 : size;
  const dx = numberOr(toward?.x, 0) - numberOr(origin?.x, 0);
  const dy = numberOr(toward?.y, 0) - numberOr(origin?.y, 0);
  const length = Math.hypot(dx, dy);
  // A click that never moved points right, like an unturned piece.
  const dir = length > 1e-6 ? { x: dx / length, y: dy / length } : { x: 1, y: 0 };
  const round = (value) => Math.round(value * 1000) / 1000;
  return [
    { x: round(origin.x), y: round(origin.y) },
    { x: round(origin.x + dir.x * reach), y: round(origin.y + dir.y * reach) },
  ];
}

// The area being dragged out from `origin` to the pointer at `toward`. It grows
// a whole square at a time — the step the ruler is set to, 5 ft unless told
// otherwise — and the hint says how big it is in feet. A square is dragged from
// its centre with the pointer on the middle of a side, so its side is twice
// the pointer's distance, and it turns with the pointer like a cone or a line
// (in SQUARE_TURN_STEP_DEG steps). Null until the pointer has gone half a
// square: a click alone places nothing.
export function areaFromDrag(options, origin, toward, feetPerCell = FEET_PER_CELL) {
  const square = options?.shape === 'square';
  const area = normalizeArea({
    ...options, breadth: feetToCells(options?.breadthFt, feetPerCell), turned: square,
  });
  if (!area || !origin || !toward) return null;
  const dx = toward.x - origin.x;
  const dy = toward.y - origin.y;
  const raw = square ? 2 * Math.hypot(dx, dy) : Math.hypot(dx, dy);
  const cells = Math.min(MAX_REACH_CELLS, Math.round(raw));
  if (cells < 1) return null;
  const perCell = Number(feetPerCell) > 0 ? Number(feetPerCell) : FEET_PER_CELL;
  const feet = formatFeet(cells * perCell);
  const hint = {
    circle: `${feet} radius`,
    square: `${feet} square`,
    cone: `${feet} cone`,
    line: `${feet} × ${formatFeet((area.breadth || 1) * perCell)} line`,
  }[area.shape];
  const turn = square ? squareTurn(dx, dy) : null;
  const facing = turn === null ? toward : { x: origin.x + Math.cos(turn), y: origin.y + Math.sin(turn) };
  return {
    area,
    points: buildAreaPoints(area.shape, origin, facing, cells),
    text: String(options?.label || '').trim() || null,
    hint,
  };
}

// An area's size as the menu shows it, in feet: the radius of a circle, the
// side of a square, the length of a cone or a line.
export function areaSizeFeet(drawing, feetPerCell = FEET_PER_CELL) {
  const geometry = areaGeometry(drawing);
  if (!geometry) return 0;
  const perCell = Number(feetPerCell) > 0 ? Number(feetPerCell) : FEET_PER_CELL;
  const cells = drawing.area?.shape === 'square' ? geometry.reach * 2 : geometry.reach;
  return Math.round(cells * perCell * 100) / 100;
}

// The same area at another size: the origin and the direction stay put.
export function resizedAreaPoints(drawing, sizeFeet, feetPerCell = FEET_PER_CELL) {
  const geometry = areaGeometry(drawing);
  if (!geometry) return drawing?.points || [];
  const toward = {
    x: geometry.origin.x + Math.cos(geometry.angle),
    y: geometry.origin.y + Math.sin(geometry.angle),
  };
  return buildAreaPoints(drawing.area?.shape, geometry.origin, toward, feetToCells(sizeFeet, feetPerCell));
}

// Origin, reach and direction of a stored area, in cells.
export function areaGeometry(drawing) {
  const [origin, tip] = drawing?.points || [];
  if (!origin) return null;
  const end = tip || origin;
  const dx = end.x - origin.x;
  const dy = end.y - origin.y;
  const reach = Math.hypot(dx, dy);
  // A square from before squares turned is square to the map.
  const unturned = drawing?.area?.shape === 'square' && !drawing.area.turned;
  return {
    origin,
    reach,
    angle: reach > 1e-6 && !unturned ? Math.atan2(dy, dx) : 0,
    breadth: drawing?.area?.breadth || 1,
  };
}

// Signed distance (cells) from a point to the area's edge: negative inside.
// Shared by hit-testing here and, in the same form, by the effect shader.
export function areaEdgeDistance(drawing, point) {
  const geometry = areaGeometry(drawing);
  if (!geometry) return Infinity;
  const { origin, reach, angle, breadth } = geometry;
  const lx = point.x - origin.x;
  const ly = point.y - origin.y;
  const shape = drawing.area?.shape;
  if (shape === 'circle') return Math.hypot(lx, ly) - reach;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const along = lx * cos + ly * sin;
  const across = Math.abs(-lx * sin + ly * cos);
  if (shape === 'square') return Math.max(Math.abs(along), across) - reach;
  const ends = Math.max(-along, along - reach);
  if (shape === 'cone') {
    // Distance to the slanted side, measured square to it.
    const side = (across - along * CONE_SPREAD) / Math.hypot(1, CONE_SPREAD);
    return Math.max(ends, side);
  }
  return Math.max(ends, across - breadth / 2);
}

// Whether the point is on the area. `edgeOnly` asks for the rim and the
// origin, not the inside: a 30 ft cloud would otherwise swallow every attempt
// to pan the map across it.
export function isPointOnArea(drawing, point, { slop = 0.3, edgeOnly = false } = {}) {
  const distance = areaEdgeDistance(drawing, point);
  if (!edgeOnly) return distance <= slop;
  if (Math.abs(distance) <= slop) return true;
  const origin = drawing?.points?.[0];
  return Boolean(origin) && Math.hypot(point.x - origin.x, point.y - origin.y) <= Math.max(slop, 0.45);
}

// Where the label sits: the middle of the area, which for a cone is well
// toward its open end rather than at its point.
export function areaLabelAnchor(drawing) {
  const geometry = areaGeometry(drawing);
  if (!geometry) return null;
  const { origin, reach, angle } = geometry;
  const shape = drawing.area?.shape;
  if (shape === 'circle' || shape === 'square') return origin;
  const share = shape === 'cone' ? 0.62 : 0.5;
  return {
    x: origin.x + Math.cos(angle) * reach * share,
    y: origin.y + Math.sin(angle) * reach * share,
  };
}
