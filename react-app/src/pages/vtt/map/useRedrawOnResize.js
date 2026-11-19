import { useLayoutEffect, useRef } from 'react';

// Repaint a map overlay canvas the moment its box changes size, and know that
// size without asking the page for it.
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
// The box's size is kept here, from the observer, and returned (`.current`:
// { width, height }, whole CSS pixels as clientWidth gives them): a canvas
// repainted for every frame of a pan read its host's clientWidth instead, and
// each read made the browser lay the page out again in the middle of the
// frame, after the pieces had just been moved — the map then lagged behind the
// pointer.
//
// `drawRef.current` is the canvas's paint function, kept current by its own
// drawing effect. `mount` names the canvas element now drawn, for a canvas
// shown only at times or drawn anew (the area effects'): a new one is
// measured and watched in its turn.
export function useRedrawOnResize(canvasRef, drawRef, mount = null) {
  const boxRef = useRef({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const element = canvasRef.current;
    if (!element) return undefined;
    boxRef.current = { width: element.clientWidth, height: element.clientHeight };
    if (typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      // The observer fires once on connect, and again for changes that are not
      // changes. Repainting the map's overlays is not free.
      if (width === boxRef.current.width && height === boxRef.current.height) return;
      boxRef.current = { width, height };
      drawRef.current?.();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [canvasRef, drawRef, mount]);
  return boxRef;
}
