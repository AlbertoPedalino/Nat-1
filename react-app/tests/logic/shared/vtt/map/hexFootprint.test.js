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

test('every size moves by whole hexes in all six directions, wherever it is grabbed', () => {
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];
  for (const span of [1, 2, 3, 4]) {
    const token = { x: 4, y: 3, w: span, h: span };
    const rect = tokenWorldRect(token, grid);
    // Grabbed at a corner, the middle, and somewhere odd on the piece.
    for (const grab of [[0, 0], [rect.width / 2, rect.height / 2], [rect.width * 0.8, rect.height * 0.3]]) {
      const grabOffset = { x: grab[0], y: grab[1] };
      for (const [dq, dr] of directions) {
        const from = hexToWorld({ q: token.x, r: token.y }, grid);
        const to = hexToWorld({ q: token.x + dq, r: token.y + dr }, grid);
        const pointerWorld = { x: rect.x + grab[0] + (to.x - from.x), y: rect.y + grab[1] + (to.y - from.y) };
        const landing = dropPosition({ pointerWorld, grabOffset, grid, span: token });
        assert.deepEqual(landing, { x: token.x + dq, y: token.y + dr }, `span ${span}, move ${dq},${dr}`);
      }
    }
  }
});

test('a piece dropped where it was grabbed stays put, and its footprint moves with it', () => {
  for (const span of [1, 2, 3, 4]) {
    const token = { x: -2, y: 5, w: span, h: span };
    const rect = tokenWorldRect(token, grid);
    const grabOffset = { x: rect.width / 3, y: rect.height / 4 };
    const landing = dropPosition({ pointerWorld: { x: rect.x + grabOffset.x, y: rect.y + grabOffset.y }, grabOffset, grid, span: token });
    assert.deepEqual(landing, { x: -2, y: 5 });
    const moved = hexFootprint({ q: -1, r: 5 }, span).map(({ q, r }) => `${q - 1}:${r}`).sort();
    assert.deepEqual(moved, keys(hexFootprint({ q: -2, r: 5 }, span)));
  }
});
