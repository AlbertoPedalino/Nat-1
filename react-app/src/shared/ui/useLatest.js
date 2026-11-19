import { useLayoutEffect, useRef } from 'react';

// The latest value a component was given, for what runs later than the render
// that gave it: a listener, a timer, a channel's or a gesture's callback, a
// cleanup on unmount. A ref (`.current`) written after every commit, so a
// caller passing a fresh function each render need not memoize it, and what
// reads it never re-subscribes nor redraws for it (a map piece is not drawn
// again for every frame of a pan because the layer's handlers are new).
// Only for what reads it after the commit: a value read while rendering, or
// by a child's effect in the same commit, stays a ref written in the render.
export function useLatest(value) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
