import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SHEET_SPLIT,
  MAX_MAP_SPLIT,
  MIN_MAP_SPLIT,
  normalizeSheetSplit,
  readSheetSplit,
  sheetGridColumns,
  sheetSplitAtPointer,
  writeSheetSplit,
} from '../../../../../src/shared/vtt/sheets/sheetLayout.js';

test('sheet split stays inside useful map and sheet widths', () => {
  assert.equal(normalizeSheetSplit(10), MIN_MAP_SPLIT);
  assert.equal(normalizeSheetSplit(90), MAX_MAP_SPLIT);
  assert.equal(normalizeSheetSplit('bad'), DEFAULT_SHEET_SPLIT);
  assert.equal(normalizeSheetSplit(null), DEFAULT_SHEET_SPLIT);
});

test('pointer position becomes the map percentage', () => {
  assert.equal(sheetSplitAtPointer(700, 100, 1000), 60);
  assert.equal(sheetSplitAtPointer(0, 100, 1000), MIN_MAP_SPLIT);
});

test('grid columns carry the selected ratio without losing the divider', () => {
  assert.equal(sheetGridColumns(60), 'minmax(0, 60fr) 12px minmax(360px, 40fr)');
});

test('sheet split preference safely round-trips through storage', () => {
  const values = new Map();
  const had = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) },
  });
  try {
    assert.equal(readSheetSplit('missing'), DEFAULT_SHEET_SPLIT);
    assert.equal(writeSheetSplit('split', 64), 64);
    assert.equal(readSheetSplit('split'), 64);
  } finally {
    if (had) Object.defineProperty(globalThis, 'localStorage', had);
    else delete globalThis.localStorage;
  }
});

test('without a storage the split is the default and writing is harmless', () => {
  assert.equal(readSheetSplit('split'), DEFAULT_SHEET_SPLIT);
  assert.equal(writeSheetSplit('split', 50), 50);
});
