import test from 'node:test';
import assert from 'node:assert/strict';
import { placeAroundCenter } from '../../../../../src/shared/vtt/tokens/placement.js';
import { hexDistance } from '../../../../../src/shared/vtt/map/hexGeometry.js';

const square = { shape: 'square', size: 50 };
const hex = { shape: 'hex', size: 50 };
const at = (placed) => placed.map((token) => [token.x, token.y]);

test('a piece placed with a click lands on the centre of the view when it is free', () => {
  assert.deepEqual(at(placeAroundCenter([{ id: 'a' }], [], { x: 12, y: 7 }, { grid: square })), [[12, 7]]);
  assert.deepEqual(at(placeAroundCenter([{ id: 'a' }], [], { x: 12, y: 7 }, { grid: hex })), [[12, 7]]);
});

test('a group gathers around the centre, next to it rather than off to one side', () => {
  const placed = placeAroundCenter([{}, {}, {}, {}, {}], [{ x: 10, y: 10 }], { x: 10, y: 10 }, { grid: square });
  const cells = at(placed);
  assert.equal(new Set(cells.map((cell) => cell.join(':'))).size, 5, 'no two pieces share a square');
  cells.forEach(([x, y]) => assert.ok(Math.max(Math.abs(x - 10), Math.abs(y - 10)) === 1, `${x}:${y} is next to the centre`));
});

test('on a hex map the pieces fill the ring of hexes around the centre', () => {
  const center = { x: -3, y: 8 };
  const placed = placeAroundCenter(Array.from({ length: 7 }, () => ({})), [], center, { grid: hex });
  const cells = at(placed);
  assert.deepEqual(cells[0], [-3, 8]);
  assert.equal(new Set(cells.map((cell) => cell.join(':'))).size, 7);
  cells.slice(1).forEach(([q, r]) => assert.equal(hexDistance({ q, r }, { q: center.x, r: center.y }), 1));
});

test('a large square piece is centred on the cell and avoids covering others', () => {
  const [ogre] = placeAroundCenter([{ w: 2, h: 2 }], [], { x: 5, y: 5 }, { grid: square });
  assert.deepEqual([ogre.x, ogre.y], [4, 4]);
  const [second] = placeAroundCenter([{ w: 2, h: 2 }], [{ x: 4, y: 4, w: 2, h: 2 }], { x: 5, y: 5 }, { grid: square });
  const overlaps = second.x < 6 && second.x + 2 > 4 && second.y < 6 && second.y + 2 > 4;
  assert.equal(overlaps, false);
});

// A player's piece outside the play area would be hidden from them by RLS the
// moment it is created.
test('only accepted cells are used, so a player piece stays inside the play area', () => {
  const inside = ({ x, y }) => x >= 0 && y >= 0 && x < 10 && y < 10;
  const [piece] = placeAroundCenter([{}], [], { x: -4, y: 3 }, { grid: square, accept: inside });
  assert.ok(inside(piece), `${piece.x}:${piece.y} is inside the play area`);
  assert.deepEqual([piece.x, piece.y], [0, 3], 'and as close to the centre as the area allows');
});
