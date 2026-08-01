import { useCallback, useEffect, useRef } from 'react';
import {
  persistNotesIfSaved,
  readPersistedNotes,
  saveInstanceWithNotes,
} from '../storage.js';

export function useDmScreenPersistence({ instanceId, instanceSaved, notes, dispatch, onSaved }) {
  const hydratedRef = useRef(false);
  const hydratedForRef = useRef('');
  const awaitingHydrationRef = useRef(false);
  const lastPersistedRef = useRef(null);
  const serializedNotes = JSON.stringify(notes);

  useEffect(() => {
    if (hydratedForRef.current === instanceId) return;
    hydratedForRef.current = instanceId;
    if (!instanceId || !instanceSaved) {
      hydratedRef.current = true;
      awaitingHydrationRef.current = false;
      return;
    }

    const persisted = readPersistedNotes(instanceId);
    lastPersistedRef.current = JSON.stringify(persisted);
    awaitingHydrationRef.current = true;
    dispatch({ type: 'hydrate', notes: persisted });
    hydratedRef.current = true;
  }, [dispatch, instanceId, instanceSaved]);

  useEffect(() => {
    if (!instanceSaved || !hydratedRef.current) return;
    if (awaitingHydrationRef.current) {
      if (lastPersistedRef.current === serializedNotes) {
        awaitingHydrationRef.current = false;
      }
      return;
    }
    if (lastPersistedRef.current === serializedNotes) return;
    if (persistNotesIfSaved(instanceId, instanceSaved, notes)) {
      lastPersistedRef.current = serializedNotes;
    }
  }, [instanceId, instanceSaved, notes, serializedNotes]);

  const saveInstance = useCallback(() => {
    const entry = saveInstanceWithNotes(instanceId, `DM Screen ${instanceId}`, notes);
    if (!entry) return null;
    lastPersistedRef.current = JSON.stringify(notes);
    onSaved?.(entry);
    return entry;
  }, [instanceId, notes, onSaved]);

  return { saveInstance };
}
