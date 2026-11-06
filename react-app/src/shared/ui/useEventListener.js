import { useEffect, useLayoutEffect, useRef } from 'react';

// The one way a component or hook listens to a DOM event for as long as it is
// mounted: attached after commit, removed on cleanup.
//
// `target` is `window`, `document`, an element, any other EventTarget (a
// MediaQueryList, `visualViewport`), a ref object — its `current` is read when
// the listener is attached — or nothing (no listener). The handler is kept in a
// ref, so callers need not memoize it and a new handler never re-attaches: the
// listener always calls the one from the latest render. `enabled: false`
// detaches it. `capture`, `passive` and `once` are passed through as given
// (`passive: false` keeps a wheel or touch listener able to preventDefault).
//
// Gesture listeners added in a pointer-down handler for the length of a drag,
// and listeners whose closure shares state with other work in the same effect,
// stay hand-written.
export function useEventListener(target, type, handler, {
  enabled = true, capture, passive, once,
} = {}) {
  const handlerRef = useRef(handler);
  useLayoutEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!enabled || !type) return undefined;
    const node = typeof target?.addEventListener === 'function' ? target : target?.current;
    if (typeof node?.addEventListener !== 'function') return undefined;
    const listener = (event) => handlerRef.current?.(event);
    const options = {};
    if (capture !== undefined) options.capture = capture;
    if (passive !== undefined) options.passive = passive;
    if (once !== undefined) options.once = once;
    node.addEventListener(type, listener, options);
    return () => node.removeEventListener(type, listener, { capture: Boolean(capture) });
  }, [target, type, enabled, capture, passive, once]);
}
