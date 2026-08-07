import { useCallback, useEffect, useRef } from 'react';
import {
  batchPersist,
  persistDraft,
  persistFights,
  persistFumbles,
  persistLibrary,
  persistNegotiation,
  persistParty,
  readPersistedInstance,
  registerEncounterInstance,
} from '../logic/storage.js';

export function useEncounterPersistence({ instanceId, instanceSaved, linkGroupId, monsters, monsterStatus, state, dispatch, onSaved }) {
  const hydratedRef = useRef(false);
  const hydrateKeyRef = useRef('');
  const skipNextPersistRef = useRef(false);

  useEffect(() => {
    if (!instanceId || !instanceSaved) {
      hydratedRef.current = true;
      return;
    }
    const canHydrate = monsterStatus === 'ready' || monsterStatus === 'error';
    const hydrateKey = `${instanceId}:${monsterStatus}`;
    if (!canHydrate || hydrateKeyRef.current === hydrateKey) return;
    hydrateKeyRef.current = hydrateKey;
    const persisted = readPersistedInstance(instanceId, monsters);
    skipNextPersistRef.current = true;
    dispatch({ type: 'hydrateStorage', payload: persisted, monsters });
    hydratedRef.current = true;
  }, [dispatch, instanceId, instanceSaved, monsterStatus, monsters]);

  // One announcement for the six writes. Firing one per key let a listener read
  // storage back while half of it was still the previous save — which is how a
  // deleted encounter reappeared: the library key had not been rewritten yet.
  const persistAll = useCallback(() => {
    if (!instanceId) return;
    batchPersist(() => {
      persistParty(instanceId, state.party, state.players);
      persistDraft(instanceId, state.encounter, state.currentEncounterId, state.encounterName);
      persistLibrary(instanceId, state.library);
      persistFights(instanceId, state.activeFightId, state.fights);
      persistFumbles(instanceId, state.fumbleTables);
      persistNegotiation(instanceId, state.negotiation);
    });
  }, [instanceId, state.activeFightId, state.currentEncounterId, state.encounter, state.encounterName, state.fights, state.fumbleTables, state.library, state.negotiation, state.party, state.players]);

  useEffect(() => {
    if (!instanceSaved || !hydratedRef.current) return;
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    persistAll();
  }, [instanceSaved, persistAll]);

  const saveInstance = useCallback(() => {
    const entry = registerEncounterInstance(instanceId, `Encounter ${instanceId}`, {
      linkGroupId: instanceSaved ? undefined : linkGroupId,
    });
    persistAll();
    onSaved?.(entry);
    return entry;
  }, [instanceId, instanceSaved, linkGroupId, onSaved, persistAll]);

  return { saveInstance };
}
