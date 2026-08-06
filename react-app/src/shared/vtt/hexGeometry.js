// Hex maps, in the same three spaces as the square grid (screen / world / cell).
// Pure on purpose, like geometry.js: hex rounding is where the off-by-one bugs
// live, and a canvas is a terrible place to debug them.
//
// Coordinates are AXIAL (q, r) and are stored in the very same token columns a
// square scene uses for x and y. Which of the two a number means is decided by
// `grid.shape` and nothing else — a scene is square or hexagonal, never both,
// because two coordinate systems in one pair of columns is a bug that only
// surfaces months later.
//
// Hexes are pointy-top. `grid.size` is the width of a hex, so a hexagonal scene
// calibrated to "70" has hexes as wide as the squares it replaced, which is what
// somebody re-calibrating an existing map expects to see.

const SQRT3 = Math.sqrt(3);

function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function hexWidth(grid) {
  return Math.max(1, numberOr(grid?.size, 70));
}

// Corner-to-corner, vertically: a pointy-top hex is taller than it is wide.
export function hexHeight(grid) {
  return (hexWidth(grid) * 2) / SQRT3;
}

// How far apart two rows sit. Three quarters of the height, because the rows
// interlock rather than stack.
export function hexRowStep(grid) {
  return (hexHeight(grid) * 3) / 4;
}

export function isHexGrid(grid) {
  return grid?.shape === 'hex';
}

// The centre of hex (q, r) in world pixels. Odd rows are pushed half a hex to
// the right by the `r / 2` term — that is the whole of the offset layout.
export function hexToWorld(cell, grid) {
  const width = hexWidth(grid);
  const q = numberOr(cell?.q, 0);
  const r = numberOr(cell?.r, 0);
  return {
    x: width * (q + r / 2) + numberOr(grid?.offsetX, 0),
    y: hexRowStep(grid) * r + numberOr(grid?.offsetY, 0),
  };
}

// Where a world point falls, in hexes, without rounding: scenery placed with
// snapping off comes to rest on a fraction, exactly as it does on squares.
export function worldToAxial(point, grid) {
  const width = hexWidth(grid);
  const x = numberOr(point?.x, 0) - numberOr(grid?.offsetX, 0);
  const y = numberOr(point?.y, 0) - numberOr(grid?.offsetY, 0);
  const r = y / hexRowStep(grid);
  return { q: x / width - r / 2, r };
}

// The exact hex a world point falls in.
export function worldToHex(point, grid) {
  return axialRound(worldToAxial(point, grid));
}

// Rounding a fractional hex is not rounding two numbers: q + r + s is always
// zero on a hex grid, so the coordinate that moved furthest is the one recomputed
// from the other two. Rounding each axis on its own lands outside the hex the
// pointer was actually over, roughly a third of the time.
export function axialRound(cell) {
  const q = numberOr(cell?.q, 0);
  const r = numberOr(cell?.r, 0);
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  // `+ 0` folds -0 back to 0. Negating an axis produces it constantly, and a
  // negative zero on its way to a row key is a second name for hex 0, which the
  // primary key would happily accept as a different cell.
  return { q: rq + 0, r: rr + 0 };
}

// The six corners of a hex, clockwise from the top. Pointy-top, so the first
// corner is straight up rather than at an angle.
export function hexCorners(cell, grid) {
  const centre = hexToWorld(cell, grid);
  const radius = hexHeight(grid) / 2;
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 180) * (60 * index - 90);
    return {
      x: centre.x + radius * Math.cos(angle),
      y: centre.y + radius * Math.sin(angle),
    };
  });
}

// Distance in hexes — the number of steps, which is what a travel rate is
// counted in. Straight cube distance: no diagonals to argue about, which is half
// the reason a wilderness map uses hexes in the first place.
export function hexDistance(from, to) {
  const aq = numberOr(from?.q, 0);
  const ar = numberOr(from?.r, 0);
  const bq = numberOr(to?.q, 0);
  const br = numberOr(to?.r, 0);
  return (Math.abs(aq - bq) + Math.abs(aq + ar - bq - br) + Math.abs(ar - br)) / 2;
}

export const HEX_NEIGHBOURS = Object.freeze([
  Object.freeze({ q: 1, r: 0 }),
  Object.freeze({ q: 1, r: -1 }),
  Object.freeze({ q: 0, r: -1 }),
  Object.freeze({ q: -1, r: 0 }),
  Object.freeze({ q: -1, r: 1 }),
  Object.freeze({ q: 0, r: 1 }),
]);

export function hexNeighbours(cell) {
  const q = numberOr(cell?.q, 0);
  const r = numberOr(cell?.r, 0);
  return HEX_NEIGHBOURS.map((step) => ({ q: q + step.q, r: r + step.r }));
}

// Every hex whose centre could be on screen, with a ring of slack so the ones
// straddling the edge are still drawn. Bounded by the rectangle it is given:
// rendering asks for what the viewport covers, never for the whole plane.
export function hexesInRect(rect, grid) {
  const width = hexWidth(grid);
  const step = hexRowStep(grid);
  const left = numberOr(rect?.x, 0) - numberOr(grid?.offsetX, 0);
  const top = numberOr(rect?.y, 0) - numberOr(grid?.offsetY, 0);
  const right = left + Math.max(0, numberOr(rect?.width, 0));
  const bottom = top + Math.max(0, numberOr(rect?.height, 0));

  const firstRow = Math.floor(top / step) - 1;
  const lastRow = Math.ceil(bottom / step) + 1;
  const cells = [];
  for (let r = firstRow; r <= lastRow; r += 1) {
    // Each row is shifted by half a hex per row index, so its own column range
    // has to be worked out rather than shared with the row above.
    const shift = r / 2;
    const firstCol = Math.floor(left / width - shift) - 1;
    const lastCol = Math.ceil(right / width - shift) + 1;
    for (let q = firstCol; q <= lastCol; q += 1) cells.push({ q, r });
  }
  return cells;
}

// A hex is addressed by two numbers, and the database stores them as one key per
// row. Kept here so the editor and the cloud module cannot disagree on the shape
// of it.
export function hexKey(cell) {
  return `${Math.round(numberOr(cell?.q, 0))}:${Math.round(numberOr(cell?.r, 0))}`;
}
