import { hasInstancePayload } from '../../../shared/instances/instanceStore.js';
import { useInstancePersistence } from '../../../shared/instances/useInstancePersistence.js';
import { persistEncounter, persistFights, readPersistedInstance } from './storage.js';

// The encounter instance's local persistence (useInstancePersistence). It
// hydrates once the bestiary is known, since stored encounter items are
// rehydrated against it; a new instance has nothing stored to read. `opening`:
// the page is being opened (not reloading a cloud revision), see hydrateState.
export function useEncounterPersistence({ instanceId, opening, monsters, monsterStatus, state, dispatch }) {
  useInstancePersistence({
    instanceId,
    ready: monsterStatus === 'ready' || monsterStatus === 'error',
    hydrate: () => {
      if (!hasInstancePayload('encounters', instanceId)) return;
      const payload = readPersistedInstance(instanceId, monsters);
      dispatch({ type: 'hydrateStorage', payload, monsters, opening });
      // Opening closed the fight left running: stored as closed too, so the
      // battle map no longer counts it as the one in play.
      const { activeFightId, items } = payload.fightsData || {};
      if (opening && activeFightId != null) persistFights(instanceId, null, items || []);
    },
    persist: () => persistEncounter(instanceId, state),
    persistDeps: [
      state.activeFightId, state.currentEncounterId, state.encounter, state.encounterName, state.encounterQuest,
      state.fights, state.fumbleTables, state.library, state.negotiation, state.party, state.players,
    ],
  });
}
