// Laying the plan over a picture that was not turned.
//
// The generator's plain export draws the dungeon square to the page at a cell
// size the GM chose, so the picture and the data differ only by a scale and a
// shift — three numbers. They are not written down anywhere, but they can be
// found: try a scale and a shift, and ask how differently the picture reads
// inside the dungeon's own floor than just outside it.
//
// Contrast rather than colour, on purpose. Asking "is this pixel floor?" needs a
// palette, and the generator has several — pale rooms on cream, pale rooms on
// black — while the hatching that draws the walls is very nearly the colour of
// the floor it surrounds. What is true in every theme is that a room does not
// look like the stone around it, and the alignment that makes that difference
// largest is the right one.
//
// Nothing here touches a canvas. The caller passes a way to read a pixel's
// lightness, which is a canvas in the browser and a decoded PNG in a test.

// Rooms and stone this close in lightness are not telling us anything, and
// saying so is better than moving a party's map by half a room.
export const MIN_CONFIDENT_SCORE = 0.2;
// Below this much of the dungeon's own floor landing on the colour a room is
// painted, the fit is a coincidence and the GM is told to place it by hand.
export const MIN_CONFIDENT_FILL = 0.85;
// Enough contrast that nothing better is worth looking for.
const GOOD_ENOUGH = 0.55;
const COARSE_SAMPLES = 60;

function sampleCells(cells, limit) {
  if (cells.length <= limit) return cells;
  const stride = cells.length / limit;
  const picked = [];
  for (let i = 0; i < limit; i += 1) picked.push(cells[Math.floor(i * stride)]);
  return picked;
}

// Every floor cell of the plan, as the centre of the square it occupies.
export function planCells(plan) {
  const cells = [];
  for (const rect of [...(plan?.rooms || []), ...(plan?.corridors || [])]) {
    for (let y = rect.y; y < rect.y + rect.h; y += 1) {
      for (let x = rect.x; x < rect.x + rect.w; x += 1) cells.push({ x: x + 0.5, y: y + 0.5 });
    }
  }
  return cells;
}

// The ring of cells just outside the dungeon: stone, as far as the plan is
// concerned. Without these the fit is far too easily pleased — a room is a wide
// blob of floor, so a cell centre lands on it even when the scale is a few per
// cent out, and the search drifts. What pins the scale down is the demand that
// the cells which should be wall are not floor either.
export function planOutsideCells(plan) {
  const inside = new Set();
  for (const rect of [...(plan?.rooms || []), ...(plan?.corridors || [])]) {
    for (let y = rect.y; y < rect.y + rect.h; y += 1) {
      for (let x = rect.x; x < rect.x + rect.w; x += 1) inside.add(`${x}:${y}`);
    }
  }
  const outside = new Map();
  for (const key of inside) {
    const [x, y] = key.split(':').map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const neighbour = `${nx}:${ny}`;
      if (inside.has(neighbour) || outside.has(neighbour)) continue;
      outside.set(neighbour, { x: nx + 0.5, y: ny + 0.5 });
    }
  }
  return [...outside.values()];
}

// Where the floor stops. Each pair is a point just inside a wall and one just
// beyond it: the plan is right when the first reads as room and the second does
// not. This is the only measure that punishes both mistakes — a plan drawn too
// small keeps its floor samples comfortably inside the rooms and would score
// perfectly on those alone, but its outside samples fall on floor and give it
// away.
export function planEdgeProbes(plan) {
  const inside = new Set();
  for (const rect of [...(plan?.rooms || []), ...(plan?.corridors || [])]) {
    for (let y = rect.y; y < rect.y + rect.h; y += 1) {
      for (let x = rect.x; x < rect.x + rect.w; x += 1) inside.add(`${x}:${y}`);
    }
  }
  const probes = [];
  for (const key of inside) {
    const [x, y] = key.split(':').map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (inside.has(`${x + dx}:${y + dy}`)) continue;
      probes.push({
        in: { x: x + 0.5 + dx * 0.3, y: y + 0.5 + dy * 0.3 },
        out: { x: x + 0.5 + dx * 0.8, y: y + 0.5 + dy * 0.8 },
      });
    }
  }
  return probes;
}

function meanAt(cells, sample, cellSize, originX, originY) {
  let total = 0;
  for (const cell of cells) {
    total += sample(
      Math.round(originX + cell.x * cellSize),
      Math.round(originY + cell.y * cellSize),
    );
  }
  return total / cells.length;
}

// How unlike the stone around it the dungeon's own floor reads, from 0 to 1.
// Absolute, so a dark theme scores as well as a pale one.
function scoreAt(inside, outside, sample, cellSize, originX, originY) {
  const within = meanAt(inside, sample, cellSize, originX, originY);
  if (!outside.length) return 0;
  const beyond = meanAt(outside, sample, cellSize, originX, originY);
  return Math.abs(within - beyond);
}

export function fitPlanToImage({ width, height, sample }, plan, {
  // The picture is the dungeon plus some margin, never less than the dungeon,
  // and no export pads it by more than about a third of itself.
  minFill = 0.55,
  coarseSamples = COARSE_SAMPLES,
} = {}) {
  const bounds = plan?.bounds;
  if (!bounds || !(width > 0) || !(height > 0) || typeof sample !== 'function') return null;
  if (!(bounds.width > 0) || !(bounds.height > 0)) return null;

  const all = planCells(plan);
  if (!all.length) return null;
  const outside = planOutsideCells(plan);
  const coarse = sampleCells(all, coarseSamples);
  const coarseOutside = sampleCells(outside, coarseSamples);

  // The largest cell that still fits the whole dungeon in the picture, down to
  // the smallest that would leave it swimming in margin.
  const maxCell = Math.min(width / bounds.width, height / bounds.height);
  const minCell = maxCell * minFill;
  if (!(maxCell > 1)) return null;

  const candidates = [];
  const cellStep = Math.max(0.5, maxCell / 60);
  for (let cellSize = maxCell; cellSize >= minCell; cellSize -= cellStep) {
    // With the cell fixed, the shift can only be as much slack as the picture
    // has left over — anything else puts the dungeon outside its own map.
    const slackX = width - bounds.width * cellSize;
    const slackY = height - bounds.height * cellSize;
    const step = Math.max(2, cellSize / 4);
    let best = null;
    for (let padX = 0; padX <= slackX; padX += step) {
      for (let padY = 0; padY <= slackY; padY += step) {
        const originX = padX - bounds.minX * cellSize;
        const originY = padY - bounds.minY * cellSize;
        const score = scoreAt(coarse, coarseOutside, sample, cellSize, originX, originY);
        if (!best || score > best.score) best = { score, cellSize, originX, originY };
      }
    }
    if (best) candidates.push(best);
  }
  if (!candidates.length) return null;

  // The coarse pass is sampled and stepped, so its winner is a neighbourhood
  // rather than an answer. The few best neighbourhoods are searched properly.
  candidates.sort((a, b) => b.score - a.score);
  let best = null;
  for (const candidate of candidates.slice(0, 6)) {
    const span = Math.max(3, candidate.cellSize / 8);
    for (let cellSize = candidate.cellSize - cellStep; cellSize <= candidate.cellSize + cellStep; cellSize += cellStep / 4) {
      for (let dx = -span; dx <= span; dx += 1) {
        for (let dy = -span; dy <= span; dy += 1) {
          const originX = candidate.originX + dx;
          const originY = candidate.originY + dy;
          const score = scoreAt(coarse, coarseOutside, sample, cellSize, originX, originY);
          if (!best || score > best.score) best = { score, cellSize, originX, originY };
        }
      }
    }
    if (best && best.score >= GOOD_ENOUGH) break;
  }
  if (!best) return null;

  // Contrast finds the scale but not quite the centre: the stone outside a room
  // is hatched, so nudging the plan off the rooms and onto the hatching can read
  // as *more* difference rather than less. What settles the centre is the floor
  // itself — sampled at the fit just found, its lightness is whatever this
  // theme paints a room, and the alignment that puts the most cells on that
  // exact shade, and the fewest wall cells on it, is the one to keep.
  const settled = settleOnFloor(best, { all, edges: planEdgeProbes(plan), sample });
  const score = scoreAt(all, outside, sample, settled.cellSize, settled.originX, settled.originY);
  return {
    cellSize: settled.cellSize,
    origin: { x: settled.originX, y: settled.originY },
    score,
    // How much of the dungeon's floor actually landed on the colour a room is
    // painted: the number that says whether this worked.
    fill: settled.fill,
    confident: score >= MIN_CONFIDENT_SCORE && settled.fill >= MIN_CONFIDENT_FILL,
  };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

// How near a shade has to be to count as the same one. Wide enough for the
// speckles and cracks drawn on a floor, narrow enough to exclude the hatching.
const SHADE_TOLERANCE = 0.08;

function settleOnFloor(start, { all, edges, sample }) {
  const at = (cell, cellSize, originX, originY) => sample(
    Math.round(originX + cell.x * cellSize),
    Math.round(originY + cell.y * cellSize),
  );
  // Whatever this theme paints a room, read off the fit the contrast pass
  // found: most cells land on floor even when the scale is a shade out, so the
  // middle value of them is the floor's own shade.
  const floorShade = median(all.map((cell) => at(cell, start.cellSize, start.originX, start.originY)));
  const looksLikeFloor = (value) => Math.abs(value - floorShade) <= SHADE_TOLERANCE;

  const sampled = sampleCells(edges, 180);
  const centre = {
    x: all.reduce((total, cell) => total + cell.x, 0) / all.length,
    y: all.reduce((total, cell) => total + cell.y, 0) / all.length,
  };
  const rate = (cellSize, originX, originY) => {
    if (!sampled.length) return 0;
    let score = 0;
    for (const probe of sampled) {
      if (looksLikeFloor(at(probe.in, cellSize, originX, originY))) score += 1;
      if (!looksLikeFloor(at(probe.out, cellSize, originX, originY))) score += 1;
    }
    return score / (sampled.length * 2);
  };

  // Allowed to disagree with the contrast pass by a tenth either way. That pass
  // is biased large — a plan drawn a few per cent too big puts its floor
  // samples on the hatched wall and its wall samples on plain stone, which
  // reads as more difference than the truth does.
  let best = { ...start, fill: rate(start.cellSize, start.originX, start.originY) };
  const sweep = (cellRange, cellStep, span, originStep) => {
    const from = { ...best };
    for (let cellSize = from.cellSize - cellRange; cellSize <= from.cellSize + cellRange; cellSize += cellStep) {
      for (let dx = -span; dx <= span; dx += originStep) {
        for (let dy = -span; dy <= span; dy += originStep) {
          // Scaled about the plan's own middle, so a nudge to the cell size does
          // not also drag the whole map across the picture.
          const originX = from.originX + dx - (cellSize - from.cellSize) * centre.x;
          const originY = from.originY + dy - (cellSize - from.cellSize) * centre.y;
          const fill = rate(cellSize, originX, originY);
          if (fill > best.fill) best = { cellSize, originX, originY, fill };
        }
      }
    }
  };
  sweep(start.cellSize * 0.1, start.cellSize * 0.005, Math.max(4, start.cellSize / 3), 3);
  sweep(start.cellSize * 0.012, start.cellSize * 0.002, 4, 1);

  // Reported as the plain thing a reader would want to know: how much of the
  // dungeon's floor ended up on the colour a room is painted.
  let on = 0;
  for (const cell of all) if (looksLikeFloor(at(cell, best.cellSize, best.originX, best.originY))) on += 1;
  return { ...best, fill: on / all.length };
}
