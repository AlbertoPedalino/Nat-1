import { useCallback, useEffect, useRef, useState } from 'react';
import {
  dropPosition, screenToWorld, tokenWorldRect, worldToScreen,
} from '../../../shared/vtt/map/geometry.js';
import { isMapPiece } from '../../../shared/vtt/map/mapObjects.js';
import { overlapsSelection, screenSelectionRect } from './viewportGeometry.js';

// What is selected on the board: the piece of scenery whose resize/rotate
// handles are showing, and the box selection — its marquee, moving the
// selected pieces together, and deleting them after a confirmation.
export function useViewportSelection({
  hostRef,
  dragRef,
  tokens,
  activeLayer,
  canMove,
  grid,
  view,
  screenPoint,
  paintMode,
  backgroundOnly,
  snapFor,
  onDeleteTokens,
  onMoveTokens,
}) {
  const [selectedMapObjectId, setSelectedMapObjectId] = useState(null);
  const [selectedTokenIds, setSelectedTokenIds] = useState([]);
  const [deleteCandidates, setDeleteCandidates] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const deletingRef = useRef(false);
  const [selectionBox, setSelectionBox] = useState(null);
  const [groupDrag, setGroupDrag] = useState(null);

  const selectableTokensIn = useCallback((selection) => (
    (tokens || []).filter((token) => {
      if (activeLayer && token.layer !== activeLayer) return false;
      if (!canMove(token)) return false;
      const worldRect = tokenWorldRect(token, grid);
      const at = worldToScreen(worldRect, view);
      return overlapsSelection({
        left: at.x,
        top: at.y,
        width: worldRect.width * view.zoom,
        height: worldRect.height * view.zoom,
      }, selection);
    })
  ), [activeLayer, canMove, grid, tokens, view]);

  const clearSelection = useCallback(() => {
    setSelectedTokenIds([]);
    setSelectionBox(null);
    setGroupDrag(null);
  }, []);

  const deleteSelection = useCallback(() => {
    if (!onDeleteTokens || deleteDialogOpen || deletingRef.current) return;
    const selected = (tokens || []).filter((token) => selectedTokenIds.includes(token.id) && canMove(token));
    if (!selected.length) return;
    setDeleteError(null);
    setDeleteCandidates(selected);
    setDeleteDialogOpen(true);
  }, [canMove, deleteDialogOpen, onDeleteTokens, selectedTokenIds, tokens]);

  const cancelDelete = () => {
    if (!deletingRef.current) setDeleteDialogOpen(false);
  };

  const confirmDelete = async () => {
    if (deletingRef.current || !deleteDialogOpen || !deleteCandidates || !onDeleteTokens) return;
    deletingRef.current = true;
    setDeleting(true);
    setDeleteError(null);
    const ids = new Set(deleteCandidates.map((token) => token.id));
    // Re-read permissions and rows at confirmation: live updates may have
    // changed them while the panel was open.
    const pieces = (tokens || []).filter((token) => ids.has(token.id) && canMove(token));
    try {
      const removed = pieces.length ? await onDeleteTokens(pieces) : true;
      if (removed !== false) {
        setSelectedTokenIds((current) => current.filter((id) => !ids.has(id)));
      }
      // Keep the confirmed pieces while the dialog animates out. Clearing
      // them here flashes "Remove 0 selected pieces" before it disappears.
      setDeleteDialogOpen(false);
    } catch (cause) {
      setDeleteError(cause?.message || 'Could not delete the selected pieces. Please try again.');
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (paintMode !== 'marquee' || backgroundOnly) clearSelection();
  }, [backgroundOnly, clearSelection, paintMode]);

  useEffect(() => {
    setSelectedTokenIds((current) => current.filter((id) => (
      (tokens || []).some((token) => token.id === id && (!activeLayer || token.layer === activeLayer))
    )));
  }, [activeLayer, tokens]);

  useEffect(() => {
    if (paintMode !== 'marquee' || !selectedTokenIds.length) return undefined;
    const handleKeyDown = (event) => {
      if (event.defaultPrevented || event.repeat || deleteDialogOpen || deletingRef.current) return;
      const target = event.target;
      if (target?.closest?.('input, textarea, select, [contenteditable="true"], .MuiModal-root')) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        clearSelection();
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        deleteSelection();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearSelection, deleteDialogOpen, deleteSelection, paintMode, selectedTokenIds.length]);

  // Resize and rotation furniture belongs only to the piece of scenery the user
  // has picked. Drop the selection if that piece is removed or stops being
  // scenery (for example after a realtime scene update).
  useEffect(() => {
    setSelectedMapObjectId((selectedId) => (
      selectedId && tokens.some((token) => token.id === selectedId && isMapPiece(token))
        ? selectedId
        : null
    ));
  }, [tokens]);

  const beginMarquee = (event, point) => {
    const additive = event.shiftKey || event.ctrlKey || event.metaKey;
    dragRef.current = {
      kind: 'marquee',
      from: point,
      baseIds: additive ? selectedTokenIds : [],
    };
    setSelectionBox(screenSelectionRect(point, point));
    if (!additive) setSelectedTokenIds([]);
  };

  // A press on a piece with the box-select tool takes the whole selection
  // along, or just that piece when it was not part of it.
  const beginGroupDrag = useCallback((event, token) => {
    hostRef.current?.focus({ preventScroll: true });
    setSelectedMapObjectId(null);
    if (!canMove(token)) return;
    const ids = selectedTokenIds.includes(token.id) ? selectedTokenIds : [token.id];
    const members = (tokens || []).filter((item) => ids.includes(item.id) && canMove(item));
    const pointer = screenToWorld(screenPoint(event), view);
    const rect = tokenWorldRect(token, grid);
    setSelectedTokenIds(members.map((item) => item.id));
    dragRef.current = {
      kind: 'group',
      anchor: token,
      members,
      grabOffset: { x: pointer.x - rect.x, y: pointer.y - rect.y },
    };
    setGroupDrag(Object.fromEntries(members.map((item) => [item.id, { x: item.x, y: item.y }])));
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, [canMove, dragRef, grid, hostRef, screenPoint, selectedTokenIds, tokens, view]);

  // Answers whether the gesture was one of the selection's.
  const moveGesture = (state, point) => {
    if (state.kind === 'marquee') {
      const selection = screenSelectionRect(state.from, point);
      const hits = selectableTokensIn(selection).map((token) => token.id);
      setSelectionBox(selection);
      setSelectedTokenIds([...new Set([...state.baseIds, ...hits])]);
      return true;
    }

    if (state.kind === 'group') {
      const anchorPosition = dropPosition({
        pointerWorld: screenToWorld(point, view),
        grabOffset: state.grabOffset,
        grid,
        snap: false,
        span: state.anchor,
      });
      const delta = {
        x: anchorPosition.x - state.anchor.x,
        y: anchorPosition.y - state.anchor.y,
      };
      state.delta = delta;
      setGroupDrag(Object.fromEntries(state.members.map((token) => [
        token.id,
        { x: token.x + delta.x, y: token.y + delta.y },
      ])));
      return true;
    }
    return false;
  };

  const endGesture = (state, event) => {
    if (state.kind === 'marquee') {
      setSelectionBox(null);
      return true;
    }

    if (state.kind === 'group') {
      const anchorPosition = dropPosition({
        pointerWorld: screenToWorld(screenPoint(event), view),
        grabOffset: state.grabOffset,
        grid,
        snap: snapFor(state.anchor),
        span: state.anchor,
      });
      const delta = {
        x: anchorPosition.x - state.anchor.x,
        y: anchorPosition.y - state.anchor.y,
      };
      setGroupDrag(null);
      if (delta.x || delta.y) {
        onMoveTokens?.(state.members.map((token) => ({
          token,
          position: { x: token.x + delta.x, y: token.y + delta.y },
        })));
      }
      return true;
    }
    return false;
  };

  // A pinch takes over: the marquee and the group in motion are dropped.
  const cancelGesture = () => {
    setGroupDrag(null);
    setSelectionBox(null);
  };

  return {
    selectedMapObjectId,
    setSelectedMapObjectId,
    selectedTokenIds,
    selectionBox,
    groupDrag,
    clearSelection,
    deleteSelection,
    deleteDialog: {
      open: deleteDialogOpen,
      pieces: deleteCandidates || [],
      busy: deleting,
      error: deleteError,
      onCancel: cancelDelete,
      onConfirm: confirmDelete,
    },
    beginMarquee,
    beginGroupDrag,
    moveGesture,
    endGesture,
    cancelGesture,
  };
}
