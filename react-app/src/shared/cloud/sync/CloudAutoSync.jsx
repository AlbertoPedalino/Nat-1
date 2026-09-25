import { useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthProvider.jsx';
import { pushCharacter, SHEET_CONFLICT, updateForeignCharacter } from '../api/cloudCharacters.js';
import { isSyncExcluded } from './cloudSyncExclude.js';
import { isForeignEdit } from './cloudForeign.js';
import { reportCloudSyncState } from './cloudSyncState.js';
import { SECTION_REGISTRY } from '../../instances/sectionRegistry.js';
import {
  createCloudAutoSyncEngine,
  registerSectionAutoSyncListeners,
} from './cloudAutoSyncEngine.js';

export const DEBOUNCE_MS = 1200;

// Every state goes to cloudSyncState.js and out as CLOUD_SYNC_EVENT. A push
// refused because the cloud sheet moved on is a 'conflict', not an error.
function emit(id, state, message, error) {
  reportCloudSyncState(id, state === 'error' && error?.code === SHEET_CONFLICT ? 'conflict' : state, message);
}

// Headless: whenever logged in, every local character save is pushed to the
// cloud automatically (debounced). No opt-in — sync is always on.
export default function CloudAutoSync() {
  const { cloudEnabled, status } = useAuth();
  const activeRef = useRef(false);
  activeRef.current = cloudEnabled && status === 'authed';

  useEffect(() => {
    if (!cloudEnabled) return undefined;
    const engine = createCloudAutoSyncEngine({
      delay: DEBOUNCE_MS,
      emit,
      isActive: () => activeRef.current,
      // A refused push waits for the user's choice; nothing queued runs over it.
      isConflict: (error) => error?.code === SHEET_CONFLICT,
    });

    const onCharacterSaved = (e) => {
      const id = e?.detail?.id;
      if (!id) return;
      engine.schedule({
        key: `character:${id}`,
        id,
        canSync: () => !isSyncExcluded(id),
        push: () => (isForeignEdit(id) ? updateForeignCharacter(id) : pushCharacter(id)),
      });
    };

    const onCharacterDeleted = (e) => {
      const id = e?.detail?.id;
      if (id) engine.cancel(`character:${id}`, id);
    };

    const onForeignChanged = (e) => {
      const id = e?.detail?.id;
      if (id && e?.detail?.foreign) engine.unblock(`character:${id}`);
    };

    const removeSectionListeners = registerSectionAutoSyncListeners({
      eventTarget: window,
      engine,
      sections: SECTION_REGISTRY,
      loadCloudSections: async () => (await import('../sections/cloudSections.js')).cloudSections,
    });

    window.addEventListener('gb:char-saved', onCharacterSaved);
    window.addEventListener('gb:char-deleted', onCharacterDeleted);
    window.addEventListener('gb:cloud-foreign-changed', onForeignChanged);
    return () => {
      window.removeEventListener('gb:char-saved', onCharacterSaved);
      window.removeEventListener('gb:char-deleted', onCharacterDeleted);
      window.removeEventListener('gb:cloud-foreign-changed', onForeignChanged);
      removeSectionListeners();
      engine.dispose();
    };
  }, [cloudEnabled]);

  return null;
}
