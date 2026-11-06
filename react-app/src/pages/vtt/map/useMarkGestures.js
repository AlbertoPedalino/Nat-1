import { movedPoints } from '../../../shared/vtt/map/drawing.js';
import { VIEWPORT_CONTROL_SELECTOR } from './useViewportCamera.js';

// Marks already on the board with the cursor tool: selecting one, dragging the
// selected one (written once on release) and opening its menu — a right click,
// or a finger held still on it.
export function useMarkGestures({
  dragRef,
  cellPoint,
  screenPoint,
  armLongPress,
  markDrag,
  setMarkDrag,
  drawings,
  movableDrawing,
  selectedDrawingId,
  onSelectDrawing,
  onMoveDrawing,
  drawingForMenu,
  onDrawingMenu,
}) {
  // A mark whose menu is open is the one in hand: it can be dragged next.
  const openDrawingMenu = (mark, at) => {
    onSelectDrawing?.(mark.id);
    onDrawingMenu?.(mark, at);
  };

  // A left press with the cursor tool. `{ held: true }` when it took hold of
  // the selected mark; otherwise `tapped` is the mark it landed on (null for
  // none), which a press that goes nowhere selects — undefined when this press
  // selects nothing at all (no marks to pick).
  const press = (event, point) => {
    // Held still on a mark, a finger opens its menu, as on a piece. Whatever
    // the press starts meanwhile (a pan, picking the mark up) is dropped if
    // the menu opens, and the hold is let go if the finger moves.
    if (drawingForMenu && onDrawingMenu) {
      const mark = drawingForMenu(cellPoint(point));
      if (mark) armLongPress(event, (at) => openDrawingMenu(mark, at));
    }

    // Selected first, then moved (user request): a finger sliding across the
    // board to pan used to drag along whatever mark it started on. A press on
    // the selected mark takes hold of it; anywhere else it pans, and a tap
    // that went nowhere selects what it landed on, or nothing.
    if (!movableDrawing) return { tapped: undefined };
    const at = cellPoint(point);
    const mark = movableDrawing(at);
    if (mark && mark.id === selectedDrawingId) {
      dragRef.current = { kind: 'mark', mark, from: at, offset: { x: 0, y: 0 } };
      setMarkDrag({ id: mark.id, x: 0, y: 0 });
      return { held: true };
    }
    return { tapped: mark };
  };

  // Answers whether the gesture was a mark being dragged.
  const moveGesture = (state, point) => {
    if (state.kind !== 'mark') return false;
    const at = cellPoint(point);
    const offset = { x: at.x - state.from.x, y: at.y - state.from.y };
    state.offset = offset;
    setMarkDrag({ id: state.mark.id, ...offset });
    return true;
  };

  const endGesture = (state) => {
    if (state.kind !== 'mark') return false;
    setMarkDrag(null);
    // One write at the end, as with a piece: a stroke dragged across the board
    // would otherwise be a row update per frame.
    if (state.offset.x || state.offset.y) {
      onMoveDrawing?.(state.mark, state.offset);
    }
    return true;
  };

  const handleContextMenu = (event) => {
    event.preventDefault();
    // A right click on a mark opens its menu; pieces open their own and
    // never let the click get this far.
    if (!drawingForMenu || !onDrawingMenu) return;
    if (event.target.closest?.(VIEWPORT_CONTROL_SELECTOR)) return;
    const mark = drawingForMenu(cellPoint(screenPoint(event)));
    if (mark) openDrawingMenu(mark, { x: event.clientX, y: event.clientY });
  };

  // The mark under the pointer is drawn where it is being taken, not where it
  // still is in the database.
  const shownDrawings = markDrag
    ? (drawings || []).map((drawing) => (drawing.id === markDrag.id
      ? { ...drawing, points: movedPoints(drawing, markDrag.x, markDrag.y) }
      : drawing))
    : drawings;

  return {
    shownDrawings, press, moveGesture, endGesture, handleContextMenu,
  };
}
