// Reading a One Page Dungeon export.
//
// The file is a list of rectangles, a list of doors, and a few notes — all in
// whole cells, which is what makes it worth having: it says where the rooms are
// on a grid, and the picture beside it only says what they look like.
//
// The rectangles are not all rooms. Three kinds are mixed in one list:
//
//   * every door has a 1×1 rectangle at its own coordinates, because a doorway
//     is a square you can stand in;
//   * anything one cell wide is a corridor — a bend, a junction, or a run of
//     six cells: a passage you can only walk down single file is not a room;
//   * the rest are rooms.
//
// Nothing in the file marks which is which, so the doors are matched by
// coordinate and the remainder is split on width. A corridor is not a room to
// put a dragon in.

const numberOr = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

function cellKey(x, y) {
  return `${Math.round(x)}:${Math.round(y)}`;
}

function toRect(raw) {
  if (!raw) return null;
  const w = Math.round(numberOr(raw.w));
  const h = Math.round(numberOr(raw.h));
  if (w <= 0 || h <= 0) return null;
  return {
    x: Math.round(numberOr(raw.x)),
    y: Math.round(numberOr(raw.y)),
    w,
    h,
    // The generator's own words for a shape, worth keeping: a rotunda and a dead
    // end read differently at the table.
    rotunda: Boolean(raw.rotunda),
    ending: Boolean(raw.ending),
  };
}

// One cell wide in either direction is a passage, not a place: a 1×6 hall is
// somewhere the party walks through single file, and handing it an encounter
// and a chest would make a corridor the best room in the dungeon.
export function isRoomRect(rect) {
  return rect.w > 1 && rect.h > 1;
}

// Reading order, so the key runs the way an eye crosses the page rather than
// the way the generator happened to emit its rectangles.
function readingOrder(a, b) {
  return a.y - b.y || a.x - b.x;
}

function contains(rect, point) {
  return point.x >= rect.x && point.x <= rect.x + rect.w
    && point.y >= rect.y && point.y <= rect.y + rect.h;
}

export function parseWatabouDungeon(json) {
  const source = typeof json === 'string' ? JSON.parse(json) : json;
  if (!source || !Array.isArray(source.rects)) {
    throw new Error('That file is not a One Page Dungeon export.');
  }

  const doors = (source.doors || []).map((door) => ({
    x: Math.round(numberOr(door?.x)),
    y: Math.round(numberOr(door?.y)),
    dir: { x: numberOr(door?.dir?.x), y: numberOr(door?.dir?.y) },
    type: numberOr(door?.type),
  }));
  const doorCells = new Set(doors.map((door) => cellKey(door.x, door.y)));

  const rects = source.rects.map(toRect).filter(Boolean);
  const spaces = rects.filter((rect) => (
    !(rect.w === 1 && rect.h === 1 && doorCells.has(cellKey(rect.x, rect.y)))
  ));

  // A room is a space more than one cell wide in both directions. Anything
  // narrower is a corridor however long it runs, kept separately so it can still
  // be drawn on without being handed an encounter.
  const rooms = spaces
    .filter(isRoomRect)
    .sort(readingOrder)
    .map((rect, index) => ({
      ...rect,
      id: `room_${index + 1}`,
      number: index + 1,
      centre: { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 },
      notes: [],
    }));

  const corridors = spaces
    .filter((rect) => !isRoomRect(rect))
    .sort(readingOrder);

  // The generator's own notes belong to whichever room they were written in, so
  // its "a chest with a bat-shaped key" and our roll for that room end up on the
  // same line of the key.
  const notes = (source.notes || []).map((note) => ({
    text: String(note?.text || ''),
    ref: note?.ref == null ? null : String(note.ref),
    pos: { x: numberOr(note?.pos?.x), y: numberOr(note?.pos?.y) },
  }));
  for (const note of notes) {
    const room = rooms.find((candidate) => contains(candidate, note.pos));
    if (room) room.notes.push(note);
  }

  return {
    title: String(source.title || '').trim() || 'Dungeon',
    story: String(source.story || '').trim(),
    version: String(source.version || ''),
    rooms,
    corridors,
    doors,
    notes,
    bounds: boundsOf(rects),
  };
}

// The dungeon's extent in cells. Every coordinate in the file is relative to an
// origin that can be anywhere, including well into the negatives.
export function boundsOf(rects) {
  if (!rects?.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const rect of rects) {
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.w);
    maxY = Math.max(maxY, rect.y + rect.h);
  }
  return {
    minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY,
  };
}

// How big a cell is in the exported picture, and where cell (0, 0) sits on it.
//
// The export puts a margin around the dungeon and never says how wide it is —
// but it is the same margin on every side, so two numbers we do have (the
// picture's width and height) give two equations for the two we do not (the
// cell size and the margin):
//
//   cell = imageWidth / (cells across + 2 margin) = imageHeight / (cells down + 2 margin)
//
// which solves for the margin directly. A square picture of a square dungeon
// cancels itself out and leaves nothing to solve, so that one case falls back to
// dividing by the dungeon alone.
export function calibrateFromImage({ width, height }, bounds) {
  const imageWidth = numberOr(width);
  const imageHeight = numberOr(height);
  if (!bounds || imageWidth <= 0 || imageHeight <= 0) return null;

  const across = bounds.width;
  const down = bounds.height;
  if (across <= 0 || down <= 0) return null;

  // W(D + 2m) = H(A + 2m)  →  m = (HA − WD) / 2(W − H)
  const denominator = 2 * (imageWidth - imageHeight);
  let margin = denominator === 0
    ? 0
    : (imageHeight * across - imageWidth * down) / denominator;
  // A negative margin means the picture is cropped tighter than the rooms, which
  // no export does; a huge one means the two numbers disagreed and the answer is
  // noise either way.
  if (!Number.isFinite(margin) || margin < 0 || margin > Math.max(across, down)) margin = 0;
  margin = Math.round(margin * 4) / 4;

  const cellSize = imageWidth / (across + 2 * margin);
  return {
    cellSize,
    margin,
    // Where the dungeon's own origin lands on the picture, in pixels. A token at
    // cell (q, r) belongs at origin + (q, r) × cellSize.
    origin: {
      x: (margin - bounds.minX) * cellSize,
      y: (margin - bounds.minY) * cellSize,
    },
  };
}
