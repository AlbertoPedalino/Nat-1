// Laying a dungeon's floor plan over the picture of it.
//
// The exported picture is not a scaled copy of the exported data: the generator
// turns the map to make it sit on a landscape page, so a plan that is tall in
// the file arrives wide in the picture, at whatever angle suited it. Nothing in
// either file says by how much.
//
// Two points settle it. Told where two known rooms sit on the picture, there is
// exactly one similarity — one scale, one angle, one shift — that carries the
// plan onto it, and every other room follows for free. It is the same trick a
// surveyor uses with two landmarks, for the same reason: three unknowns, two
// points, four numbers.
//
// Reflection is deliberately not solved for. A map is never printed mirrored,
// and allowing it would let two sloppy clicks flip the whole dungeon rather than
// simply being wrong by a little.

const numberOr = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

function point(raw) {
  return { x: numberOr(raw?.x), y: numberOr(raw?.y) };
}

// `from` are two points in the plan's own cells; `to` are where they landed on
// the map, in whatever units the map is measured in. Both pairs must be two
// distinct points — a pair that is one point twice says nothing about angle or
// scale, and the answer would be an infinity of them.
export function solveAlignment(from, to) {
  const [a1, a2] = (from || []).map(point);
  const [b1, b2] = (to || []).map(point);
  if (!a1 || !a2 || !b1 || !b2) return null;

  const ax = a2.x - a1.x;
  const ay = a2.y - a1.y;
  const bx = b2.x - b1.x;
  const by = b2.y - b1.y;
  const aLen2 = ax * ax + ay * ay;
  const bLen2 = bx * bx + by * by;
  if (aLen2 === 0 || bLen2 === 0) return null;

  // The complex quotient b/a: its length is the scale, its argument the angle.
  const cos = (ax * bx + ay * by) / aLen2;
  const sin = (ax * by - ay * bx) / aLen2;
  const scale = Math.sqrt(cos * cos + sin * sin);
  if (!Number.isFinite(scale) || scale <= 0) return null;

  return {
    // Stored as the two numbers the transform actually uses, rather than as an
    // angle that would have to be turned back into them on every point.
    cos,
    sin,
    scale,
    rotation: Math.atan2(sin, cos),
    // Where the plan's own origin lands, so applying the transform is a
    // multiply and an add and nothing else.
    tx: b1.x - (cos * a1.x - sin * a1.y),
    ty: b1.y - (sin * a1.x + cos * a1.y),
  };
}

export function applyAlignment(alignment, cell) {
  if (!alignment) return null;
  const { x, y } = point(cell);
  return {
    x: alignment.cos * x - alignment.sin * y + alignment.tx,
    y: alignment.sin * x + alignment.cos * y + alignment.ty,
  };
}

// Back from the map to the plan: which cell of the dungeon a point on the map
// falls in. The inverse of a similarity is a similarity, so this is the same
// arithmetic with the rotation undone and the scale reciprocated.
export function invertAlignment(alignment, at) {
  if (!alignment) return null;
  const { x, y } = point(at);
  const dx = x - alignment.tx;
  const dy = y - alignment.ty;
  const denominator = alignment.cos * alignment.cos + alignment.sin * alignment.sin;
  if (!denominator) return null;
  return {
    x: (alignment.cos * dx + alignment.sin * dy) / denominator,
    y: (-alignment.sin * dx + alignment.cos * dy) / denominator,
  };
}

// How far off the two clicks were, in the plan's own cells: the distance
// between the two chosen rooms as the plan has it, against what the clicks
// imply. Zero by construction for the pair that was solved — this is for
// checking a third room, which is the only way to catch a click on the wrong
// room, since any two points always solve perfectly.
export function alignmentError(alignment, cell, expected) {
  const landed = applyAlignment(alignment, cell);
  if (!landed) return null;
  const target = point(expected);
  return Math.hypot(landed.x - target.x, landed.y - target.y);
}

// Whether the answer is worth keeping. A picture is a picture of the same
// dungeon, so a scale outside this range means the two clicks were not the two
// rooms they were meant to be.
export function isPlausibleAlignment(alignment, { minScale = 1e-3, maxScale = 1e5 } = {}) {
  if (!alignment) return false;
  return Number.isFinite(alignment.scale)
    && alignment.scale >= minScale
    && alignment.scale <= maxScale
    && Number.isFinite(alignment.tx)
    && Number.isFinite(alignment.ty);
}
