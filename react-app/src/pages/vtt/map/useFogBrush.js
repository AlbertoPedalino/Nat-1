import { useCallback } from 'react';
import { brushStrokeCells, fogOrigin } from '../../../shared/vtt/map/fog.js';
import { cellSize, screenToWorld } from '../../../shared/vtt/map/geometry.js';

// The fog brush (reveal / hide): painted while the left button is held, stored
// once when it lifts.
export function useFogBrush({
  dragRef, view, grid, fog, brushSize, paintMode, onPaint, onPaintEnd,
}) {
  // The brush works in fog cells, which are finer than grid squares: that is
  // what makes half a doorway possible, and what makes a round brush look round.
  const paintAt = useCallback((point) => {
    if (!fog) return;
    const scale = Math.max(1, fog?.scale || 1);
    const world = screenToWorld(point, view);
    const unit = cellSize(grid) / scale;
    const origin = fogOrigin(grid);
    const at = {
      col: (world.x - origin.x) / unit,
      row: (world.y - origin.y) / unit,
    };
    const stroke = dragRef.current;
    // The brush is set in squares, so it grows with the resolution rather than
    // shrinking to a pinprick when the fog gets finer.
    onPaint?.(brushStrokeCells(stroke?.lastFogPoint || at, at, Math.max(1, brushSize * scale), fog), paintMode === 'reveal');
    if (stroke) stroke.lastFogPoint = at;
  }, [brushSize, dragRef, fog, grid, onPaint, paintMode, view]);

  // Answers whether the press started painting.
  const beginGesture = (point) => {
    if (paintMode !== 'reveal' && paintMode !== 'hide') return false;
    dragRef.current = { kind: 'paint' };
    paintAt(point);
    return true;
  };

  const moveGesture = (state, point) => {
    if (state.kind !== 'paint') return false;
    paintAt(point);
    return true;
  };

  // One write at the end of the stroke, same discipline as a token drag.
  const endGesture = (state) => {
    if (state.kind !== 'paint') return false;
    onPaintEnd?.();
    return true;
  };

  return { beginGesture, moveGesture, endGesture };
}
