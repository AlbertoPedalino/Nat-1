import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';

// A function that runs `callback` once calls stop for `delay` ms (with the last
// arguments). It always calls the latest `callback`, is stable across renders,
// and a pending call is dropped when the component unmounts, so a closed menu
// never writes after it is gone. `.cancel()` drops a pending call.
export function useDebouncedCallback(callback, delay) {
  const callbackRef = useRef(callback);
  const timerRef = useRef(null);

  useLayoutEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return useMemo(() => {
    const debounced = (...args) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        callbackRef.current(...args);
      }, delay);
    };
    debounced.cancel = () => {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    };
    return debounced;
  }, [delay]);
}
