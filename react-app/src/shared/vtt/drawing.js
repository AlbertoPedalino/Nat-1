// Freehand strokes on a scene, in cell coordinates.
//
// A raw stroke is hundreds of points sampled at pointer rate, most of them
// indistinguishable from the line between their neighbours. They are simplified
// before they are stored: the jsonb is smaller, the realtime payload is smaller,
// and the redraw is cheaper — for a line nobody can tell apart from the original.

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
    // Present on a note, absent on a freehand stroke.
    text: typeof row.text === 'string' && row.text ? row.text : null,
    width: Math.max(0.5, numberOr(row.width, 3)),
    // Who drew it: a player may rub out their own strokes and nobody else's.
    createdBy: row.created_by || null,
    createdAt: Date.parse(row.created_at) || 0,
  };
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

// Which stroke the eraser is over. Distance is measured to the segments, not to
// the stored points, or erasing a long straight line would only work at its two
// ends. The newest match wins, matching what is drawn on top.
export function drawingAtPoint(drawings, point, radius = 0.5) {
  const target = normalizePoint(point);
  if (!target) return null;
  let found = null;
  for (const drawing of drawings || []) {
    const points = drawing?.points || [];
    const reach = radius + (drawing.width || 0) / 20;
    const hit = points.length === 1
      ? Math.hypot(points[0].x - target.x, points[0].y - target.y) <= reach
      : points.some((point2, index) => (
        index > 0 && distanceToSegment(target, points[index - 1], point2) <= reach
      ));
    if (hit && (!found || (drawing.createdAt || 0) >= (found.createdAt || 0))) found = drawing;
  }
  return found;
}

// Mirrors the delete policy, so the eraser does not offer a rub-out the database
// will refuse.
export function canEraseDrawing(drawing, { isGm = false, userId = null } = {}) {
  if (!drawing) return false;
  if (isGm) return true;
  return drawing.layer !== 'gm' && Boolean(userId) && drawing.createdBy === userId;
}

export function lastDrawing(drawings) {
  return (drawings || []).reduce(
    (latest, drawing) => (!latest || (drawing.createdAt || 0) >= (latest.createdAt || 0) ? drawing : latest),
    null,
  );
}
