import test from 'node:test';
import assert from 'node:assert/strict';
import {
  brushCells,
  brushStrokeCells,
  normalizeScale,
  createFog,
  decodeCells,
  encodeCells,
  fogSizeForImage,
  hideAll,
  isRevealed,
  normalizeFog,
  revealAll,
  setCells,
} from '../../../../../src/shared/vtt/map/fog.js';

test('a fast diagonal fog stroke covers the whole path and has round ends', () => {
  const cells = brushStrokeCells({ col: 2.5, row: 2.5 }, { col: 18.5, row: 18.5 }, 4, { cols: 24, rows: 24 });
  const keys = new Set(cells.map(({ col, row }) => `${col}:${row}`));
  for (let index = 2; index <= 18; index += 1) assert.ok(keys.has(`${index}:${index}`));
  assert.ok(keys.has('0:2'));
  assert.equal(keys.has('0:0'), false);
  assert.equal(keys.has('2:18'), false);
  assert.equal(keys.size, cells.length, 'each cell is emitted once');
});

test('fog stroke coverage is independent of pointer event frequency and direction', () => {
  const from = { col: 2.25, row: 3.75 };
  const middle = { col: 8.25, row: 7.75 };
  const to = { col: 14.25, row: 11.75 };
  const bounds = { cols: 20, rows: 20 };
  const keys = (cells) => new Set(cells.map(({ col, row }) => `${col}:${row}`));
  const whole = keys(brushStrokeCells(from, to, 4, bounds));
  assert.deepEqual(whole, keys([
    ...brushStrokeCells(from, middle, 4, bounds),
    ...brushStrokeCells(middle, to, 4, bounds),
  ]));
  assert.deepEqual(whole, keys(brushStrokeCells(to, from, 4, bounds)));
});

test('a stationary fog brush paints a disc and clips strokes to the map', () => {
  const at = { col: 0.5, row: 0.5 };
  const bounds = { cols: 4, rows: 4 };
  assert.deepEqual(brushStrokeCells(at, at, 1, bounds), [{ col: 0, row: 0 }]);
  assert.deepEqual(brushStrokeCells({ col: 1, row: 1 }, { col: 1, row: 1 }, 1, bounds), [{ col: 1, row: 1 }]);
  const cells = brushStrokeCells({ col: -20, row: -20 }, { col: 20, row: 20 }, 4, bounds);
  assert.ok(cells.length > 4);
  assert.ok(cells.every(({ col, row }) => col >= 0 && row >= 0 && col < 4 && row < 4));
  assert.deepEqual(brushStrokeCells(at, { col: NaN, row: 0 }, 4, bounds), []);
});

test('a new fog covers everything', () => {
  const fog = createFog(10, 8);
  assert.equal(fog.cols, 10);
  assert.equal(fog.rows, 8);
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 10; col += 1) {
      assert.equal(isRevealed(fog, col, row), false);
    }
  }
});

test('revealing touches only the cells asked for', () => {
  const fog = setCells(createFog(4, 4), [{ col: 1, row: 2 }, { col: 3, row: 0 }], true);
  assert.equal(isRevealed(fog, 1, 2), true);
  assert.equal(isRevealed(fog, 3, 0), true);
  assert.equal(isRevealed(fog, 0, 0), false);
  assert.equal(isRevealed(fog, 1, 3), false);

  const recovered = setCells(fog, [{ col: 1, row: 2 }], false);
  assert.equal(isRevealed(recovered, 1, 2), false);
  assert.equal(isRevealed(recovered, 3, 0), true, 'covering one cell leaves the rest alone');
});

// Bit indexing across byte boundaries is where an off-by-one hides: cell 7 and
// cell 8 live in different bytes.
test('cells across byte boundaries stay independent', () => {
  let fog = createFog(16, 1);
  fog = setCells(fog, [{ col: 7, row: 0 }], true);
  assert.equal(isRevealed(fog, 7, 0), true);
  assert.equal(isRevealed(fog, 6, 0), false);
  assert.equal(isRevealed(fog, 8, 0), false);

  fog = setCells(fog, [{ col: 8, row: 0 }], true);
  assert.equal(isRevealed(fog, 7, 0), true);
  assert.equal(isRevealed(fog, 8, 0), true);
  assert.equal(isRevealed(fog, 9, 0), false);
});

test('out-of-range cells are ignored, never wrapped onto another row', () => {
  const fog = setCells(createFog(4, 4), [
    { col: -1, row: 0 },
    { col: 4, row: 0 },
    { col: 0, row: 9 },
    { col: NaN, row: 1 },
  ], true);
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      assert.equal(isRevealed(fog, col, row), false, `${col},${row} should be untouched`);
    }
  }
  assert.equal(isRevealed(fog, 4, 0), false, 'a cell outside the scene reads as covered');
});

test('reveal all and hide all flip every cell', () => {
  const open = revealAll(createFog(9, 3));
  const closed = hideAll(open);
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      assert.equal(isRevealed(open, col, row), true);
      assert.equal(isRevealed(closed, col, row), false);
    }
  }
});

// Round, not square: a square brush leaves stepped corners along every wall it
// follows, and straightening those by hand is most of the work.
test('the brush is a disc centred on the cell under the pointer', () => {
  assert.deepEqual(brushCells(5, 5, 1), [{ col: 5, row: 5 }]);

  const three = brushCells(5, 5, 3);
  const keys = new Set(three.map((cell) => `${cell.col}:${cell.row}`));
  assert.ok(keys.has('5:5'), 'the centre is painted');
  assert.ok(keys.has('4:5') && keys.has('6:5') && keys.has('5:4') && keys.has('5:6'), 'the sides are painted');
  assert.equal(keys.has('4:4'), false, 'the corners of the 3x3 are not');
  assert.equal(three.length, 5);

  // Every cell of a larger brush is within the radius of the centre.
  const seven = brushCells(0, 0, 7);
  for (const cell of seven) {
    assert.ok(Math.sqrt(cell.col ** 2 + cell.row ** 2) <= 3.5, `${cell.col},${cell.row} is outside the disc`);
  }
  assert.ok(seven.length > brushCells(0, 0, 5).length, 'a wider brush paints more');

  assert.equal(brushCells(0, 0, 0).length, 1, 'a zero brush still paints one cell');
  assert.equal(brushCells(0, 0, 2).length > 0, true, 'an even diameter still paints something');
});

test('fog survives a round trip through the database shape', () => {
  const fog = setCells(createFog(20, 20), brushCells(10, 10, 3), true);
  const restored = normalizeFog(JSON.parse(JSON.stringify(fog)));
  assert.deepEqual(restored, fog);
  assert.equal(isRevealed(restored, 10, 10), true);
  assert.equal(isRevealed(restored, 12, 12), false);
});

// Null fog means "this scene has no fog", which must not read as "everything is
// hidden" — that would black out every scene that never enabled it.
test('absent fog means no fog, not total darkness', () => {
  assert.equal(normalizeFog(null), null);
  assert.equal(normalizeFog('nonsense'), null);
  assert.equal(isRevealed(null, 3, 3), true);
  assert.equal(setCells(null, [{ col: 0, row: 0 }], true), null);
});

test('a corrupt payload degrades to covered instead of throwing', () => {
  const fog = normalizeFog({ cols: 4, rows: 4, cells: 'not-base64!!' });
  assert.equal(fog.cols, 4);
  assert.equal(isRevealed(fog, 0, 0), false);
  assert.deepEqual([...decodeCells('%%%', 2)], [0, 0]);
});

// Fog cells are smaller than grid squares, so a square map covers `scale` times
// as many of them per side. Without that, revealing half a doorway is impossible.
test('the image is measured in fog cells, not in grid squares', () => {
  assert.deepEqual(fogSizeForImage({ width: 1400, height: 700 }, { size: 70 }, 1), { cols: 20, rows: 10 });
  assert.deepEqual(fogSizeForImage({ width: 1400, height: 700 }, { size: 70 }, 4), { cols: 80, rows: 40 });
  assert.deepEqual(fogSizeForImage({ width: 1400, height: 700 }, { size: 70 }), { cols: 80, rows: 40 });
});

test('scene size is clamped so a bad grid cannot allocate unbounded memory', () => {
  assert.deepEqual(fogSizeForImage({ width: 100, height: 100 }, { size: 0 }, 1), { cols: 100, rows: 100 });
  const huge = fogSizeForImage({ width: 999999, height: 999999 }, { size: 1 });
  assert.equal(huge.cols, 1200);
  assert.equal(huge.rows, 1200);
  assert.equal(createFog(1e9, 1e9).cols, 1200);
});

// Fog saved before the sub-cell resolution existed had one cell per square, and
// must keep reading as such or every old scene would be revealed in the wrong
// places.
test('fog without a scale is read as one cell per square', () => {
  const legacy = normalizeFog({ cols: 4, rows: 4, cells: createFog(4, 4, 1).cells });
  assert.equal(legacy.scale, 1);
  assert.equal(createFog(8, 8).scale, 4);
  assert.equal(normalizeScale(0), 4);
  assert.equal(normalizeScale(99), 8);
  assert.equal(hideAll(createFog(8, 8, 2)).scale, 2, 'covering again keeps the resolution');
  assert.equal(revealAll(createFog(8, 8, 2)).scale, 2);
});

test('the encoded form is compact enough to sync on every stroke', () => {
  const fog = createFog(100, 100);
  assert.ok(fog.cells.length < 2000, `expected a small payload, got ${fog.cells.length} chars`);
  assert.deepEqual([...decodeCells(encodeCells(new Uint8Array([1, 255, 16])), 3)], [1, 255, 16]);
});

test('applyCells reports only the cells that really flipped', async () => {
  const { applyCells, createFog, isRevealed, sameFog } = await import('../../../../../src/shared/vtt/map/fog.js');
  const fog = createFog(4, 4);
  const first = applyCells(fog, [{ col: 1, row: 1 }, { col: 1, row: 1 }, { col: 9, row: 9 }], true);
  assert.deepEqual(first.changed, [5]);
  assert.equal(isRevealed(first.fog, 1, 1), true);
  const again = applyCells(first.fog, [{ col: 1, row: 1 }], true);
  assert.deepEqual(again.changed, []);
  assert.equal(again.fog, first.fog);
  assert.equal(sameFog(again.fog, first.fog), true);
  assert.equal(sameFog(first.fog, fog), false);
  assert.deepEqual(applyCells(null, [{ col: 0, row: 0 }], true), { fog: null, changed: [] });
});

test('fog deltas are compact runs and apply idempotently to the same fog size only', async () => {
  const { applyFogDelta, createFog, fogDelta, isRevealed, toRuns } = await import('../../../../../src/shared/vtt/map/fog.js');
  assert.deepEqual(toRuns([7, 3, 4, 5, 5, 10, -1, 1.5]), [3, 3, 7, 1, 10, 1]);
  const fog = createFog(4, 4);
  const delta = fogDelta(fog, [0, 1, 5], []);
  assert.deepEqual(delta, { cols: 4, rows: 4, on: [0, 2, 5, 1], off: [] });
  const once = applyFogDelta(fog, delta);
  assert.equal(isRevealed(once, 1, 1), true);
  assert.equal(isRevealed(once, 2, 0), false);
  assert.equal(applyFogDelta(once, delta), once);
  const hidden = applyFogDelta(once, { cols: 4, rows: 4, on: [], off: [5, 1] });
  assert.equal(isRevealed(hidden, 1, 1), false);
  assert.equal(applyFogDelta(fog, { ...delta, cols: 5 }), null);
  // Runs past the end are clipped, not written out of bounds.
  const edge = applyFogDelta(fog, { cols: 4, rows: 4, on: [14, 100], off: [] });
  assert.equal(isRevealed(edge, 3, 3), true);
  assert.equal(edge.cells.length, fog.cells.length);
});
