import test from 'node:test';
import assert from 'node:assert/strict';
import {
  brushCells,
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
} from './fog.js';

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
