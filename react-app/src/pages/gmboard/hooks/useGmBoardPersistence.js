import { useCallback, useEffect, useRef } from 'react';
import {
  persistBoardResults,
  persistBoardState,
  persistBoardTables,
  readPersistedBoard,
  registerBoardInstance,
} from '../storage.js';
import { extractCoreState } from '../state/reducer.js';

export function useGmBoardPersistence({ instanceId, instanceSaved, linkGroupId, state, dispatch, onSaved }) {
  const hydratedRef = useRef(false);
  const hydratedForRef = useRef('');
  const skipCorePersistRef = useRef(false);
  const skipTablesPersistRef = useRef(false);
  const skipResultsPersistRef = useRef(false);

  useEffect(() => {
    // Runs once per instance id (the provider is remounted via `key={instanceId}`
    // on board switch). Saving an unsaved board flips instanceSaved true->true
    // afterward — that must not re-trigger a hydrate read, or the freshly
    // written data gets re-dispatched and wipes ephemeral state like hexResult.
    if (hydratedForRef.current === instanceId) return;
    hydratedForRef.current = instanceId;
    if (!instanceId || !instanceSaved) {
      hydratedRef.current = true;
      return;
    }
    const persisted = readPersistedBoard(instanceId);
    skipCorePersistRef.current = true;
    skipTablesPersistRef.current = true;
    skipResultsPersistRef.current = true;
    dispatch({ type: 'hydrate', payload: persisted });
    hydratedRef.current = true;
  }, [dispatch, instanceId, instanceSaved]);

  const coreState = extractCoreState(state);

  useEffect(() => {
    if (!instanceSaved || !hydratedRef.current) return;
    if (skipCorePersistRef.current) {
      skipCorePersistRef.current = false;
      return;
    }
    persistBoardState(instanceId, coreState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceId, instanceSaved, JSON.stringify(coreState)]);

  useEffect(() => {
    if (!instanceSaved || !hydratedRef.current) return;
    if (skipTablesPersistRef.current) {
      skipTablesPersistRef.current = false;
      return;
    }
    persistBoardTables(instanceId, state.tables);
  }, [instanceId, instanceSaved, state.tables]);

  useEffect(() => {
    if (!instanceSaved || !hydratedRef.current) return;
    if (skipResultsPersistRef.current) {
      skipResultsPersistRef.current = false;
      return;
    }
    persistBoardResults(instanceId, state.results);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceId, instanceSaved, state.results]);

  const saveInstance = useCallback(() => {
    const entry = registerBoardInstance(instanceId, `GM Board ${instanceId}`, {
      linkGroupId: instanceSaved ? undefined : linkGroupId,
    });
    persistBoardState(instanceId, extractCoreState(state));
    persistBoardTables(instanceId, state.tables);
    persistBoardResults(instanceId, state.results);
    onSaved?.(entry);
    return entry;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceId, instanceSaved, linkGroupId, onSaved, state]);

  const resetTables = useCallback(() => {
    dispatch({ type: 'resetTables' });
  }, [dispatch]);

  return { saveInstance, resetTables };
}
