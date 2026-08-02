// Fog of war state: one bit per fog cell, set = revealed.
//
// A bitset instead of an array of booleans because the counts are large: a 60x40
// square map at four fog cells to a side is 38k bits — ~4.8 KB base64, against
// ~190 KB as a JSON array. Only the GM writes fog, so unlike tokens there is no
// concurrent writer and a single blob on the scene row is the right shape.
//
// This is presentation, not security — the map image itself still reaches every
// client. See the header of supabase/vtt.sql.

const MAX_SIDE = 1200;

// Fog cells are SMALLER than grid squares: four to a side, sixteen to a square.
// One bit per grid square could only ever reveal a whole square at a time, which
// makes a doorway or the lit half of a room impossible to show. Four is enough
// for the brush to read as round and for a partial square to look deliberate,
// without the payload turning into a bitmap.
export const DEFAULT_FOG_SCALE = 4;
const MAX_SCALE = 8;

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

export function normalizeScale(scale) {
  const parsed = Math.round(Number(scale));
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_FOG_SCALE;
  return Math.min(MAX_SCALE, parsed);
}

// `cols`/`rows` are counted in fog cells, not in grid squares.
export function createFog(cols, rows, scale = DEFAULT_FOG_SCALE) {
  const width = clampSide(cols);
  const height = clampSide(rows);
  return {
    cols: width,
    rows: height,
    scale: normalizeScale(scale),
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
  // Fog written before the sub-cell resolution existed had one cell per square.
  return { cols, rows, scale: normalizeScale(value.scale ?? 1), cells: encodeCells(bytes) };
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
  return { cols: fog.cols, rows: fog.rows, scale: fog.scale, cells: encodeCells(bytes) };
}

export function revealAll(fog) {
  if (!fog) return null;
  const bytes = new Uint8Array(byteLength(fog.cols, fog.rows)).fill(0xff);
  return { cols: fog.cols, rows: fog.rows, scale: fog.scale, cells: encodeCells(bytes) };
}

export function hideAll(fog) {
  if (!fog) return null;
  return createFog(fog.cols, fog.rows, fog.scale);
}

// Round brush centred on a cell. `size` is the diameter in cells, so 1 paints
// one square and 3 paints a plus-shaped disc rather than a full 3x3 block.
//
// Round because a square brush leaves stepped corners along every wall it
// follows: revealing a corridor with it looks like pixel art, and correcting the
// corners by hand is most of the work.
export function brushCells(col, row, size = 1) {
  const diameter = Math.max(1, Math.round(Number(size) || 1));
  const centreCol = Math.round(col);
  const centreRow = Math.round(row);
  if (diameter === 1) return [{ col: centreCol, row: centreRow }];

  const radius = diameter / 2;
  const reach = Math.ceil(radius);
  const cells = [];
  for (let dy = -reach; dy <= reach; dy += 1) {
    for (let dx = -reach; dx <= reach; dx += 1) {
      // Measured centre to centre, so an even diameter stays symmetric around
      // the cell the pointer is actually on.
      if (Math.sqrt(dx * dx + dy * dy) > radius - 0.5) continue;
      cells.push({ col: centreCol + dx, row: centreRow + dy });
    }
  }
  return cells.length ? cells : [{ col: centreCol, row: centreRow }];
}

// How many fog cells cover an image at the scene's calibration. The offset
// shifts the first line, so a partially covered square at the edge still counts.
export function fogSizeForImage({ width, height }, grid, scale = DEFAULT_FOG_SCALE) {
  const size = Math.max(1, Number(grid?.size) || 1) / normalizeScale(scale);
  return {
    cols: clampSide(Math.ceil(((Number(width) || 0) + (Number(grid?.offsetX) || 0)) / size)),
    rows: clampSide(Math.ceil(((Number(height) || 0) + (Number(grid?.offsetY) || 0)) / size)),
  };
}
