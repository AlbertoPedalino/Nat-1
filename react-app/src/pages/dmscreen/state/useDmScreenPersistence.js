import { useEffect, useState } from 'react';
import { persistNotes, readPersistedNotes } from './storage.js';

// Loads the screen once per instance (the provider is remounted via its key on
// switch or after a cloud pull), then saves every change locally. A new
// screen's first save writes its (empty) notes, which gives it data to sync.
// Saving unchanged notes is a no-op in the store.
export function useDmScreenPersistence({ instanceId, notes, dispatch }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated || !instanceId) return;
    dispatch({ type: 'hydrate', notes: readPersistedNotes(instanceId) });
    setHydrated(true);
  }, [dispatch, hydrated, instanceId]);

  // Runs from the render after hydration, so it never writes pre-hydration notes.
  useEffect(() => {
    if (hydrated && instanceId) persistNotes(instanceId, notes);
  }, [hydrated, instanceId, notes]);
}
