import { useLayoutEffect, useRef, useState } from 'react';

// A counter that goes up whenever the element changes size.
//
// The overlays on the map are canvases: their backing store is measured from
// the box they fill and everything is painted in the box's pixels. Nothing in
// React's data changes when the window is resized, so without this the canvas
// kept the bitmap it was given at its old size and the browser stretched it to
// fit the new box — which slid the fog off the map and showed the board through
// it.
//
// Returned as a number to put in the drawing effect's dependencies, rather than
// as a size, because the effect measures the element itself anyway.
export function useResizeTick(ref) {
  const [tick, setTick] = useState(0);
  const seen = useRef(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(() => {
      const size = `${element.clientWidth}x${element.clientHeight}`;
      // The observer fires once on connect, and again for changes that are not
      // changes. Redrawing the map's overlays is not free.
      if (size === seen.current) return;
      seen.current = size;
      setTick((value) => value + 1);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return tick;
}
