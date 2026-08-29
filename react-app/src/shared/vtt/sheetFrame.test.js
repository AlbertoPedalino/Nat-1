import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MIN_SHEET_HEIGHT,
  MIN_SHEET_WIDTH,
  SHEET_VISIBLE_GRIP,
  clampSheetFrame,
  normalizeSheetFrame,
  readSheetFrame,
  writeSheetFrame,
} from './sheetFrame.js';

const bounds = { width: 1600, height: 900 };

function fakeStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
  };
}

test('a frame needs a position, and a size only if one was chosen', () => {
  assert.deepEqual(
    normalizeSheetFrame({ left: 10.4, top: 20.6, width: 500.2, height: 400.9 }),
    { left: 10, top: 21, width: 500, height: 401 },
  );
  // Moved but never resized: the size stays the responsive CSS default.
  assert.deepEqual(
    normalizeSheetFrame({ left: 10, top: 20 }),
    { left: 10, top: 20, width: null, height: null },
  );
  // Half a size is no size.
  assert.deepEqual(
    normalizeSheetFrame({ left: 10, top: 20, width: 500 }),
    { left: 10, top: 20, width: null, height: null },
  );
});

test('a position is refused rather than coerced', () => {
  assert.equal(normalizeSheetFrame(null), null);
  assert.equal(normalizeSheetFrame('not json'), null);
  assert.equal(normalizeSheetFrame({ left: 0, top: 0 }).left, 0);
  // `Number(null)` and `Number([])` are both 0, so a truncated entry would
  // otherwise read as a deliberate placement in the corner.
  assert.equal(normalizeSheetFrame({ left: null, top: null }), null);
  assert.equal(normalizeSheetFrame({ left: [], top: 0 }), null);
  assert.equal(normalizeSheetFrame({ left: '10', top: 20 }), null);
  assert.equal(normalizeSheetFrame({ left: Infinity, top: 0 }), null);
});

test('a size of zero or less is no size at all', () => {
  const frame = normalizeSheetFrame({ left: 0, top: 0, width: 0, height: 300 });
  assert.equal(frame.width, null);
  assert.equal(frame.height, null);
});

test('a remembered frame round-trips through storage as JSON', () => {
  const storage = fakeStorage();
  assert.equal(readSheetFrame(storage, 'missing'), null);
  writeSheetFrame(storage, 'frame', { left: 120, top: 64, width: 640, height: 520 });
  assert.deepEqual(readSheetFrame(storage, 'frame'), {
    left: 120, top: 64, width: 640, height: 520,
  });
});

test('a blocked storage costs the position, not the sheet', () => {
  const blocked = {
    getItem() { throw new Error('denied'); },
    setItem() { throw new Error('denied'); },
  };
  assert.equal(readSheetFrame(blocked, 'frame'), null);
  assert.doesNotThrow(() => writeSheetFrame(blocked, 'frame', { left: 0, top: 0 }));
});

test('a frame kept inside the map is returned untouched', () => {
  const frame = { left: 300, top: 80, width: 700, height: 560 };
  assert.deepEqual(clampSheetFrame(frame, bounds), frame);
});

test('a frame from a bigger screen is fitted to this one', () => {
  const fitted = clampSheetFrame({ left: 40, top: 30, width: 3000, height: 2000 }, bounds);
  assert.equal(fitted.width, Math.round(1600 * 0.94));
  assert.equal(fitted.height, Math.round(900 * 0.92));
});

test('a panel dragged off either edge stays catchable by its grip', () => {
  const size = { width: 600, height: 400 };
  assert.equal(
    clampSheetFrame({ left: 5000, top: 10, ...size }, bounds).left,
    bounds.width - SHEET_VISIBLE_GRIP,
  );
  assert.equal(
    clampSheetFrame({ left: -5000, top: 10, ...size }, bounds).left,
    -600 + SHEET_VISIBLE_GRIP,
  );
});

test('the left edge is measured against the width the panel ends up with', () => {
  // Shrunk from 3000 to 1504, so the far-left limit moves with it. Keeping the
  // old width would let the panel sit entirely off the map.
  const shrunk = clampSheetFrame({ left: -5000, top: 0, width: 3000, height: 400 }, bounds);
  assert.equal(shrunk.left, -shrunk.width + SHEET_VISIBLE_GRIP);
});

test('a frame with no size is clamped against the size the panel is rendering at', () => {
  const moved = { left: -5000, top: 0 };
  assert.equal(
    clampSheetFrame(moved, bounds, { width: 620, height: 420 }).left,
    -620 + SHEET_VISIBLE_GRIP,
  );
  // Nothing rendered to measure yet: fall back to the narrowest a sheet can be,
  // which keeps more of it on screen rather than less.
  assert.equal(clampSheetFrame(moved, bounds).left, -MIN_SHEET_WIDTH + SHEET_VISIBLE_GRIP);
});

test('a moved-only frame is never given a size by the clamp', () => {
  const fitted = clampSheetFrame({ left: 100, top: 40 }, bounds, { width: 620, height: 420 });
  assert.equal(fitted.width, null);
  assert.equal(fitted.height, null);
});

test('the title bar never goes above the map or below its bottom edge', () => {
  const size = { width: 600, height: 400 };
  assert.equal(clampSheetFrame({ left: 0, top: -400, ...size }, bounds).top, 0);
  assert.equal(clampSheetFrame({ left: 0, top: 9000, ...size }, bounds).top, 860);
});

test('a container too small to hold the minimum still yields a usable frame', () => {
  const tiny = clampSheetFrame(
    { left: 0, top: 0, width: 600, height: 400 },
    { width: 200, height: 150 },
  );
  assert.equal(tiny.width, MIN_SHEET_WIDTH);
  assert.equal(tiny.height, MIN_SHEET_HEIGHT);
});

test('an unmeasured container restores nothing rather than pinning the corner', () => {
  const frame = { left: 300, top: 80, width: 700, height: 560 };
  assert.equal(clampSheetFrame(frame, { width: 0, height: 0 }), null);
  assert.equal(clampSheetFrame(frame, undefined), null);
});
