import { useEffect, useState } from 'react';

// The result of an async loader in state: { data, status, error }, status
// 'loading' | 'ready' | 'error'. `data` starts as `initial` and keeps the last
// result while a new load runs; a result that arrives after unmount, or after
// `deps` changed, is dropped.
export function useLoaded(load, deps = [], { initial = null } = {}) {
  const [state, setState] = useState({ data: initial, status: 'loading', error: null });

  useEffect(() => {
    let alive = true;
    setState((prev) => (prev.status === 'loading' ? prev : { ...prev, status: 'loading', error: null }));
    Promise.resolve()
      .then(load)
      .then(
        (data) => { if (alive) setState({ data: data ?? initial, status: 'ready', error: null }); },
        (error) => { if (alive) setState((prev) => ({ ...prev, status: 'error', error })); },
      );
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
