import test from 'node:test';
import assert from 'node:assert/strict';
import { hexFootprint, hexPieceAxial, hexPieceCentre, hexToWorld } from '../../../../../src/shared/vtt/map/hexGeometry.js';
import { tokenWorldRect, dropPosition } from '../../../../../src/shared/vtt/map/geometry.js';

const grid = { shape: 'hex', size: 60, offsetX: 0, offsetY: 0 };
const keys = (cells) => cells.map(({ q, r }) => `${q}:${r}`).sort();

test('a piece covers the hexes of its size: 1, 3, 7, 12', () => {
  assert.deepEqual(keys(hexFootprint({ q: 2, r: 3 }, 1)), ['2:3']);
  assert.deepEqual(keys(hexFootprint({ q: 0, r: 0 }, 2)), ['0:0', '0:1', '1:0']);
  assert.equal(hexFootprint({ q: 0, r: 0 }, 3).length, 7);
  assert.deepEqual(keys(hexFootprint({ q: 0, r: 0 }, 3)), ['-1:0', '-1:1', '0:-1', '0:0', '0:1', '1:-1', '1:0']);
  assert.equal(hexFootprint({ q: 0, r: 0 }, 4).length, 12);
  for (const cell of [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 0, r: 1 }]) {
    assert.ok(keys(hexFootprint({ q: 0, r: 0 }, 4)).includes(`${cell.q}:${cell.r}`));
  }
});

test('an odd piece is centred on its hex, an even one on the corner of its three hexes', () => {
  assert.deepEqual(hexPieceCentre({ q: 1, r: 1 }, 1, grid), hexToWorld({ q: 1, r: 1 }, grid));
  assert.deepEqual(hexPieceCentre({ q: 1, r: 1 }, 3, grid), hexToWorld({ q: 1, r: 1 }, grid));
  const corner = hexPieceCentre({ q: 0, r: 0 }, 2, grid);
  for (const cell of [{ q: 0, r: 0 }, { q: 1, r: 0 }, { q: 0, r: 1 }]) {
    const centre = hexToWorld(cell, grid);
    assert.ok(Math.abs(Math.hypot(centre.x - corner.x, centre.y - corner.y) - 60 / Math.sqrt(3)) < 1e-9);
  }
  const back = hexPieceAxial(corner, 2, grid);
  assert.ok(Math.abs(back.q) < 1e-9 && Math.abs(back.r) < 1e-9);
});

test('a Large piece is drawn on its corner and dropped back on the same hex', () => {
  const token = { x: 3, y: 2, w: 2, h: 2 };
  const rect = tokenWorldRect(token, grid);
  const corner = hexPieceCentre({ q: 3, r: 2 }, 2, grid);
  assert.ok(Math.abs(rect.x + rect.width / 2 - corner.x) < 1e-9);
  assert.ok(Math.abs(rect.y + rect.height / 2 - corner.y) < 1e-9);
  const landing = dropPosition({ pointerWorld: { x: rect.x, y: rect.y }, grabOffset: { x: 0, y: 0 }, grid, span: { w: 2, h: 2 } });
  assert.deepEqual(landing, { x: 3, y: 2 });
});
