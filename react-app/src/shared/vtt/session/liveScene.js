// Reconciling a live scene: remote row events, live drag previews, and the
// local gesture that must survive both.
//
// Two streams carry token movement, on purpose:
//   broadcast        — every pointer move, no database write, disappears
//   postgres_changes — one row version per gesture, on drop, authoritative
//
// A "ghost" is the broadcast position of a piece somebody else is dragging right
// now. It is presentation only: the committed row always wins once it lands.

import { toDrawing } from '../map/drawing.js';
import { canMoveToken, toToken } from '../scene/scene.js';

export const GHOST_TTL_MS = 5000;

// The row a remote event carries is the same shape a fetch returns, so it goes
// through the same normalizer instead of being trusted raw.
//
// `pendingIds` are pieces this client has moved and whose writes have not all
// come back yet. Their events are ignored until then: when a piece is moved
// twice in quick succession, the echo of the first move lands while the second
// is still in flight, and applying it pulled the piece back to where it had
// just been before the second echo pushed it forward again. The last write's
// own answer brings the row in instead (applyCommittedToken).
export function applyTokenEvent(tokens, event, { draggingId = null, pendingIds = null } = {}) {
  const list = Array.isArray(tokens) ? tokens : [];
  const type = String(event?.eventType || event?.type || '').toUpperCase();

  if (type === 'DELETE') {
    const removedId = event?.old?.id || event?.oldRecord?.id || event?.old_record?.id;
    if (!removedId) return list;
    return list.filter((token) => token.id !== removedId);
  }

  const token = toToken(event?.new || event?.record);
  if (!token) return list;

  // Never let a remote version overwrite the piece under the local pointer: the
  // echo of our own last commit would yank it back mid-gesture.
  if (draggingId && token.id === draggingId) return list;
  if (pendingIds?.has(token.id)) return list;

  const index = list.findIndex((item) => item.id === token.id);
  if (index < 0) return [...list, token];
  // Realtime is late, not always in step with the writes this client has
  // already seen answered: a version older than the one held is history.
  if (isOlder(token, list[index])) return list;
  const next = list.slice();
  // A GM-only label lives in its own table and is never part of this row, so a
  // row event carries no news about it. Taking the normalized token whole would
  // read that silence as "the label was cleared" — and the encounter builder
  // writing hit points into a piece would quietly strip the name off it.
  const held = list[index];
  next[index] = held.secretLabel ? { ...token, secretLabel: held.secretLabel } : token;
  return next;
}

// The row a move's write answered with, once no other move of that piece is
// still in flight. It carries everything that changed meanwhile (hit points
// from the encounter builder, a condition) and the version later echoes are
// measured against.
export function applyCommittedToken(tokens, committed) {
  const list = Array.isArray(tokens) ? tokens : [];
  if (!committed?.id) return list;
  const index = list.findIndex((item) => item.id === committed.id);
  if (index < 0 || isOlder(committed, list[index])) return list;
  const next = list.slice();
  const held = list[index];
  next[index] = held.secretLabel ? { ...committed, secretLabel: held.secretLabel } : committed;
  return next;
}

function isOlder(incoming, held) {
  return Boolean(incoming?.updatedAt && held?.updatedAt && incoming.updatedAt < held.updatedAt);
}

// `released` marks the frame sent on drop: the piece is let go there, and the
// committed row may now replace the ghost.
export function putGhost(ghosts, { id, x, y, actor, released } = {}, now = Date.now()) {
  if (!id) return ghosts;
  return {
    ...ghosts,
    [id]: { x: Number(x) || 0, y: Number(y) || 0, actor: actor || null, at: now, released: Boolean(released) },
  };
}

// A row event replaces a ghost only once its drag has been let go, and only
// with the row the drop wrote — the one standing where the piece was let go.
// While the piece is still being dragged — picked up again before the last
// drop came back — the late row is an earlier position, and taking it made the
// piece jump back and then follow the pointer again. After the drop, a late
// echo of an older write (hit points from the encounter builder, say) still
// stands where the piece was before: taking it pulled the piece back until
// the move's own row arrived. A drop whose row never comes, like a drag whose
// release never arrives, expires with the ghost sweep.
export function settleGhost(ghosts, id, row = null) {
  const ghost = ghosts?.[id];
  if (!ghost?.released) return ghosts;
  if (row && !standsAt(row, ghost)) return ghosts;
  return dropGhost(ghosts, id);
}

function standsAt(row, ghost) {
  const x = Number(row.x);
  const y = Number(row.y);
  // A row without a position says nothing about where the piece is.
  if (!Number.isFinite(x) || !Number.isFinite(y)) return true;
  return Math.abs(x - ghost.x) < 1e-6 && Math.abs(y - ghost.y) < 1e-6;
}

export function dropGhost(ghosts, id) {
  if (!id || !ghosts?.[id]) return ghosts;
  const next = { ...ghosts };
  delete next[id];
  return next;
}

// A client that disconnects mid-drag never sends its release, so a ghost would
// pin the piece somewhere forever. They expire instead.
export function pruneGhosts(ghosts, now = Date.now(), ttl = GHOST_TTL_MS) {
  const entries = Object.entries(ghosts || {}).filter(([, ghost]) => now - (ghost?.at || 0) < ttl);
  if (entries.length === Object.keys(ghosts || {}).length) return ghosts || {};
  return Object.fromEntries(entries);
}

// What to actually draw: committed rows, with somebody else's in-flight drag
// painted on top, except for the piece this client is dragging itself.
export function resolveTokens(tokens, ghosts, draggingId = null) {
  if (!ghosts || !Object.keys(ghosts).length) return tokens || [];
  return (tokens || []).map((token) => {
    const ghost = ghosts[token.id];
    if (!ghost || token.id === draggingId) return token;
    return { ...token, x: ghost.x, y: ghost.y };
  });
}

// Bound form of `canMoveToken` for the viewport, which asks the same question
// once per token per render. The rule itself stays in scene.js next to the
// other RLS mirrors — one place to change when the policy changes.
export function movableFilter(role) {
  return (token) => canMoveToken(token, role);
}

// Marks (strokes, notes, areas) follow the same rules as pieces, without the
// drag preview: an edit from the menu or a move writes the row, and the
// realtime echo of an earlier write can land after a later one.
//
// `pendingIds` are marks this client is still writing: their echoes wait, and
// the last write's own answer brings the row in (applyCommittedDrawing). A
// version older than the one held is history.
export function applyDrawingEvent(drawings, event, { pendingIds = null } = {}) {
  const list = Array.isArray(drawings) ? drawings : [];
  const type = String(event?.eventType || event?.type || '').toUpperCase();

  if (type === 'DELETE') {
    const removedId = event?.old?.id || event?.oldRecord?.id || event?.old_record?.id;
    if (!removedId) return list;
    return list.filter((drawing) => drawing.id !== removedId);
  }

  const drawing = toDrawing(event?.new || event?.record);
  if (!drawing) return list;
  if (pendingIds?.has(drawing.id)) return list;
  const index = list.findIndex((item) => item.id === drawing.id);
  if (index < 0) return [...list, drawing];
  if (isOlder(drawing, list[index])) return list;
  const next = list.slice();
  next[index] = drawing;
  return next;
}

export function applyCommittedDrawing(drawings, committed) {
  const list = Array.isArray(drawings) ? drawings : [];
  if (!committed?.id) return list;
  const index = list.findIndex((item) => item.id === committed.id);
  if (index < 0 || isOlder(committed, list[index])) return list;
  const next = list.slice();
  next[index] = committed;
  return next;
}
