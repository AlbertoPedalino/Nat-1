import { useInstancePersistence } from '../../../shared/instances/useInstancePersistence.js';
import { persistBoard, readPersistedBoard } from './storage.js';
import { extractCoreState } from './reducer.js';

// The board's local persistence (useInstancePersistence): hydrated once per
// board, saved on every change of its core state, tables or results.
export function useGmBoardPersistence({ instanceId, state, dispatch }) {
  const coreState = JSON.stringify(extractCoreState(state));

  useInstancePersistence({
    instanceId,
    hydrate: () => dispatch({ type: 'hydrate', payload: readPersistedBoard(instanceId) }),
    persist: () => persistBoard(instanceId, { state: JSON.parse(coreState), tables: state.tables, results: state.results }),
    persistDeps: [coreState, state.results, state.tables],
  });
}
