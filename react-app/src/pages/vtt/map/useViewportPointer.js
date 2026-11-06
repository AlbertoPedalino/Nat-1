import { useState } from 'react';
import { panBy, screenToWorld } from '../../../shared/vtt/map/geometry.js';
import { isTokenInPlay } from '../../../shared/vtt/scene/scene.js';
import { isHexGrid, worldToHex } from '../../../shared/vtt/map/hexGeometry.js';
import { LONG_PRESS_SLOP } from '../../../shared/ui/longPress.js';
import { imageBox, playAreaBox, pointInBox } from './viewportGeometry.js';

// The tools that paint an area rather than acting on one point.
const BRUSH_MODES = ['reveal', 'hide', 'draw', 'erase'];

// The viewport host's pointer handlers. A press starts whichever gesture the
// tool in hand claims (or a pan), and move/up hand the gesture to the tool
// that owns it; each tool hook answers whether the gesture was its own.
// Also tracks the cursor for the brush preview.
export function useViewportPointer({
  hostRef,
  dragRef,
  pointersRef,
  scene,
  view,
  imageSize,
  paintMode,
  backgroundOnly,
  cameraLocked,
  screenPoint,
  cellPoint,
  setView,
  constrainView,
  setDrag,
  setMarkDrag,
  abandonGesture,
  cancelLongPress,
  cancelLongPressIfMoved,
  selection,
  marks,
  fogBrush,
  drawingTools,
  ruler,
  laser,
  tokenGestures,
  onHexClick,
  onSelectDrawing,
}) {
  // Where the cursor is, so a brush can show what it is about to cover. Tracked
  // only while a brush is in hand: a state update per mouse move is not worth
  // paying for while merely moving pieces around.
  const [hover, setHover] = useState(null);

  // Two fingers are a pinch, whatever they landed on: whatever was being drawn,
  // painted or dragged is abandoned rather than continued with one of them.
  const abandonForPinch = () => {
    cancelLongPress();
    abandonGesture();
    setDrag(null);
    selection.cancelGesture();
    tokenGestures.cancel();
    setMarkDrag(null);
    ruler.cancel();
    drawingTools.cancel();
  };

  const beginPan = (event) => {
    if (cameraLocked) return;
    // One finger of a pinch must not also pan the map.
    if (pointersRef.current.size > 1) return;
    if (event.button !== 0 && event.button !== 1) return;
    // Controls sitting on top of the map are not the map. Without this the host
    // captures the pointer on the way down and the click never reaches the
    // button — which is exactly why fullscreen appeared to do nothing.
    //
    // `.MuiModal-root` for the same reason: in fullscreen every dialog has to
    // be mounted inside the map — a dialog on the document body is not painted
    // at all — so its buttons are inside this host and would lose their clicks
    // to the same capture. That is what made the custom roller do nothing.
    if (event.target.closest?.('[data-viewport-control], .MuiModal-root')) return;
    // Holding a map tool is an application gesture, not a browser drag. Without
    // cancelling the native pointer action, dragging beyond the viewport starts
    // selecting the surrounding page text and the next stroke can inherit that
    // selection instead of reaching the tool cleanly.
    event.preventDefault();
    // preventDefault also suppresses the browser's focus transfer. Leaving a
    // tool input focused makes Delete edit that input instead of the selection.
    hostRef.current?.focus({ preventScroll: true });
    globalThis.getSelection?.()?.removeAllRanges?.();
    if (event.button === 0) selection.setSelectedMapObjectId(null);
    const point = screenPoint(event);
    event.currentTarget.setPointerCapture?.(event.pointerId);

    // With a tool selected, the left button uses it and panning moves to the
    // middle button: swapping tools every time you need to scroll the map is
    // the fastest way to make the feature annoying.
    let tappedMark;
    if (event.button === 0) {
      if (fogBrush.beginGesture(point)) return;
      if (drawingTools.beginGesture(point)) return;
      if (ruler.beginGesture(point)) return;
      if (paintMode === 'laser') {
        // The laser is already live because the tool is selected. A click merely
        // updates its position; it must not turn into a held gesture that clears
        // the dot again on pointer-up.
        laser.pointAt(cellPoint(point));
        return;
      }
      if (paintMode === 'marquee') {
        selection.beginMarquee(event, point);
        return;
      }
      if (paintMode === 'select') {
        const press = marks.press(event, point);
        if (press.held) return;
        tappedMark = press.tapped;
      }
    }

    // On a hex map the empty board is not empty: every hex is a thing the GM can
    // pick. Recorded as the start of a pan and settled on release, so dragging
    // the map still pans instead of selecting whatever it started over.
    const playBox = scene.playArea && !isHexGrid(scene.grid) ? playAreaBox(scene, view) : null;
    const pickedHex = isHexGrid(scene.grid)
      ? worldToHex(screenToWorld(point, view), scene.grid)
      : null;
    const hexMapBox = isHexGrid(scene.grid) && imageSize ? imageBox(imageSize, view) : null;
    // A background is a picture over the map, not the map: its pixels are no
    // hex, so a click on it must not walk the party anywhere.
    const canPickHex = event.button === 0
      && !backgroundOnly
      && !tappedMark
      && onHexClick
      && isHexGrid(scene.grid)
      && paintMode === 'select'
      && (!scene.playArea || isTokenInPlay({ x: pickedHex.q, y: pickedHex.r }, scene.playArea))
      && (!hexMapBox || pointInBox(point, hexMapBox))
      && (!playBox || pointInBox(point, playBox));
    dragRef.current = {
      kind: 'pan',
      last: point,
      from: point,
      hex: canPickHex
        ? worldToHex(screenToWorld(point, view), scene.grid)
        : null,
      // undefined: this press selects nothing (another tool, or no marks).
      mark: tappedMark,
    };
  };

  const handlePointerMove = (event) => {
    cancelLongPressIfMoved(event);

    const state = dragRef.current;
    const point = screenPoint(event);
    if (BRUSH_MODES.includes(paintMode)) setHover(point);

    // The laser follows the cursor as soon as the tool is in hand. Requiring the
    // button to be held made it look broken to everyone else: you point at
    // something, nobody sees a dot, and there is nothing on screen to say why.
    if (paintMode === 'laser' && !state) {
      laser.follow(cellPoint(point));
      return;
    }

    if (!state) return;

    if (state.kind === 'pan') {
      const dx = point.x - state.last.x;
      const dy = point.y - state.last.y;
      state.last = point;
      setView((current) => constrainView(panBy(current, dx, dy)));
      return;
    }

    if (selection.moveGesture(state, point)) return;
    if (marks.moveGesture(state, point)) return;
    if (fogBrush.moveGesture(state, point)) return;
    if (drawingTools.moveGesture(state, point)) return;
    if (ruler.moveGesture(state, point)) return;
    tokenGestures.moveGesture(state, point);
  };

  const handlePointerUp = (event) => {
    cancelLongPress();
    const state = dragRef.current;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    if (!state) return;

    if (state.kind === 'pan') {
      if (!state.hex && state.mark === undefined) return;
      // A pan that went nowhere was a click on a hex or a mark. Same slop as a
      // long press: a hand on a trackpad never releases on the exact pixel it
      // pressed.
      const at = screenPoint(event);
      const moved = Math.hypot(at.x - state.from.x, at.y - state.from.y);
      if (event.type === 'pointercancel' || moved > LONG_PRESS_SLOP) return;
      if (state.mark !== undefined) onSelectDrawing?.(state.mark?.id ?? null);
      if (state.hex) onHexClick(state.hex);
      return;
    }

    if (selection.endGesture(state, event)) return;
    if (marks.endGesture(state)) return;
    if (fogBrush.endGesture(state)) return;
    if (drawingTools.endGesture(state)) return;
    if (ruler.endGesture(state)) return;
    tokenGestures.endGesture(state, event);
  };

  const handlePointerLeave = () => {
    setHover(null);
    if (paintMode === 'laser') laser.leave();
  };

  return {
    hover,
    abandonForPinch,
    beginPan,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
  };
}
