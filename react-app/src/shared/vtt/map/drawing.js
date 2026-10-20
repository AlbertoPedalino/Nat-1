// Freehand strokes on a scene, in cell coordinates.
//
// The same rows also hold notes (a stroke with words on it) and areas of effect
// (a stroke with a shape; see areas.js).
//
// A raw stroke is hundreds of points sampled at pointer rate, most of them
// indistinguishable from the line between their neighbours. They are simplified
// before they are stored: the jsonb is smaller, the realtime payload is smaller,
// and the redraw is cheaper — for a line nobody can tell apart from the original.

import { areaGeometry, isPointOnArea, normalizeArea } from './areas.js';

const DEFAULT_TOLERANCE = 0.08; // cells

function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizePoint(point) {
  if (!point) return null;
  const x = Number(point.x);
  const y = Number(point.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  // Cell coordinates never need more than this, and trimming keeps the payload
  // from carrying float noise.
  return { x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 };
}

export function normalizePoints(points) {
  return (Array.isArray(points) ? points : []).map(normalizePoint).filter(Boolean);
}

// Perpendicular distance from `point` to the segment ab. Falls back to the plain
// distance when the segment has no length, which happens whenever a stroke
// pauses on the spot.
function distanceToSegment(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return Math.hypot(point.x - a.x, point.y - a.y);
  const t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  return Math.hypot(point.x - (a.x + clamped * dx), point.y - (a.y + clamped * dy));
}

// Ramer–Douglas–Peucker. Iterative rather than recursive: a long stroke is
// thousands of points and the recursive form can blow the stack on the pathological
// case of an almost-straight line.
export function simplifyStroke(points, tolerance = DEFAULT_TOLERANCE) {
  const list = normalizePoints(points);
  if (list.length < 3) return list;

  const keep = new Array(list.length).fill(false);
  keep[0] = true;
  keep[list.length - 1] = true;
  const stack = [[0, list.length - 1]];

  while (stack.length) {
    const [start, end] = stack.pop();
    let furthest = -1;
    let maxDistance = tolerance;
    for (let index = start + 1; index < end; index += 1) {
      const distance = distanceToSegment(list[index], list[start], list[end]);
      if (distance > maxDistance) {
        maxDistance = distance;
        furthest = index;
      }
    }
    if (furthest === -1) continue;
    keep[furthest] = true;
    stack.push([start, furthest], [furthest, end]);
  }

  return list.filter((_, index) => keep[index]);
}

export function toDrawing(row) {
  if (!row?.id) return null;
  return {
    id: row.id,
    sceneId: row.scene_id || null,
    layer: row.layer || 'tokens',
    points: normalizePoints(row.points),
    color: typeof row.color === 'string' ? row.color : null,
    // Present on a note, absent on a freehand stroke. On an area it is the
    // label ("Spirit Guardians").
    text: typeof row.text === 'string' && row.text ? row.text : null,
    area: normalizeArea(row.area),
    // Hidden by the GM: still on the GM's board, never sent to a player.
    hiddenFromPlayers: Boolean(row.hidden_from_players),
    width: Math.max(0.5, numberOr(row.width, 3)),
    // Who drew it: a player may rub out their own strokes and nobody else's.
    createdBy: row.created_by || null,
    createdAt: Date.parse(row.created_at) || 0,
    // The database's version of the row: late echoes are measured against it.
    updatedAt: Date.parse(row.updated_at) || 0,
  };
}

// A note is words pinned to one point. A stroke with words on it is a stroke
// with a label, and an area's words are its label too.
export function isNote(drawing) {
  return !drawing?.area && Boolean(drawing?.text) && (drawing?.points?.length || 0) <= 1;
}

// Where a stroke's label goes. A closed shape — a ring drawn round a door, a
// room outlined — is labelled in its middle; an open one — an arrow, a path —
// half way along its length, sitting just above the line so the line stays
// visible under it. Null for a dot, which has nowhere to put one.
export function strokeLabelAnchor(points) {
  const list = normalizePoints(points);
  if (list.length < 2) return null;
  const xs = list.map((point) => point.x);
  const ys = list.map((point) => point.y);
  const diagonal = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const first = list[0];
  const last = list[list.length - 1];
  if (list.length > 2 && Math.hypot(last.x - first.x, last.y - first.y) <= diagonal * 0.25) {
    return {
      point: { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 },
      above: false,
    };
  }
  const lengths = list.slice(1).map((point, index) => Math.hypot(point.x - list[index].x, point.y - list[index].y));
  let remaining = lengths.reduce((sum, length) => sum + length, 0) / 2;
  for (let index = 0; index < lengths.length; index += 1) {
    if (remaining <= lengths[index] || index === lengths.length - 1) {
      const t = lengths[index] > 0 ? Math.min(1, remaining / lengths[index]) : 0;
      const a = list[index];
      const b = list[index + 1];
      return { point: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, above: true };
    }
    remaining -= lengths[index];
  }
  return null;
}

// A stroke of one point is a dot, which is a legitimate mark; a stroke of none
// is a click that never moved and should not become a row.
export function isDrawable(points) {
  return normalizePoints(points).length > 0;
}

export function sanitizeNoteText(value) {
  // One line: a paragraph pinned to a square is unreadable at map scale, and
  // newlines would have to be laid out by hand on the canvas.
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 120);
}

// Which mark is under the pointer, for the eraser, the menu and picking one up.
// Distance is measured to the segments, not to the stored points, or erasing a
// long straight line would only work at its two ends. An area is hit anywhere
// inside it, or with `areaEdgeOnly` only on its rim and origin.
//
// When several are hit, a line or a note drawn over an area wins over the
// area, and of two areas the smaller one — the one inside the other, which
// could otherwise never be reached; then the newest, which is drawn on top.
export function drawingAtPoint(drawings, point, radius = 0.5, { areaEdgeOnly = false } = {}) {
  const target = normalizePoint(point);
  if (!target) return null;
  let found = null;
  for (const drawing of drawings || []) {
    const points = drawing?.points || [];
    const reach = radius + (drawing.width || 0) / 20;
    const hit = drawing.area
      ? isPointOnArea(drawing, target, { slop: areaEdgeOnly ? 0.35 : 0.15, edgeOnly: areaEdgeOnly })
      : points.length === 1
      ? Math.hypot(points[0].x - target.x, points[0].y - target.y) <= reach
      : points.some((point2, index) => (
        index > 0 && distanceToSegment(target, points[index - 1], point2) <= reach
      ));
    if (hit && (!found || pickedOver(drawing, found))) found = drawing;
  }
  return found;
}

function pickedOver(candidate, held) {
  if (Boolean(candidate.area) !== Boolean(held.area)) return !candidate.area;
  if (candidate.area) {
    const size = areaGeometry(candidate)?.reach ?? 0;
    const heldSize = areaGeometry(held)?.reach ?? 0;
    if (size !== heldSize) return size < heldSize;
  }
  return (candidate.createdAt || 0) >= (held.createdAt || 0);
}

// Mirrors the delete policy, so the eraser does not offer a rub-out the database
// will refuse.
export function canEraseDrawing(drawing, { isGm = false, userId = null } = {}) {
  if (!drawing) return false;
  if (isGm) return true;
  return drawing.layer !== 'gm' && Boolean(userId) && drawing.createdBy === userId;
}

// Moving a mark is editing it, and the same people may do it: the GM anything,
// a player only what they drew. Kept as its own name because the interface asks
// a different question even when the answer is the same one.
export const canMoveDrawing = canEraseDrawing;

// The same mark, somewhere else. Points are in cells and fractional, so a mark
// dragged across the board keeps its shape at any zoom and stays where it was
// put if the grid is later recalibrated.
export function movedPoints(drawing, dx, dy) {
  const shift = { x: numberOr(dx, 0), y: numberOr(dy, 0) };
  return normalizePoints((drawing?.points || []).map((point) => ({
    x: point.x + shift.x,
    y: point.y + shift.y,
  })));
}

// A stroke made bigger or smaller about the middle of its bounding box, so it
// grows in place rather than away from its first point.
export function scaledPoints(points, factor) {
  const list = normalizePoints(points);
  const scale = Math.max(0.05, numberOr(factor, 1));
  if (list.length < 2) return list;
  const xs = list.map((point) => point.x);
  const ys = list.map((point) => point.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  return normalizePoints(list.map((point) => ({
    x: cx + (point.x - cx) * scale,
    y: cy + (point.y - cy) * scale,
  })));
}

export function lastDrawing(drawings) {
  return (drawings || []).reduce(
    (latest, drawing) => (!latest || (drawing.createdAt || 0) >= (latest.createdAt || 0) ? drawing : latest),
    null,
  );
}
