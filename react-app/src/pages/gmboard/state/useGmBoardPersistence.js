import { useCallback, useEffect, useState } from 'react';
import { persistBoard, readPersistedBoard } from './storage.js';
import { extractCoreState } from './reducer.js';

// Loads the board once per instance (the provider is remounted via its key on
// board switch or after a cloud pull), then saves every change locally. A new
// board's first save writes its initial state, which gives it data to sync.
// Saving unchanged state is a no-op in the store, so re-writing freshly
// hydrated state neither marks it dirty nor syncs it back.
export function useGmBoardPersistence({ instanceId, state, dispatch }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated || !instanceId) return;
    dispatch({ type: 'hydrate', payload: readPersistedBoard(instanceId) });
    setHydrated(true);
  }, [dispatch, hydrated, instanceId]);

  const coreState = JSON.stringify(extractCoreState(state));

  // Runs from the render after hydration, so it never writes pre-hydration state.
  useEffect(() => {
    if (!hydrated || !instanceId) return;
    persistBoard(instanceId, { state: JSON.parse(coreState), tables: state.tables, results: state.results });
  }, [coreState, hydrated, instanceId, state.results, state.tables]);

  const resetTables = useCallback(() => {
    dispatch({ type: 'resetTables' });
  }, [dispatch]);

  return { resetTables };
}
