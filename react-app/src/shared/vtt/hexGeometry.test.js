import test from 'node:test';
import assert from 'node:assert/strict';
import {
  axialRound,
  hexCorners,
  hexDistance,
  hexHeight,
  hexKey,
  hexNeighbours,
  hexRowStep,
  hexToWorld,
  hexWidth,
  hexesInRect,
  isHexGrid,
  worldToHex,
} from './hexGeometry.js';

const GRID = { size: 70, offsetX: 0, offsetY: 0, shape: 'hex' };

test('a hex is as wide as the square it replaces, and taller', () => {
  assert.equal(hexWidth(GRID), 70);
  assert.ok(hexHeight(GRID) > 70);
  // Rows interlock rather than stack: three quarters of a height per row.
  assert.ok(Math.abs(hexRowStep(GRID) - (hexHeight(GRID) * 3) / 4) < 1e-9);
  assert.equal(isHexGrid(GRID), true);
  assert.equal(isHexGrid({ size: 70 }), false);
});

test('the origin hex sits on the grid offset', () => {
  const centre = hexToWorld({ q: 0, r: 0 }, { ...GRID, offsetX: 12, offsetY: 8 });
  assert.deepEqual(centre, { x: 12, y: 8 });
});

test('an odd row is pushed half a hex to the right', () => {
  const first = hexToWorld({ q: 0, r: 0 }, GRID);
  const below = hexToWorld({ q: 0, r: 1 }, GRID);
  assert.ok(Math.abs(below.x - (first.x + 35)) < 1e-9);
  assert.ok(Math.abs(below.y - hexRowStep(GRID)) < 1e-9);
});

test('a world point comes back as the hex it was inside', () => {
  for (const cell of [{ q: 0, r: 0 }, { q: 3, r: -2 }, { q: -4, r: 5 }, { q: 7, r: 7 }]) {
    const centre = hexToWorld(cell, GRID);
    assert.deepEqual(worldToHex(centre, GRID), cell, `centre of ${hexKey(cell)}`);
    // Just inside the top corner is still the same hex.
    assert.deepEqual(worldToHex({ x: centre.x, y: centre.y - hexHeight(GRID) / 2 + 1 }, GRID), cell);
  }
});

test('a point near a shared edge lands in the nearer hex, not the nearer axis', () => {
  const left = hexToWorld({ q: 0, r: 0 }, GRID);
  const right = hexToWorld({ q: 1, r: 0 }, GRID);
  const justPastTheMiddle = { x: (left.x + right.x) / 2 + 1, y: left.y };
  assert.deepEqual(worldToHex(justPastTheMiddle, GRID), { q: 1, r: 0 });
  const justBeforeIt = { x: (left.x + right.x) / 2 - 1, y: left.y };
  assert.deepEqual(worldToHex(justBeforeIt, GRID), { q: 0, r: 0 });
});

test('rounding recomputes the axis that moved furthest', () => {
  // q + r + s must stay zero, so rounding each axis on its own is not enough.
  const rounded = axialRound({ q: 0.4, r: 0.4 });
  assert.equal(rounded.q + rounded.r + -(rounded.q + rounded.r), 0);
  assert.deepEqual(axialRound({ q: 0, r: 0 }), { q: 0, r: 0 });
  assert.deepEqual(axialRound({ q: 2.2, r: -1.1 }), { q: 2, r: -1 });
});

test('a hex has six corners, the first one straight up', () => {
  const corners = hexCorners({ q: 0, r: 0 }, GRID);
  assert.equal(corners.length, 6);
  assert.ok(Math.abs(corners[0].x) < 1e-9);
  assert.ok(Math.abs(corners[0].y + hexHeight(GRID) / 2) < 1e-9);
  // Opposite corners are a full height apart.
  assert.ok(Math.abs(corners[3].y - corners[0].y - hexHeight(GRID)) < 1e-9);
});

test('distance is counted in steps, and every neighbour is one step away', () => {
  assert.equal(hexDistance({ q: 0, r: 0 }, { q: 0, r: 0 }), 0);
  assert.equal(hexDistance({ q: 0, r: 0 }, { q: 3, r: 0 }), 3);
  assert.equal(hexDistance({ q: 0, r: 0 }, { q: -2, r: 5 }), 5);
  const neighbours = hexNeighbours({ q: 4, r: -1 });
  assert.equal(neighbours.length, 6);
  for (const neighbour of neighbours) {
    assert.equal(hexDistance({ q: 4, r: -1 }, neighbour), 1);
  }
});

test('a viewport rectangle asks only for the hexes it covers', () => {
  const cells = hexesInRect({ x: 0, y: 0, width: 210, height: 210 }, GRID);
  const keys = new Set(cells.map(hexKey));
  assert.ok(keys.has('0:0'));
  assert.ok(keys.has('1:1'));
  // Bounded, with a ring of slack — never the whole plane.
  assert.ok(cells.length < 100, `asked for ${cells.length} hexes`);
  for (const cell of cells) {
    const centre = hexToWorld(cell, GRID);
    assert.ok(centre.x > -3 * 70 && centre.x < 210 + 3 * 70, `column ${hexKey(cell)} is far off screen`);
    assert.ok(centre.y > -3 * 70 && centre.y < 210 + 3 * 70, `row ${hexKey(cell)} is far off screen`);
  }
});
