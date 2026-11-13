import { useEffect, useLayoutEffect, useRef } from 'react';

// Styles written straight onto an element instead of through sx. The one place
// that touches `element.style`: everything else styles with sx.
//
// Why: every distinct sx value is a new CSS rule, and each rule inserted makes
// the browser restyle the whole page. A value that changes every frame (a
// piece dragged or panned, the map picture's pan and zoom, a die tumbling, a
// panel dragged) put through sx made the battle map with its embedded sheet
// open drop behind the cursor: twelve rules a drag, a 70ms frame on every
// release (measured 2026-11-13).

// Properties that take a bare number; every other number is pixels.
const UNITLESS = new Set(['opacity', 'zIndex', 'flexGrow', 'flexShrink', 'order', 'fontWeight', 'lineHeight', 'scale']);

const cssValue = (name, value) => (
  typeof value === 'number' && !UNITLESS.has(name) ? `${value}px` : String(value)
);

// Writes `style` onto `node` (nothing without a node). Keys are CSS properties
// in camelCase or custom properties (`--name`); a number is pixels unless the
// property is unitless; null or undefined clears the property. For writes from
// a gesture or an animation frame (a die's throw, a panel being dragged, the
// laser), where no render happens.
export function writeLiveStyle(node, style) {
  if (!node) return;
  for (const [name, value] of Object.entries(style)) {
    const clear = value === null || value === undefined;
    if (name.startsWith('--')) {
      if (clear) node.style.removeProperty(name);
      else node.style.setProperty(name, cssValue(name, value));
    } else {
      node.style[name] = clear ? '' : cssValue(name, value);
    }
  }
}

// The same from a render: `style` is written onto the element after every
// render, before paint. Returns the ref to put on the element. Keep the
// element's still look in sx; put only the moving values here.
export function useLiveStyle(style) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    writeLiveStyle(ref.current, style);
  });
  return ref;
}

// A setting on the whole page for as long as the component is mounted (the
// battle map's panels without layers, the sheet's page without its overscroll
// stretch): written on the document root, and what was there before put back
// when it unmounts or `enabled` turns false.
export function useRootStyle(style, { enabled = true } = {}) {
  const key = JSON.stringify(style);
  useEffect(() => {
    if (!enabled) return undefined;
    const root = document.documentElement;
    const values = JSON.parse(key);
    const previous = Object.fromEntries(Object.keys(values).map((name) => [
      name,
      (name.startsWith('--') ? root.style.getPropertyValue(name) : root.style[name]) || null,
    ]));
    writeLiveStyle(root, values);
    return () => writeLiveStyle(root, previous);
  }, [enabled, key]);
}
