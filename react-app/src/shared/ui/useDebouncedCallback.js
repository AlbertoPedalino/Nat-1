import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';

// A function that runs `callback` once calls stop for `delay` ms (with the last
// arguments). It always calls the latest `callback`, is stable across renders,
// and a pending call is dropped when the component unmounts, so a closed menu
// never writes after it is gone. `.cancel()` drops a pending call; `.flush()`
// makes it now.
export function useDebouncedCallback(callback, delay) {
  const callbackRef = useRef(callback);
  const timerRef = useRef(null);
  const argsRef = useRef(null);

  useLayoutEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return useMemo(() => {
    const run = () => {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      const args = argsRef.current;
      argsRef.current = null;
      if (args) callbackRef.current(...args);
    };
    const debounced = (...args) => {
      clearTimeout(timerRef.current);
      argsRef.current = args;
      timerRef.current = setTimeout(run, delay);
    };
    debounced.cancel = () => {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      argsRef.current = null;
    };
    debounced.flush = run;
    return debounced;
  }, [delay]);
}
