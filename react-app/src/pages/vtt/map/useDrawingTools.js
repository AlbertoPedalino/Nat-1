import { useRef, useState } from 'react';
import { isHexGrid } from '../../../shared/vtt/map/hexGeometry.js';
import { areaFromDrag, snapAreaOrigin } from '../../../shared/vtt/map/areas.js';

// The tools that leave a mark on the board: a freehand stroke, an area dragged
// out to its size, the eraser and a text note. Each is written once, when the
// button is released (the eraser and the note as they happen).
export function useDrawingTools({
  dragRef,
  cellPoint,
  grid,
  paintMode,
  areaOptions,
  feetPerCellForRuler,
  drawColor,
  drawWidth,
  onDrawEnd,
  onErase,
  onWriteNote,
  onPlaceArea,
}) {
  // The stroke in progress lives in a ref, not in state. Accumulating it in
  // state meant the commit ran inside a state updater — a side effect in a
  // function React may call more than once or defer, which is why the second
  // stroke onwards came out as a single dot.
  const strokeRef = useRef([]);
  const [strokeTick, setStrokeTick] = useState(0);
  // The area being placed: its origin is where the button went down, and for a
  // cone or a line the pointer says which way it faces.
  const [areaDraft, setAreaDraft] = useState(null);

  // Answers whether the press started one of these tools.
  const beginGesture = (point) => {
    if (paintMode === 'draw') {
      dragRef.current = { kind: 'draw' };
      strokeRef.current = [cellPoint(point)];
      setStrokeTick((tick) => tick + 1);
      return true;
    }

    if (paintMode === 'area' && areaOptions) {
      const origin = snapAreaOrigin(cellPoint(point), { hex: isHexGrid(grid) });
      dragRef.current = { kind: 'area', origin };
      setAreaDraft(null);
      return true;
    }

    if (paintMode === 'text') {
      dragRef.current = { kind: 'note' };
      onWriteNote?.(cellPoint(point));
      return true;
    }

    if (paintMode === 'erase') {
      dragRef.current = { kind: 'erase' };
      onErase?.(cellPoint(point));
      return true;
    }
    return false;
  };

  const moveGesture = (state, point) => {
    if (state.kind === 'draw') {
      strokeRef.current.push(cellPoint(point));
      setStrokeTick((tick) => tick + 1);
      return true;
    }

    if (state.kind === 'erase') {
      onErase?.(cellPoint(point));
      return true;
    }

    if (state.kind === 'area') {
      setAreaDraft(areaFromDrag(areaOptions, state.origin, cellPoint(point), feetPerCellForRuler));
      return true;
    }

    return state.kind === 'note';
  };

  const endGesture = (state) => {
    if (state.kind === 'area') {
      const placed = areaDraft;
      setAreaDraft(null);
      if (placed) onPlaceArea?.({ points: placed.points, area: placed.area, text: placed.text });
      return true;
    }

    if (state.kind === 'draw') {
      const points = strokeRef.current;
      strokeRef.current = [];
      setStrokeTick((tick) => tick + 1);
      if (points.length) onDrawEnd?.(points);
      return true;
    }

    return state.kind === 'erase' || state.kind === 'note';
  };

  // A pinch takes over: the stroke and the area in progress are dropped.
  const cancel = () => {
    strokeRef.current = [];
    setStrokeTick((tick) => tick + 1);
    setAreaDraft(null);
  };

  // What is being drawn right now, for the canvas over the fog.
  const live = areaDraft
    ? { ...areaDraft, color: drawColor, width: drawWidth }
    : strokeRef.current.length
      ? { points: strokeRef.current, color: drawColor, width: drawWidth, tick: strokeTick }
      : null;

  return {
    live, beginGesture, moveGesture, endGesture, cancel,
  };
}
