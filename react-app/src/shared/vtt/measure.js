// Movement distance while dragging a piece.
//
// 5e counts a diagonal as one square (Chebyshev), which is why a knight-ish move
// of 3 across and 2 down is 15 ft and not 25. The optional 5-10-5 variant from
// the DMG alternates the cost of diagonals, so it is offered but not the
// default.

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

export function feetBetween(from, to, { feetPerCell = FEET_PER_CELL, rule = 'chebyshev' } = {}) {
  const perCell = Number(feetPerCell) > 0 ? Number(feetPerCell) : FEET_PER_CELL;
  return cellDistance(from, to, rule) * perCell;
}

export function formatFeet(feet) {
  const value = Number(feet) || 0;
  return `${Math.round(value)} ft`;
}

// The badge is noise on a piece that has not left its square yet.
export function movementLabel(from, to, options) {
  const feet = feetBetween(from, to, options);
  return feet > 0 ? formatFeet(feet) : '';
}
