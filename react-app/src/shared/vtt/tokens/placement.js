import { isHexGrid } from '../map/hexGeometry.js';

// Where a piece placed with a click lands: as close as it can to the middle of
// the view of whoever placed it, so they see it arrive. The top-left of the map
// (or of the play area) was often somewhere else entirely, and on a hex map it
// was worse: axial rows slant, so walking them like squares ran off to the left.
//
// Cells are searched in rings around the centre — squares by Chebyshev
// distance, hexes by hex steps — so a group gathers around the middle instead of
// trailing off to one side. `accept` narrows the cells a piece may stand on (a
// player's must be inside the play area, or the row would be hidden from them).

const MAX_RING = 40;

const HEX_RING_STEPS = [
  { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 },
  { q: -1, r: 0 }, { q: 0, r: -1 }, { q: 1, r: -1 },
];

// Within a ring the corners are farther than the middle of each side, so the
// ring is walked nearest first: the piece lands on the closest free square.
function* squareRings(center) {
  yield { x: center.x, y: center.y };
  for (let ring = 1; ring <= MAX_RING; ring += 1) {
    const cells = [];
    for (let dy = -ring; dy <= ring; dy += 1) {
      for (let dx = -ring; dx <= ring; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) === ring) cells.push({ dx, dy });
      }
    }
    cells.sort((a, b) => (a.dx * a.dx + a.dy * a.dy) - (b.dx * b.dx + b.dy * b.dy));
    for (const { dx, dy } of cells) yield { x: center.x + dx, y: center.y + dy };
  }
}

// Axial rings: start `ring` steps out and walk the six sides.
function* hexRings(center) {
  yield { x: center.x, y: center.y };
  for (let ring = 1; ring <= MAX_RING; ring += 1) {
    let q = center.x + HEX_RING_STEPS[4].q * ring;
    let r = center.y + HEX_RING_STEPS[4].r * ring;
    for (const step of HEX_RING_STEPS) {
      for (let i = 0; i < ring; i += 1) {
        yield { x: q, y: r };
        q += step.q;
        r += step.r;
      }
    }
  }
}

const cellKey = (x, y) => `${Math.round(x)}:${Math.round(y)}`;

// The cells a piece covers from its origin. A hex piece stands on one hex.
function coveredCells(origin, token, hex) {
  if (hex) return [cellKey(origin.x, origin.y)];
  const w = Math.max(1, Math.round(Number(token?.w) || 1));
  const h = Math.max(1, Math.round(Number(token?.h) || 1));
  const cells = [];
  for (let dy = 0; dy < h; dy += 1) {
    for (let dx = 0; dx < w; dx += 1) cells.push(cellKey(origin.x + dx, origin.y + dy));
  }
  return cells;
}

function occupiedCells(occupied, hex) {
  const taken = new Set();
  (occupied || []).forEach((token) => {
    coveredCells({ x: Number(token?.x) || 0, y: Number(token?.y) || 0 }, token, hex)
      .forEach((key) => taken.add(key));
  });
  return taken;
}

// Lays `tokens` out around `center` ({ x, y } in grid cells: col/row, or q/r on
// a hex grid), skipping the cells `occupied` already covers. A square piece
// larger than a cell is centred on its cell. Each token comes back with its
// x/y; one with no free cell in reach lands on the centre.
export function placeAroundCenter(tokens, occupied, center, { grid, accept } = {}) {
  const hex = isHexGrid(grid);
  const taken = occupiedCells(occupied, hex);
  const origin = { x: Math.round(Number(center?.x) || 0), y: Math.round(Number(center?.y) || 0) };
  return (tokens || []).map((token) => {
    const shiftX = hex ? 0 : Math.floor(Math.max(1, Number(token?.w) || 1) / 2);
    const shiftY = hex ? 0 : Math.floor(Math.max(1, Number(token?.h) || 1) / 2);
    for (const cell of (hex ? hexRings(origin) : squareRings(origin))) {
      const position = { x: cell.x - shiftX, y: cell.y - shiftY };
      if (accept && !accept(position)) continue;
      const cells = coveredCells(position, token, hex);
      if (cells.some((key) => taken.has(key))) continue;
      cells.forEach((key) => taken.add(key));
      return { ...token, ...position };
    }
    return { ...token, ...origin };
  });
}
