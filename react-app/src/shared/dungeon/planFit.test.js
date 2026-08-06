import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MIN_CONFIDENT_FILL, fitPlanToImage, planCells, planOutsideCells,
} from './planFit.js';

const PLAN = {
  rooms: [
    { x: 0, y: 0, w: 5, h: 4 },
    { x: 8, y: 2, w: 4, h: 6 },
    { x: 2, y: 9, w: 6, h: 4 },
  ],
  corridors: [
    { x: 5, y: 2, w: 3, h: 1 },
    { x: 4, y: 4, w: 1, h: 5 },
  ],
  bounds: {
    minX: 0, minY: 0, maxX: 12, maxY: 13, width: 12, height: 13,
  },
};

// A picture of that plan: pale rooms, dark stone, hatched walls just outside
// them — which is what makes the naive "is this pixel pale?" test fail, and is
// why the fit works on contrast and then learns the floor's own shade.
function drawPlan({
  cellSize, originX, originY, width, height, floor = 0.9, stone = 0.15, hatch = 0.55,
}) {
  const inside = new Set();
  for (const rect of [...PLAN.rooms, ...PLAN.corridors]) {
    for (let y = rect.y; y < rect.y + rect.h; y += 1) {
      for (let x = rect.x; x < rect.x + rect.w; x += 1) inside.add(`${x}:${y}`);
    }
  }
  const near = new Set();
  for (const key of inside) {
    const [x, y] = key.split(':').map(Number);
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const neighbour = `${x + dx}:${y + dy}`;
        if (!inside.has(neighbour)) near.add(neighbour);
      }
    }
  }
  return {
    width,
    height,
    sample(px, py) {
      if (px < 0 || py < 0 || px >= width || py >= height) return stone;
      const cx = Math.floor((px - originX) / cellSize);
      const cy = Math.floor((py - originY) / cellSize);
      const key = `${cx}:${cy}`;
      if (inside.has(key)) return floor;
      if (near.has(key)) return hatch;
      return stone;
    },
  };
}

test('the plan is measured in cells, inside and just outside', () => {
  const cells = planCells(PLAN);
  assert.equal(cells.length, 5 * 4 + 4 * 6 + 6 * 4 + 3 + 5);
  assert.deepEqual(cells[0], { x: 0.5, y: 0.5 });

  const outside = planOutsideCells(PLAN);
  assert.ok(outside.length > 20);
  // Nothing in the ring is also floor, or the fit would be asking a cell to be
  // two things at once.
  const floor = new Set(cells.map((cell) => `${cell.x}:${cell.y}`));
  assert.ok(outside.every((cell) => !floor.has(`${cell.x}:${cell.y}`)));
});

// What has to be right is where a cell lands, not the three numbers that put it
// there: a scale a shade small and an origin a shade left can describe the same
// squares. So the test is the one the map cares about — every cell of the
// dungeon within a third of a cell of where the picture drew it.
function worstCellError(fit, truth) {
  let worst = 0;
  for (const cell of planCells(PLAN)) {
    const gotX = fit.origin.x + cell.x * fit.cellSize;
    const gotY = fit.origin.y + cell.y * fit.cellSize;
    const wantX = truth.originX + cell.x * truth.cellSize;
    const wantY = truth.originY + cell.y * truth.cellSize;
    worst = Math.max(worst, Math.hypot(gotX - wantX, gotY - wantY));
  }
  return worst / truth.cellSize;
}

test('every cell lands where the picture drew it', () => {
  const truth = {
    cellSize: 70, originX: 70, originY: 35, width: 12 * 70 + 140, height: 13 * 70 + 70,
  };
  const fit = fitPlanToImage(drawPlan(truth), PLAN);

  assert.ok(fit, 'a fit was found');
  const off = worstCellError(fit, truth);
  assert.ok(off < 1 / 3, `worst cell off by ${off.toFixed(2)} cells`);
  assert.ok(fit.fill >= MIN_CONFIDENT_FILL, `fill ${fit.fill}`);
  assert.equal(fit.confident, true);
});

test('a different cell size and an off-centre plan are found just as well', () => {
  const truth = {
    cellSize: 44, originX: 130, originY: 12, width: 12 * 44 + 200, height: 13 * 44 + 60,
  };
  const fit = fitPlanToImage(drawPlan(truth), PLAN);

  const off = worstCellError(fit, truth);
  assert.ok(off < 1 / 3, `worst cell off by ${off.toFixed(2)} cells`);
  assert.equal(fit.confident, true);
});

// The other export turns the map to fit the page. Nothing can be recovered from
// that by scaling alone, and the answer has to be that it did not work — the
// alternative is a dungeon laid over the wrong part of its own picture.
test('a picture that does not match is refused rather than forced', () => {
  const noise = {
    width: 900,
    height: 900,
    sample: (x, y) => ((Math.sin(x * 0.7) + Math.cos(y * 0.9)) > 0 ? 0.8 : 0.2),
  };
  const fit = fitPlanToImage(noise, PLAN);
  assert.ok(!fit || fit.confident === false, 'noise is not a confident fit');

  const blank = { width: 900, height: 900, sample: () => 0.5 };
  const flat = fitPlanToImage(blank, PLAN);
  assert.ok(!flat || flat.confident === false, 'a blank page is not a fit');
});

test('nothing to fit is answered with nothing, not with a guess', () => {
  const picture = drawPlan({
    cellSize: 50, originX: 0, originY: 0, width: 600, height: 700,
  });
  assert.equal(fitPlanToImage(picture, { rooms: [], corridors: [], bounds: PLAN.bounds }), null);
  assert.equal(fitPlanToImage(picture, { ...PLAN, bounds: null }), null);
  assert.equal(fitPlanToImage({ width: 0, height: 0, sample: () => 1 }, PLAN), null);
  assert.equal(fitPlanToImage({ width: 600, height: 700 }, PLAN), null);
});
