// Movement distance while dragging a piece.
//
// 5e counts a diagonal as one square (Chebyshev), which is why a knight-ish move
// of 3 across and 2 down is 15 ft and not 25. The optional 5-10-5 variant from
// the DMG alternates the cost of diagonals, so it is offered but not the
// default.

import { hexDistance } from './hexGeometry.js';

export const FEET_PER_CELL = 5;
export const DIAGONAL_RULES = Object.freeze(['chebyshev', 'alternating']);

function cellsBetween(from, to) {
  const dx = Math.abs(Math.round(Number(to?.x) || 0) - Math.round(Number(from?.x) || 0));
  const dy = Math.abs(Math.round(Number(to?.y) || 0) - Math.round(Number(from?.y) || 0));
  return { dx, dy, diagonals: Math.min(dx, dy), straights: Math.abs(dx - dy) };
}

export function cellDistance(from, to, rule = 'chebyshev') {
  const { diagonals, straights } = cellsBetween(from, to);
  if (rule !== 'alternating') return diagonals + straights;
  // Every second diagonal costs two squares: 1, 3, 4, 6, 7…
  return straights + diagonals + Math.floor(diagonals / 2);
}

// On hexes there is no diagonal to rule on — every neighbour is one step, which
// is most of why a wilderness map uses them. The coordinates are axial, so the
// count comes from the hex module rather than from dx/dy.
function hexSteps(from, to) {
  return hexDistance(
    { q: Math.round(Number(from?.x) || 0), r: Math.round(Number(from?.y) || 0) },
    { q: Math.round(Number(to?.x) || 0), r: Math.round(Number(to?.y) || 0) },
  );
}

export function feetBetween(from, to, {
  feetPerCell = FEET_PER_CELL, rule = 'chebyshev', shape = 'square',
} = {}) {
  const perCell = Number(feetPerCell) > 0 ? Number(feetPerCell) : FEET_PER_CELL;
  const cells = shape === 'hex' ? hexSteps(from, to) : cellDistance(from, to, rule);
  return cells * perCell;
}

export function formatFeet(feet) {
  const value = Number(feet) || 0;
  return `${Math.round(value)} ft`;
}

// The shapes a ruler can take, following the 5e templates the table already
// argues about. `line` is plain point-to-point; the rest read the drag as
// origin -> extent.
export const MEASURE_SHAPES = Object.freeze(['line', 'radius', 'cone', 'square']);

export function normalizeShape(shape) {
  return MEASURE_SHAPES.includes(shape) ? shape : 'line';
}

// What the ruler says, in feet, for the shape being dragged. Radius, cone and
// square are all "how far from the origin", which is why they share a number
// and differ only in what gets drawn.
export function measureFeet(shape, from, to, options) {
  return feetBetween(from, to, options);
}

export function measureLabel(shape, from, to, options) {
  const feet = measureFeet(shape, from, to, options);
  if (feet <= 0) return '';
  const kind = normalizeShape(shape);
  if (kind === 'radius') return `${formatFeet(feet)} radius`;
  if (kind === 'cone') return `${formatFeet(feet)} cone`;
  if (kind === 'square') return `${formatFeet(feet)} square`;
  return formatFeet(feet);
}

// The badge is noise on a piece that has not left its square yet.
export function movementLabel(from, to, options) {
  const feet = feetBetween(from, to, options);
  return feet > 0 ? formatFeet(feet) : '';
}
