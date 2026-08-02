// Fog of war state: one bit per grid cell, set = revealed.
//
// A bitset instead of an array of booleans because a 100x100 scene is 10k cells:
// as JSON that is ~50 KB on every sync, as a base64 bitset it is ~1.7 KB. Only
// the GM writes fog, so unlike tokens there is no concurrent writer and a single
// blob on the scene row is the right shape.
//
// This is presentation, not security — the map image itself still reaches every
// client. See the header of supabase/vtt.sql.

const MAX_SIDE = 400;

function clampSide(value) {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(MAX_SIDE, parsed);
}

function byteLength(cols, rows) {
  return Math.ceil((cols * rows) / 8);
}

export function encodeCells(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function decodeCells(encoded, expectedLength) {
  const bytes = new Uint8Array(expectedLength);
  if (typeof encoded !== 'string' || !encoded) return bytes;
  let binary;
  try {
    binary = atob(encoded);
  } catch {
    // A corrupt payload reads as "nothing revealed" rather than throwing in the
    // middle of a render.
    return bytes;
  }
  const length = Math.min(expectedLength, binary.length);
  for (let index = 0; index < length; index += 1) bytes[index] = binary.charCodeAt(index) & 0xff;
  return bytes;
}

export function createFog(cols, rows) {
  const width = clampSide(cols);
  const height = clampSide(rows);
  return {
    cols: width,
    rows: height,
    cells: encodeCells(new Uint8Array(byteLength(width, height))),
  };
}

// Returns null for "this scene has no fog", which is a different state from
// "fog covering everything".
export function normalizeFog(value) {
  if (!value || typeof value !== 'object') return null;
  const cols = clampSide(value.cols);
  const rows = clampSide(value.rows);
  const bytes = decodeCells(value.cells, byteLength(cols, rows));
  return { cols, rows, cells: encodeCells(bytes) };
}

export function isRevealed(fog, col, row) {
  if (!fog) return true;
  if (col < 0 || row < 0 || col >= fog.cols || row >= fog.rows) return false;
  const index = row * fog.cols + col;
  const bytes = decodeCells(fog.cells, byteLength(fog.cols, fog.rows));
  return Boolean(bytes[index >> 3] & (1 << (index & 7)));
}

// Bulk update: a brush stroke touches many cells, and decoding once per cell
// would make a drag quadratic.
export function setCells(fog, cells, revealed) {
  if (!fog) return null;
  const bytes = decodeCells(fog.cells, byteLength(fog.cols, fog.rows));
  for (const cell of cells || []) {
    const col = Math.round(Number(cell?.col));
    const row = Math.round(Number(cell?.row));
    if (!Number.isFinite(col) || !Number.isFinite(row)) continue;
    if (col < 0 || row < 0 || col >= fog.cols || row >= fog.rows) continue;
    const index = row * fog.cols + col;
    const mask = 1 << (index & 7);
    if (revealed) bytes[index >> 3] |= mask;
    else bytes[index >> 3] &= ~mask;
  }
  return { cols: fog.cols, rows: fog.rows, cells: encodeCells(bytes) };
}

export function revealAll(fog) {
  if (!fog) return null;
  const bytes = new Uint8Array(byteLength(fog.cols, fog.rows)).fill(0xff);
  return { cols: fog.cols, rows: fog.rows, cells: encodeCells(bytes) };
}

export function hideAll(fog) {
  if (!fog) return null;
  return createFog(fog.cols, fog.rows);
}

// Square brush centred on a cell. `size` is the side in cells, so 1 paints one
// square and 3 paints the 3x3 around it.
export function brushCells(col, row, size = 1) {
  const side = Math.max(1, Math.round(Number(size) || 1));
  const half = Math.floor(side / 2);
  const startCol = Math.round(col) - half;
  const startRow = Math.round(row) - half;
  const cells = [];
  for (let dy = 0; dy < side; dy += 1) {
    for (let dx = 0; dx < side; dx += 1) {
      cells.push({ col: startCol + dx, row: startRow + dy });
    }
  }
  return cells;
}

// How many cells cover an image at the scene's calibration. The offset shifts
// the first line, so a partially covered cell at the edge still counts.
export function fogSizeForImage({ width, height }, grid) {
  const size = Math.max(1, Number(grid?.size) || 1);
  return {
    cols: clampSide(Math.ceil(((Number(width) || 0) + (Number(grid?.offsetX) || 0)) / size)),
    rows: clampSide(Math.ceil(((Number(height) || 0) + (Number(grid?.offsetY) || 0)) / size)),
  };
}
