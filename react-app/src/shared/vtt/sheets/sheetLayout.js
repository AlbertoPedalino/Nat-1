import { getStorageItem, setStorageItem } from '../../storage/storage.js';
import { clamp } from '../../numbers.js';

export const DEFAULT_SHEET_SPLIT = 60;
export const MIN_MAP_SPLIT = 35;
export const MAX_MAP_SPLIT = 72;
// A phone rotated to landscape crosses the width breakpoint. Keep its sheet
// below the map unless the viewport also has enough height for two panes.
export const SHEET_SIDE_BY_SIDE_QUERY = '@media (min-width: 768px) and (min-height: 501px)';

export function normalizeSheetSplit(value) {
  if (value === null || value === undefined || value === '') return DEFAULT_SHEET_SPLIT;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_SHEET_SPLIT;
  const clamped = clamp(parsed, MIN_MAP_SPLIT, MAX_MAP_SPLIT);
  return Math.round(clamped * 10) / 10;
}

export function sheetSplitAtPointer(clientX, left, width) {
  if (!Number.isFinite(width) || width <= 0) return DEFAULT_SHEET_SPLIT;
  return normalizeSheetSplit(((Number(clientX) - Number(left || 0)) / width) * 100);
}

export function sheetGridColumns(value) {
  const map = normalizeSheetSplit(value);
  return `minmax(0, ${map}fr) 12px minmax(360px, ${100 - map}fr)`;
}

// A layout preference of this device; a blocked storage only forgets it.
export function readSheetSplit(key) {
  return normalizeSheetSplit(getStorageItem(key));
}

export function writeSheetSplit(key, value) {
  const normalized = normalizeSheetSplit(value);
  setStorageItem(key, normalized);
  return normalized;
}
