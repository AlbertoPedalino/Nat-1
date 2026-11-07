import { hasInstancePayload } from '../../../shared/instances/instanceStore.js';
import { useInstancePersistence } from '../../../shared/instances/useInstancePersistence.js';
import { persistEncounter, readPersistedInstance } from './storage.js';

// The encounter instance's local persistence (useInstancePersistence). It
// hydrates once the bestiary is known, since stored encounter items are
// rehydrated against it; a new instance has nothing stored to read.
export function useEncounterPersistence({ instanceId, monsters, monsterStatus, state, dispatch }) {
  useInstancePersistence({
    instanceId,
    ready: monsterStatus === 'ready' || monsterStatus === 'error',
    hydrate: () => {
      if (hasInstancePayload('encounters', instanceId)) {
        dispatch({ type: 'hydrateStorage', payload: readPersistedInstance(instanceId, monsters), monsters });
      }
    },
    persist: () => persistEncounter(instanceId, state),
    persistDeps: [
      state.activeFightId, state.currentEncounterId, state.encounter, state.encounterName, state.encounterQuest,
      state.fights, state.fumbleTables, state.library, state.negotiation, state.party, state.players,
    ],
  });
}
