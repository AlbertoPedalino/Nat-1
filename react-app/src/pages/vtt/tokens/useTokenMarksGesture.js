import { useEffect, useRef, useState } from 'react';
import { useEventListener } from '../../../shared/ui/useEventListener.js';
import { LONG_PRESS_MS, LONG_PRESS_SLOP } from '../../../shared/ui/longPress.js';

// When a piece's conditions and extra reminders are open: while a mouse hovers
// it, or after a still tap on touch, and never while it is being dragged.
// `rootHandlers` go on the piece's root; `keepMarksOpen` / `scheduleMarksClose`
// also on the opened pills, so crossing onto them keeps them up.
export function useTokenMarksGesture({ tokenId, movable, expandable, onInspectionChange, onPointerDown }) {
  const [hovered, setHovered] = useState(false);
  // A finger cannot hover, so on a tablet or a phone the conditions are opened
  // by tapping the piece and stay open until it is tapped again or the finger
  // lands anywhere else.
  const [pinned, setPinned] = useState(false);
  const [dragging, setDragging] = useState(false);
  const rootRef = useRef(null);
  const touchRef = useRef(null);
  const hoverCloseTimerRef = useRef(null);
  const keepMarksOpen = (event) => {
    // Touch fires enter/leave around every tap; that is not a hover.
    if (event?.pointerType === 'touch') return;
    clearTimeout(hoverCloseTimerRef.current);
    hoverCloseTimerRef.current = null;
    if (!dragging) {
      setHovered(true);
      onInspectionChange?.({ tokenId, conditionKey: null });
    }
  };
  const scheduleMarksClose = (event) => {
    if (event?.pointerType === 'touch') return;
    clearTimeout(hoverCloseTimerRef.current);
    // The pills sit just outside the token. Keep them mounted while the pointer
    // crosses that tiny gap, otherwise they vanish before they can be hovered.
    hoverCloseTimerRef.current = setTimeout(() => {
      setHovered(false);
      onInspectionChange?.(null);
    }, 180);
  };
  useEffect(() => () => clearTimeout(hoverCloseTimerRef.current), []);
  const unpin = () => {
    setPinned(false);
    onInspectionChange?.(null);
  };
  useEventListener(document, 'pointerdown', (event) => {
    if (!rootRef.current?.contains(event.target)) unpin();
  }, { enabled: pinned, capture: true });

  const rootHandlers = {
    onPointerDown: (event) => {
      clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
      setHovered(false);
      touchRef.current = event.pointerType === 'touch' && event.isPrimary
        ? { x: event.clientX, y: event.clientY, at: event.timeStamp }
        : null;
      if (!touchRef.current) onInspectionChange?.(null);
      setDragging(Boolean(movable));
      onPointerDown?.(event);
    },
    onPointerMove: (event) => {
      const touch = touchRef.current;
      if (!touch || Math.hypot(event.clientX - touch.x, event.clientY - touch.y) <= LONG_PRESS_SLOP) return;
      // Became a drag: the open pills would only be dragged along.
      touchRef.current = null;
      if (pinned) unpin();
    },
    onPointerUp: (event) => {
      setDragging(false);
      const touch = touchRef.current;
      touchRef.current = null;
      // A tap neither moved nor lasted long enough to be the long press that
      // opens the token menu.
      if (!touch || !expandable || event.timeStamp - touch.at >= LONG_PRESS_MS) return;
      if (Math.hypot(event.clientX - touch.x, event.clientY - touch.y) > LONG_PRESS_SLOP) return;
      if (pinned) {
        unpin();
      } else {
        setPinned(true);
        onInspectionChange?.({ tokenId, conditionKey: null });
      }
    },
    onPointerCancel: () => {
      touchRef.current = null;
      setDragging(false);
    },
    onPointerEnter: keepMarksOpen,
    onPointerLeave: scheduleMarksClose,
  };

  return { rootRef, hovered, pinned, dragging, keepMarksOpen, scheduleMarksClose, rootHandlers };
}
