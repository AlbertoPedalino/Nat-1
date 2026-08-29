import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ZOOM_MAX,
  ZOOM_MIN,
  cellToWorld,
  clampZoom,
  dropPosition,
  fillView,
  fitView,
  panBy,
  screenToWorld,
  tokenAtPoint,
  tokenWorldRect,
  worldToCell,
  worldToScreen,
  zoomAt,
} from './geometry.js';

const GRID = { size: 50, offsetX: 10, offsetY: 20, visible: true };

test('screen and world are inverses of each other', () => {
  const view = { x: 120, y: -40, zoom: 1.75 };
  const world = { x: 320, y: 210 };
  const round = screenToWorld(worldToScreen(world, view), view);
  assert.ok(Math.abs(round.x - world.x) < 1e-9);
  assert.ok(Math.abs(round.y - world.y) < 1e-9);
});

test('zoom is clamped and garbage falls back to a usable view', () => {
  assert.equal(clampZoom(0), ZOOM_MIN);
  assert.equal(clampZoom(99), ZOOM_MAX);
  assert.equal(clampZoom('nonsense'), 1);
  assert.deepEqual(screenToWorld({ x: 10, y: 10 }, null), { x: 10, y: 10 });
});

// The whole point of zooming at a point: whatever is under the cursor must stay
// under the cursor, or the map appears to run away while scrolling.
test('zooming keeps the anchor point pinned', () => {
  const view = { x: 30, y: 15, zoom: 1 };
  const anchor = { x: 400, y: 300 };
  const before = screenToWorld(anchor, view);
  const zoomed = zoomAt(view, 2.5, anchor);
  const after = screenToWorld(anchor, zoomed);
  assert.ok(Math.abs(after.x - before.x) < 1e-9, 'x drifted');
  assert.ok(Math.abs(after.y - before.y) < 1e-9, 'y drifted');
  assert.equal(zoomed.zoom, 2.5);
});

test('zooming past the limits still pins the anchor', () => {
  const anchor = { x: 100, y: 100 };
  const view = { x: 0, y: 0, zoom: ZOOM_MAX };
  const zoomed = zoomAt(view, 10, anchor);
  assert.equal(zoomed.zoom, ZOOM_MAX);
  const before = screenToWorld(anchor, view);
  const after = screenToWorld(anchor, zoomed);
  assert.ok(Math.abs(after.x - before.x) < 1e-9);
});

test('panning moves the view and leaves zoom alone', () => {
  assert.deepEqual(panBy({ x: 5, y: 5, zoom: 2 }, 10, -3), { x: 15, y: 2, zoom: 2 });
});

// Cell (0,0) starts at the grid offset, not at the image corner: that is what
// calibration means.
test('cells are measured from the grid offset, both ways', () => {
  assert.deepEqual(worldToCell({ x: 10, y: 20 }, GRID), { col: 0, row: 0 });
  assert.deepEqual(worldToCell({ x: 59, y: 69 }, GRID), { col: 0, row: 0 });
  assert.deepEqual(worldToCell({ x: 60, y: 70 }, GRID), { col: 1, row: 1 });
  assert.deepEqual(cellToWorld({ col: 1, row: 1 }, GRID), { x: 60, y: 70 });
  assert.deepEqual(worldToCell({ x: 0, y: 0 }, GRID), { col: -1, row: -1 }, 'left of the grid is a negative cell');
});

test('a token rect is its cell position and span scaled by the cell size', () => {
  const rect = tokenWorldRect({ x: 2, y: 3, w: 2, h: 1 }, GRID);
  assert.deepEqual(rect, { x: 110, y: 170, width: 100, height: 50 });
  // A missing span still draws something rather than a zero-sized ghost.
  assert.equal(tokenWorldRect({ x: 0, y: 0 }, GRID).width, 50);
});

test('dropping keeps the grab point under the pointer, then snaps', () => {
  // Grabbed 20px into a piece sitting at cell (2,3): dragging the pointer to
  // world (170,220) must put the piece back on a whole cell, not 20px off it.
  const position = dropPosition({
    pointerWorld: { x: 170, y: 220 },
    grabOffset: { x: 20, y: 20 },
    grid: GRID,
  });
  assert.deepEqual(position, { x: 3, y: 4 });

  const free = dropPosition({
    pointerWorld: { x: 170, y: 220 },
    grabOffset: { x: 20, y: 20 },
    grid: GRID,
    snap: false,
  });
  assert.ok(Math.abs(free.x - 2.8) < 1e-9, 'without snapping the exact position survives');
});

test('hit testing picks the topmost token and nothing outside', () => {
  const low = { id: 'low', x: 0, y: 0, w: 2, h: 2, z: 0 };
  const high = { id: 'high', x: 1, y: 1, w: 2, h: 2, z: 5 };
  const tokens = [low, high];
  // Cell (1,1) is covered by both; z decides.
  assert.equal(tokenAtPoint(tokens, cellToWorld({ col: 1, row: 1 }, GRID), GRID).id, 'high');
  assert.equal(tokenAtPoint(tokens, cellToWorld({ col: 0, row: 0 }, GRID), GRID).id, 'low');
  assert.equal(tokenAtPoint(tokens, { x: 5000, y: 5000 }, GRID), null);
  assert.equal(tokenAtPoint([], { x: 0, y: 0 }, GRID), null);
});

test('fit centres the image and never zooms outside the limits', () => {
  const view = fitView({ imageWidth: 1000, imageHeight: 500, viewportWidth: 600, viewportHeight: 400 });
  assert.ok(view.zoom < 1, 'a large image is zoomed out to fit');
  const centre = worldToScreen({ x: 500, y: 250 }, view);
  assert.ok(Math.abs(centre.x - 300) < 1e-9, 'horizontally centred');
  assert.ok(Math.abs(centre.y - 200) < 1e-9, 'vertically centred');

  const tiny = fitView({ imageWidth: 1, imageHeight: 1, viewportWidth: 4000, viewportHeight: 4000 });
  assert.equal(tiny.zoom, ZOOM_MAX);
});

test('fill centres the image and crops it to cover the whole viewport', () => {
  const view = fillView({
    imageWidth: 1000,
    imageHeight: 500,
    viewportWidth: 600,
    viewportHeight: 400,
  });

  assert.equal(view.zoom, 0.8, 'height determines the cover scale');
  assert.equal(view.x, -100, 'the wider image is cropped equally on both sides');
  assert.equal(view.y, 0, 'there is no empty space above or below');
  assert.deepEqual(worldToScreen({ x: 500, y: 250 }, view), { x: 300, y: 200 });
});
