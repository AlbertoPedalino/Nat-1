import { useCallback, useEffect, useRef } from 'react';
import { LONG_PRESS_MS, LONG_PRESS_SLOP } from './longPress.js';

// A finger has no right button, so holding still is how a menu is asked for:
// on a piece or a mark of the battle map, on a roller (+ Advantage /
// + Disadvantage). One press-and-hold for the whole app: held LONG_PRESS_MS
// without wandering further than LONG_PRESS_SLOP, a touch is a long press;
// anything shorter is a tap. `onTakeover` ends whatever the press had started
// before the menu opens (on the map: what became a menu was never a drag).
//
// A press is a pointer event (the map's) or a touch's point (a roller's
// touchstart): anything with clientX and clientY. A mouse never holds: it has
// a right button.
const pointOf = (press) => ({ x: press.clientX, y: press.clientY });

export function useLongPress(onTakeover) {
  const longPressRef = useRef(null);

  const cancelLongPress = useCallback(() => {
    if (!longPressRef.current) return;
    clearTimeout(longPressRef.current.timer);
    longPressRef.current = null;
  }, []);

  // `open(at)` once held. For a piece it is armed before the "can this be
  // moved" check: marking somebody else's monster is exactly what a player
  // needs the menu for.
  const armLongPress = useCallback((press, open) => {
    if (press.pointerType === 'mouse' || !open) return;
    const at = pointOf(press);
    cancelLongPress();
    longPressRef.current = {
      from: at,
      timer: setTimeout(() => {
        longPressRef.current = null;
        onTakeover?.();
        open(at);
      }, LONG_PRESS_MS),
    };
  }, [cancelLongPress, onTakeover]);

  // The hold is let go of as soon as the finger moves.
  const cancelLongPressIfMoved = useCallback((press) => {
    const held = longPressRef.current;
    const at = pointOf(press);
    if (held && Math.hypot(at.x - held.from.x, at.y - held.from.y) > LONG_PRESS_SLOP) {
      cancelLongPress();
    }
  }, [cancelLongPress]);

  useEffect(() => cancelLongPress, [cancelLongPress]);

  return { armLongPress, cancelLongPress, cancelLongPressIfMoved };
}
