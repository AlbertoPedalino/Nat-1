import { useLayoutEffect, useRef } from 'react';

// What changes every frame — a piece's place while it is dragged or the board
// is panned, the map picture's pan and zoom, a brush under the pointer — is
// written straight onto its element, never into sx.
//
// Every distinct sx value is a new CSS rule, and each rule inserted makes the
// browser restyle the whole page. On the battle map with the embedded sheet
// open (thousands of elements), a dragged piece fell behind the cursor:
// twelve rules a drag, a 70ms frame on every release, none with the sheet
// hidden (measured 2026-11-13). The map's other per-frame movers already wrote
// to the element (DiceTray, LaserOverlay, FloatingSheetPanel); this is the
// shared way to do it from a render.
//
// `style` holds CSS properties in camelCase; a number is pixels, null or
// undefined clears the property. Returns the ref to put on the element. Keep
// the element's still look in sx; put only the moving values here.
export function useLiveStyle(style) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    for (const [name, value] of Object.entries(style)) {
      node.style[name] = typeof value === 'number' ? `${value}px` : (value ?? '');
    }
  });
  return ref;
}
