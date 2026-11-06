import { useCallback, useState } from 'react';
import {
  cellSize, dropPosition, screenToWorld, tokenWorldRect,
} from '../../../shared/vtt/map/geometry.js';
import { isMapPiece } from '../../../shared/vtt/map/mapObjects.js';
import { LONG_PRESS_SLOP } from '../../../shared/ui/longPress.js';

const DRAG_BROADCAST_MS = 40;
// Spans are kept to a tenth of a square: fine enough for a door that is half a
// cell deep, coarse enough that the number stays readable in the menu.
const roundSpan = (span) => Math.max(0.5, Math.round(span * 10) / 10);

// A piece in hand: dragged (shown live to the other screens, written once on
// drop), resized from its corner or rotated about its centre. With the
// box-select tool a press on a piece moves the selection instead.
export function useTokenGestures({
  dragRef,
  pointersRef,
  view,
  grid,
  screenPoint,
  paintMode,
  canMove,
  snapFor,
  setDrag,
  armLongPress,
  setSelectedMapObjectId,
  beginGroupDrag,
  onContextMenu,
  onDragToken,
  onMoveToken,
  onResizeToken,
  onRotateToken,
  onTokenClick,
}) {
  const [resize, setResize] = useState(null);
  const [rotate, setRotate] = useState(null);

  const beginTokenDrag = useCallback((event, token) => {
    event.stopPropagation();
    if (pointersRef.current.size > 1) return;
    if (paintMode === 'marquee') {
      beginGroupDrag(event, token);
      return;
    }
    setSelectedMapObjectId(isMapPiece(token) ? token.id : null);
    armLongPress(event, onContextMenu ? (at) => onContextMenu(token, at) : null);
    if (!canMove(token)) return;
    const pointer = screenToWorld(screenPoint(event), view);
    const rect = tokenWorldRect(token, grid);
    dragRef.current = {
      kind: 'token',
      token,
      grabOffset: { x: pointer.x - rect.x, y: pointer.y - rect.y },
      from: screenPoint(event),
      mouse: event.pointerType === 'mouse' && event.button === 0,
    };
    setDrag({ id: token.id, x: token.x, y: token.y });
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, [
    armLongPress, beginGroupDrag, canMove, dragRef, grid, onContextMenu, paintMode,
    pointersRef, screenPoint, setDrag, setSelectedMapObjectId, view,
  ]);

  const beginTokenResize = useCallback((event, token) => {
    event.stopPropagation();
    if (pointersRef.current.size > 1) return;
    if (!canMove(token)) return;
    const width = Math.max(0.5, Number(token.w) || 1);
    const height = Math.max(0.5, Number(token.h) || 1);
    dragRef.current = {
      kind: 'resize',
      token,
      from: screenToWorld(screenPoint(event), view),
      width,
      height,
    };
    setResize({ id: token.id, w: token.w || 1, h: token.h || 1 });
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, [canMove, dragRef, pointersRef, screenPoint, view]);

  const beginTokenRotate = useCallback((event, token) => {
    event.stopPropagation();
    if (pointersRef.current.size > 1) return;
    if (!canMove(token)) return;
    const rect = tokenWorldRect(token, grid);
    const centre = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    const pointer = screenToWorld(screenPoint(event), view);
    dragRef.current = {
      kind: 'rotate',
      token,
      centre,
      fromAngle: Math.atan2(pointer.y - centre.y, pointer.x - centre.x),
      rotation: Number(token.rotation) || 0,
    };
    setRotate({ id: token.id, rotation: Number(token.rotation) || 0 });
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, [canMove, dragRef, grid, pointersRef, screenPoint, view]);

  // Answers whether the gesture was one of a piece's.
  const moveGesture = (state, point) => {
    if (state.kind === 'resize') {
      const at = screenToWorld(point, view);
      const cell = cellSize(grid);
      // Each side follows its own axis, always. Keeping the shape unless Shift
      // was held made the corner useless on a tablet, where there is no Shift to
      // hold: pulling it sideways only ever scaled the whole picture up, and a
      // rug could never be fitted to the room it lies in. Dragging one way only
      // is how a picture is now scaled on one axis; both ways scale both.
      const next = {
        w: roundSpan(state.width + (at.x - state.from.x) / cell),
        h: roundSpan(state.height + (at.y - state.from.y) / cell),
      };
      state.next = next;
      setResize({ id: state.token.id, ...next });
      return true;
    }

    if (state.kind === 'rotate') {
      const at = screenToWorld(point, view);
      const angle = Math.atan2(at.y - state.centre.y, at.x - state.centre.x);
      const degrees = state.rotation + ((angle - state.fromAngle) * 180) / Math.PI;
      const next = Math.round(((degrees % 360) + 360) % 360);
      state.next = next;
      setRotate({ id: state.token.id, rotation: next });
      return true;
    }

    if (state.kind !== 'token') return false;

    // Follow the pointer unsnapped so the piece does not stutter between cells;
    // the snap happens once, on drop.
    state.lastPoint = point;
    // Carried away and brought back is a drag, not a click.
    if (Math.hypot(point.x - state.from.x, point.y - state.from.y) > LONG_PRESS_SLOP) state.wandered = true;
    const next = dropPosition({
      pointerWorld: screenToWorld(point, view),
      grabOffset: state.grabOffset,
      grid,
      snap: false,
      span: state.token,
    });
    setDrag({ id: state.token.id, x: next.x, y: next.y });

    // Tell the other viewers where the piece is right now. Throttled to one
    // frame's worth: this is a broadcast, not a write, but flooding the socket
    // buys nothing the eye can see.
    const now = Date.now();
    if (now - (state.lastBroadcast || 0) >= DRAG_BROADCAST_MS) {
      state.lastBroadcast = now;
      onDragToken?.(state.token, next);
    }
    return true;
  };

  const endGesture = (state, event) => {
    if (state.kind === 'resize') {
      const next = state.next || { w: state.width, h: state.height };
      setResize(null);
      if (next.w !== state.token.w || next.h !== state.token.h) onResizeToken?.(state.token, next);
      return true;
    }

    if (state.kind === 'rotate') {
      const next = state.next ?? state.rotation;
      setRotate(null);
      if (next !== state.token.rotation) onRotateToken?.(state.token, { rotation: next });
      return true;
    }

    if (state.kind !== 'token') return false;

    // A cancelled pointer (the system took the touch) carries no trustworthy
    // position: the piece lands where it was last seen under the finger.
    const releasedAt = event.type === 'pointercancel' ? state.lastPoint : screenPoint(event);
    const landing = releasedAt ? dropPosition({
      pointerWorld: screenToWorld(releasedAt, view),
      grabOffset: state.grabOffset,
      grid,
      snap: snapFor(state.token),
      span: state.token,
    }) : { x: state.token.x, y: state.token.y };
    setDrag(null);
    // One write per gesture, and only when the piece actually changed square.
    // A drag that ends where it started writes nothing, but is still let go
    // of, here and on the other screens; a click that never dragged has
    // nothing to let go of.
    if (landing.x !== state.token.x || landing.y !== state.token.y) {
      onMoveToken?.(state.token, landing);
    } else {
      if (state.lastBroadcast) {
        onDragToken?.(state.token, { x: state.token.x, y: state.token.y, released: true });
      }
      // A hand on a mouse never releases on the exact pixel it pressed: the
      // long press's slop decides what was a click.
      if (state.mouse && !state.wandered && releasedAt && event.type !== 'pointercancel'
        && Math.hypot(releasedAt.x - state.from.x, releasedAt.y - state.from.y) <= LONG_PRESS_SLOP) {
        onTokenClick?.(state.token);
      }
    }
    return true;
  };

  // A pinch takes over: the resize and rotation previews are dropped.
  const cancel = () => {
    setResize(null);
    setRotate(null);
  };

  return {
    resize,
    rotate,
    beginTokenDrag,
    beginTokenResize,
    beginTokenRotate,
    moveGesture,
    endGesture,
    cancel,
  };
}
