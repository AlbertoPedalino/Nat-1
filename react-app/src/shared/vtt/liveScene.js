// Reconciling a live scene: remote row events, live drag previews, and the
// local gesture that must survive both.
//
// Two streams carry token movement, on purpose:
//   broadcast        — every pointer move, no database write, disappears
//   postgres_changes — one row version per gesture, on drop, authoritative
//
// A "ghost" is the broadcast position of a piece somebody else is dragging right
// now. It is presentation only: the committed row always wins once it lands.

import { canMoveToken, toToken } from './scene.js';

export const GHOST_TTL_MS = 5000;

// The row a remote event carries is the same shape a fetch returns, so it goes
// through the same normalizer instead of being trusted raw.
export function applyTokenEvent(tokens, event, { draggingId = null } = {}) {
  const list = Array.isArray(tokens) ? tokens : [];
  const type = String(event?.eventType || event?.type || '').toUpperCase();

  if (type === 'DELETE') {
    const removedId = event?.old?.id || event?.oldRecord?.id;
    if (!removedId) return list;
    return list.filter((token) => token.id !== removedId);
  }

  const token = toToken(event?.new || event?.record);
  if (!token) return list;

  // Never let a remote version overwrite the piece under the local pointer: the
  // echo of our own last commit would yank it back mid-gesture.
  if (draggingId && token.id === draggingId) return list;

  const index = list.findIndex((item) => item.id === token.id);
  if (index < 0) return [...list, token];
  const next = list.slice();
  next[index] = token;
  return next;
}

export function putGhost(ghosts, { id, x, y, actor } = {}, now = Date.now()) {
  if (!id) return ghosts;
  return { ...ghosts, [id]: { x: Number(x) || 0, y: Number(y) || 0, actor: actor || null, at: now } };
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
