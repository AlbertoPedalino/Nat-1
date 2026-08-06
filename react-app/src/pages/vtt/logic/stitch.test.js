import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_CANVAS_DIMENSION, rowLayout } from './stitch.js';

test('floors sit left to right, centred on the tallest', () => {
  const layout = rowLayout([
    { width: 400, height: 300 },
    { width: 200, height: 100 },
  ], { gapRatio: 0 });

  assert.equal(layout.width, 600);
  assert.equal(layout.height, 300);
  assert.deepEqual(layout.placements[0], { x: 0, y: 0, width: 400, height: 300 });
  // The shorter floor keeps its own size — the plans are of the same building
  // and a cellar smaller than the hall means something — and is centred.
  assert.deepEqual(layout.placements[1], { x: 400, y: 100, width: 200, height: 100 });
});

test('the gap between floors is a share of the tallest one', () => {
  const layout = rowLayout([
    { width: 400, height: 300 },
    { width: 400, height: 200 },
  ], { gapRatio: 0.1 });

  assert.equal(layout.width, 830, '400 + 30 of gap + 400');
  assert.equal(layout.placements[1].x, 430);
});

// A canvas has a ceiling well below eight storeys at export resolution, and a
// silently cropped map is worse than a smaller one.
test('a row too wide for a canvas is scaled down, not cropped', () => {
  const floors = Array.from({ length: 8 }, () => ({ width: 3000, height: 2000 }));
  const layout = rowLayout(floors, { gapRatio: 0 });

  assert.equal(layout.width, MAX_CANVAS_DIMENSION);
  assert.ok(layout.scale < 1);
  assert.equal(layout.height, Math.round(2000 * layout.scale));
  assert.equal(layout.placements.at(-1).x + layout.placements.at(-1).width, MAX_CANVAS_DIMENSION);
});

test('a single floor still lays out, and nothing at all lays out to nothing', () => {
  const one = rowLayout([{ width: 500, height: 400 }], { gapRatio: 0.5 });
  assert.equal(one.width, 500);
  assert.equal(one.height, 400);
  assert.equal(one.placements.length, 1);

  assert.equal(rowLayout([]), null);
  assert.equal(rowLayout(null), null);
  // A picture whose size never loaded would otherwise put a hole in the row.
  assert.equal(rowLayout([{ width: 0, height: 0 }]), null);
});
