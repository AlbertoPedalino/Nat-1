import { useCallback, useRef } from 'react';
import { useLongPress } from './useLongPress.js';

// A gesture taken over by another one (a long press opening a menu, a second
// finger starting a pinch) ends here instead of just being dropped: a piece
// this screen was already showing in motion is let go of on the other screens
// (otherwise its keepalive frame keeps pinning it where the finger was), and
// fog already painted is stored as when the brush lifts.
export function useGestureAbandon({
  dragRef, onDragToken, onPaintEnd, setDrag, setMarkDrag,
}) {
  // Read by abandonGesture, which runs from timers and touch handlers created
  // before the latest render.
  const onDragTokenRef = useRef(onDragToken);
  onDragTokenRef.current = onDragToken;
  const onPaintEndRef = useRef(onPaintEnd);
  onPaintEndRef.current = onPaintEnd;

  const abandonGesture = useCallback(() => {
    const state = dragRef.current;
    dragRef.current = null;
    if (state?.kind === 'token' && state.lastBroadcast) {
      onDragTokenRef.current?.(state.token, { x: state.token.x, y: state.token.y, released: true });
    }
    if (state?.kind === 'paint') onPaintEndRef.current?.();
  }, []);
  // What became a menu was never a drag.
  const abandonForMenu = useCallback(() => {
    abandonGesture();
    setDrag(null);
    setMarkDrag(null);
  }, [abandonGesture]);
  const { armLongPress, cancelLongPress, cancelLongPressIfMoved } = useLongPress(abandonForMenu);

  return {
    abandonGesture, armLongPress, cancelLongPress, cancelLongPressIfMoved,
  };
}
