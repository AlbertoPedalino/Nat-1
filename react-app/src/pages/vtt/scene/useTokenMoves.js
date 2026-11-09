import { useCallback, useEffect, useMemo, useRef } from 'react';
import { setTokenVisibility, updateToken } from '../../../shared/cloud/api/vttTokens.js';
import { applyCommittedToken, movableFilter, patchById, replaceById } from '../../../shared/vtt/session/liveScene.js';
import { isTokenVisibleToPlayers } from '../../../shared/vtt/scene/scene.js';
import { failureMessage } from '../../../shared/ui/busyAction.js';

// A piece held still under the pointer sends no frames, and the other screens
// would sweep its ghost away and show it back where it started. The last frame
// is sent again this often, well inside GHOST_TTL_MS.
const DRAG_KEEPALIVE_MS = 1500;

// Moving pieces on the board: which ones this user may move, the drag frames
// the table sees while one is held, and the writes when it lands, is turned,
// resized, recoloured or shown/hidden. `draggingRef` (the piece this screen is
// dragging) is shared with the realtime handler and the token rendering.
export function useTokenMoves({
  playArea, role, activeLayer, userId, setTokens, beginTokenMove, draggingRef, sendDrag, notify,
}) {
  // The last drag frame sent to the table, repeated while the piece is held.
  const dragFrameRef = useRef(null);

  const canMove = useMemo(
    () => movableFilter({
      isGm: role.isGm,
      ownedCharacterIds: role.ownedCharacterIds,
      // Only the GM has a layer selector; a player is bound by the piece's own
      // layer and nothing else.
      activeLayer: role.isGm ? activeLayer : null,
      userId: userId || null,
    }),
    [activeLayer, role.isGm, role.ownedCharacterIds, userId],
  );

  const handleDragToken = useCallback((token, position) => {
    const { released, ...place } = position;
    const moving = { ...token, ...place };
    const shown = isTokenVisibleToPlayers(moving, playArea);
    // Put back where it was picked up: nothing to write, but the other screens
    // let go of the drag and this one listens to the piece's row again.
    if (released) {
      if (draggingRef.current === token.id) draggingRef.current = null;
      dragFrameRef.current = null;
      if (shown) sendDrag({ id: token.id, x: place.x, y: place.y, released: true });
      return;
    }
    draggingRef.current = token.id;
    if (shown) {
      dragFrameRef.current = { id: token.id, x: place.x, y: place.y, at: Date.now() };
      sendDrag({ id: token.id, x: place.x, y: place.y });
    }
  }, [playArea, sendDrag]);

  useEffect(() => {
    const timer = setInterval(() => {
      const frame = dragFrameRef.current;
      if (!frame || draggingRef.current !== frame.id) return;
      if (Date.now() - frame.at < DRAG_KEEPALIVE_MS) return;
      frame.at = Date.now();
      sendDrag({ id: frame.id, x: frame.x, y: frame.y });
    }, DRAG_KEEPALIVE_MS / 2);
    return () => clearInterval(timer);
  }, [sendDrag]);

  const handleMoveToken = useCallback(async (token, position) => {
    const finishMove = beginTokenMove([token.id]);
    const wasVisible = isTokenVisibleToPlayers(token, playArea);
    const willBeVisible = isTokenVisibleToPlayers({ ...token, ...position }, playArea);
    setTokens((current) => patchById(current, token.id, position));
    dragFrameRef.current = null;
    // Let go where it landed, before the write: other screens keep showing
    // the drag until then, and only then take the row that comes back. A turn
    // or a resize has no place to land on and no drag to let go of.
    const placed = Number.isFinite(position?.x) && Number.isFinite(position?.y);
    if (placed && willBeVisible) sendDrag({ id: token.id, x: position.x, y: position.y, released: true });
    let committed = null;
    try {
      committed = await updateToken(token.id, position);
      if (wasVisible !== willBeVisible) sendDrag({ tokensChanged: true });
    } catch (cause) {
      setTokens((current) => replaceById(current, token));
      notify('error', failureMessage('Could not move that token.', cause));
    } finally {
      // Released only after the write settles: until then a remote echo would
      // still be our own move coming back.
      draggingRef.current = null;
      const settled = finishMove();
      // The last move of this piece to come back answers for it: its echoes
      // were held back while moves were in flight.
      if (committed && settled.includes(token.id)) {
        setTokens((current) => applyCommittedToken(current, committed));
      }
    }
  }, [beginTokenMove, notify, playArea, sendDrag]);

  const handleMoveTokens = useCallback(async (moves) => {
    const valid = (moves || []).filter(({ token, position }) => (
      token?.id && canMove(token) && Number.isFinite(position?.x) && Number.isFinite(position?.y)
    ));
    if (!valid.length) return;

    const finishMove = beginTokenMove(valid.map(({ token }) => token.id));
    const byId = new Map(valid.map(({ token, position }) => [token.id, { token, position }]));
    setTokens((current) => current.map((item) => {
      const move = byId.get(item.id);
      return move ? { ...item, ...move.position } : item;
    }));

    const results = await Promise.allSettled(
      valid.map(({ token, position }) => updateToken(token.id, position)),
    );
    const settled = new Set(finishMove());
    // As for a single move: rows whose last write this was come in whole.
    const committedRows = results.flatMap((result) => (
      result.status === 'fulfilled' && result.value && settled.has(result.value.id) ? [result.value] : []
    ));
    if (committedRows.length) {
      setTokens((current) => committedRows.reduce(applyCommittedToken, current));
    }
    const failedIds = new Set(results.flatMap((result, index) => (
      result.status === 'rejected' ? [valid[index].token.id] : []
    )));
    if (failedIds.size) {
      setTokens((current) => current.map((item) => (
        failedIds.has(item.id) ? valid.find(({ token }) => token.id === item.id).token : item
      )));
      notify('error', `${failedIds.size} selected piece${failedIds.size === 1 ? '' : 's'} could not be moved.`);
    }

    const crossedVisibilityBoundary = valid.some(({ token, position }, index) => (
      results[index].status === 'fulfilled'
      && isTokenVisibleToPlayers(token, playArea)
        !== isTokenVisibleToPlayers({ ...token, ...position }, playArea)
    ));
    if (crossedVisibilityBoundary) sendDrag({ tokensChanged: true });
  }, [beginTokenMove, canMove, notify, playArea, sendDrag]);

  const handleObjectStyle = useCallback(async (token, patch) => {
    const localPatch = {};
    const rowPatch = {};
    if (Object.hasOwn(patch, 'color')) {
      localPatch.color = patch.color;
      rowPatch.color = patch.color;
    }
    if (!Object.keys(rowPatch).length) return;

    setTokens((current) => patchById(current, token.id, localPatch));
    try {
      await updateToken(token.id, rowPatch);
    } catch (cause) {
      setTokens((current) => replaceById(current, token));
      notify('error', failureMessage('Could not update that object.', cause));
    }
  }, [notify]);

  // Showing a piece to the table, or taking it back. Visibility is independent
  // from the editing layer, so revealing scenery does not silently turn it into
  // a token. Legacy GM-layer rows fall back to the token layer only because they
  // predate the separate visibility column and have no public layer to restore.
  const handleTokenVisibility = useCallback(async (token, gmOnly) => {
    if (!token || Boolean(token.hiddenFromPlayers) === Boolean(gmOnly)) return;
    const nextLayer = !gmOnly && token.layer === 'gm' ? 'tokens' : token.layer;
    setTokens((current) => patchById(current, token.id, { layer: nextLayer, hiddenFromPlayers: Boolean(gmOnly) }));
    try {
      const updated = await setTokenVisibility(token.id, gmOnly, token.layer);
      // Not taken whole: the row knows nothing of the GM-only label, which
      // lives apart from it, and the piece lost its name until a reload.
      setTokens((current) => applyCommittedToken(current, updated));
      sendDrag({ tokensChanged: true });
    } catch (cause) {
      setTokens((current) => replaceById(current, token));
      notify('error', failureMessage('Could not change who can see that piece.', cause));
    }
  }, [notify, sendDrag]);

  return {
    canMove, handleDragToken, handleMoveToken, handleMoveTokens, handleObjectStyle, handleTokenVisibility,
  };
}
