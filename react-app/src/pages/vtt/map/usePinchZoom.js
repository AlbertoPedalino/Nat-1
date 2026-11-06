import { useEffect, useRef } from 'react';
import { panBy, zoomAt } from '../../../shared/vtt/map/geometry.js';
import { suppressGestureSelection } from '../../../shared/vtt/map/gestureSelection.js';
import { VIEWPORT_CONTROL_SELECTOR } from './useViewportCamera.js';

// Fingers on the map: two of them are a pinch that zooms and pans the camera.
// Also keeps a gesture from selecting the page's text, and forgets a finger
// lifted anywhere (outside the map, or while the tab is hidden).
export function usePinchZoom({
  hostRef, cameraLocked, setView, constrainView,
}) {
  // Every finger currently on the map, recorded in the capture phase so a
  // pinch works even when one of them landed on a piece — a token stops the
  // event from reaching the host, and the second finger would go unseen.
  const pointersRef = useRef(new Map());
  const pinchRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    const guards = new Map();
    const releaseGuards = () => {
      guards.forEach((release) => release());
      guards.clear();
    };
    const begin = (event) => {
      if (event.button !== 0 && event.button !== 1) return;
      if (event.target.closest?.(`${VIEWPORT_CONTROL_SELECTOR}, input, textarea, select, [contenteditable]:not([contenteditable="false"])`)) return;
      if (event.pointerType === 'touch' && event.isPrimary) releaseGuards();
      if (guards.has(event.pointerId)) return;
      guards.set(event.pointerId, suppressGestureSelection({ touch: event.pointerType === 'touch' }));
      window.getSelection()?.removeAllRanges();
    };
    const finish = (event) => {
      // Capture can move from a token to the viewport when a pinch takes over.
      if (event.type === 'lostpointercapture' && host.hasPointerCapture?.(event.pointerId)) return;
      guards.get(event.pointerId)?.();
      guards.delete(event.pointerId);
      if (pointersRef.current.delete(event.pointerId)) pinchRef.current = null;
    };
    const releaseAll = () => {
      releaseGuards();
      pointersRef.current.clear();
      pinchRef.current = null;
    };
    const visibilityChanged = () => {
      if (document.visibilityState === 'hidden') releaseAll();
    };
    // Capture also covers token/object handlers that stop propagation. Listen
    // on window for release outside the map, and retain guards during a pinch.
    host.addEventListener('pointerdown', begin, true);
    window.addEventListener('pointerup', finish, true);
    window.addEventListener('pointercancel', finish, true);
    window.addEventListener('lostpointercapture', finish, true);
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', visibilityChanged);
    return () => {
      releaseAll();
      host.removeEventListener('pointerdown', begin, true);
      window.removeEventListener('pointerup', finish, true);
      window.removeEventListener('pointercancel', finish, true);
      window.removeEventListener('lostpointercapture', finish, true);
      window.removeEventListener('blur', releaseAll);
      document.removeEventListener('visibilitychange', visibilityChanged);
    };
  }, [cameraLocked, hostRef]);

  const readPinch = () => {
    if (pointersRef.current.size !== 2) return null;
    const [a, b] = [...pointersRef.current.values()];
    if (!a || !b) return null;
    const box = hostRef.current?.getBoundingClientRect();
    return {
      distance: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)),
      centre: {
        x: (a.x + b.x) / 2 - (box?.left || 0),
        y: (a.y + b.y) / 2 - (box?.top || 0),
      },
    };
  };

  // Two fingers are a pinch, whatever they landed on: whatever was being drawn,
  // painted or dragged is abandoned (`onPinchStart`) rather than continued with
  // one of them.
  const trackPointer = (event, onPinchStart) => {
    if (cameraLocked || event.pointerType !== 'touch') return;
    if (event.target.closest?.(VIEWPORT_CONTROL_SELECTOR)) return;
    // A new primary touch starts a fresh contact sequence, even if the browser
    // never delivered the previous sequence's final pointerup/cancel.
    if (event.isPrimary) {
      pointersRef.current.clear();
      pinchRef.current = null;
    }
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size < 2) return;
    // beginPan and the token handlers skip multi-touch, so capture additional
    // fingers here to keep receiving their events outside the viewport.
    event.currentTarget.setPointerCapture?.(event.pointerId);

    onPinchStart();
    pinchRef.current = readPinch();
  };

  const trackPointerMove = (event) => {
    if (cameraLocked || !pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    const previous = pinchRef.current;
    const next = readPinch();
    pinchRef.current = next;
    if (!next || !previous) return;

    // Zoom about the point between the fingers, and follow that point as it
    // moves: on a phone, spreading and sliding are one gesture.
    setView((current) => constrainView(panBy(
      zoomAt(current, next.distance / previous.distance, next.centre),
      next.centre.x - previous.centre.x,
      next.centre.y - previous.centre.y,
    )));
  };

  return { pointersRef, trackPointer, trackPointerMove };
}
