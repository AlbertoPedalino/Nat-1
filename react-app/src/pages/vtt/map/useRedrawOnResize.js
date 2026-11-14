import { useLayoutEffect } from 'react';

// Repaint a map overlay canvas the moment its box changes size.
//
// The overlays on the map are canvases: their backing store is measured from
// the box they fill and everything is painted in the box's pixels. When the box
// changes (the window, the map/sheet divider, the sheet opening) the browser
// stretches the old bitmap to the new box until it is painted again — which
// slid the fog and the drawings off the map while the pieces, plain elements,
// stayed put.
//
// The repaint runs inside the ResizeObserver callback, not through React state:
// the observer is called after layout and before paint, so the new bitmap lands
// in the very frame the box changes. A state update rendered a frame or more
// later, and longer with the character sheet re-rendering beside the map.
//
// `drawRef.current` is the canvas's paint function, kept current by its own
// drawing effect.
export function useRedrawOnResize(canvasRef, drawRef) {
  useLayoutEffect(() => {
    const element = canvasRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;

    let seen = `${element.clientWidth}x${element.clientHeight}`;
    const observer = new ResizeObserver(() => {
      const size = `${element.clientWidth}x${element.clientHeight}`;
      // The observer fires once on connect, and again for changes that are not
      // changes. Repainting the map's overlays is not free.
      if (size === seen) return;
      seen = size;
      drawRef.current?.();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [canvasRef, drawRef]);
}
