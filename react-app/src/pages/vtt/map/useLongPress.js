import { useCallback, useEffect, useRef } from 'react';

// A press has to be still to be a press, and long enough not to be a tap. Both
// numbers are what a phone's own long-press feels like.
const LONG_PRESS_MS = 480;
export const LONG_PRESS_SLOP = 12;

// A finger has no right button, so holding still on a piece or a mark is how
// its menu is asked for. `onTakeover` ends whatever the press had started
// before the menu opens: what became a menu was never a drag.
export function useLongPress(onTakeover) {
  const longPressRef = useRef(null);

  const cancelLongPress = useCallback(() => {
    if (!longPressRef.current) return;
    clearTimeout(longPressRef.current.timer);
    longPressRef.current = null;
  }, []);

  // For a piece it is armed before the "can this be moved" check: marking
  // somebody else's monster is exactly what a player needs the menu for.
  const armLongPress = useCallback((event, open) => {
    if (event.pointerType === 'mouse' || !open) return;
    const at = { x: event.clientX, y: event.clientY };
    cancelLongPress();
    longPressRef.current = {
      from: at,
      timer: setTimeout(() => {
        longPressRef.current = null;
        onTakeover();
        open(at);
      }, LONG_PRESS_MS),
    };
  }, [cancelLongPress, onTakeover]);

  // The hold is let go of as soon as the finger moves.
  const cancelLongPressIfMoved = useCallback((event) => {
    const held = longPressRef.current;
    if (held && Math.hypot(event.clientX - held.from.x, event.clientY - held.from.y) > LONG_PRESS_SLOP) {
      cancelLongPress();
    }
  }, [cancelLongPress]);

  useEffect(() => cancelLongPress, [cancelLongPress]);

  return { armLongPress, cancelLongPress, cancelLongPressIfMoved };
}
