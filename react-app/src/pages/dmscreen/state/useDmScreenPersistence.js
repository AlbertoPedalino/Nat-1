import { useInstancePersistence } from '../../../shared/instances/useInstancePersistence.js';
import { persistNotes, readPersistedNotes } from './storage.js';

// The screen's local persistence (useInstancePersistence): hydrated once per
// screen, saved on every change of its notes.
export function useDmScreenPersistence({ instanceId, notes, dispatch }) {
  useInstancePersistence({
    instanceId,
    hydrate: () => dispatch({ type: 'hydrate', notes: readPersistedNotes(instanceId) }),
    persist: () => persistNotes(instanceId, notes),
    persistDeps: [notes],
  });
}
