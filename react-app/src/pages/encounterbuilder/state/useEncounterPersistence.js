import { useEffect, useState } from 'react';
import { hasInstancePayload } from '../../../shared/instances/instanceStore.js';
import { persistEncounter, readPersistedInstance } from './storage.js';

// Loads the instance once the bestiary is known (stored encounter items are
// rehydrated against it), then saves every state change locally. A new
// instance has nothing stored: its first save writes the initial state, which
// is what gives it data to sync. Saving an unchanged state is a no-op in the
// store, so re-writing freshly hydrated state neither marks it dirty nor
// syncs it back.
export function useEncounterPersistence({ instanceId, monsters, monsterStatus, state, dispatch }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated || !instanceId) return;
    if (monsterStatus !== 'ready' && monsterStatus !== 'error') return;
    if (hasInstancePayload('encounters', instanceId)) {
      dispatch({ type: 'hydrateStorage', payload: readPersistedInstance(instanceId, monsters), monsters });
    }
    setHydrated(true);
  }, [dispatch, hydrated, instanceId, monsterStatus, monsters]);

  // Runs from the render after hydration, so it never writes pre-hydration state.
  useEffect(() => {
    if (hydrated && instanceId) persistEncounter(instanceId, state);
  }, [hydrated, instanceId, state.activeFightId, state.currentEncounterId, state.encounter, state.encounterName, state.encounterQuest, state.fights, state.fumbleTables, state.library, state.negotiation, state.party, state.players]); // eslint-disable-line react-hooks/exhaustive-deps
}
