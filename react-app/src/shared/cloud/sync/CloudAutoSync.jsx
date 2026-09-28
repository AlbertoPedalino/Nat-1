import { useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthProvider.jsx';
import { pushCharacter, SHEET_CONFLICT, updateForeignCharacter } from '../api/cloudCharacters.js';
import { isSyncExcluded } from './cloudSyncExclude.js';
import { isForeignEdit } from './cloudForeign.js';
import { reportCloudSyncState } from './cloudSyncState.js';
import { createCloudAutoSyncEngine } from './cloudAutoSyncEngine.js';
import {
  configureInstanceSync,
  flushInstances,
  setInstanceSyncActive,
} from '../../instances/instanceSync.js';

export const DEBOUNCE_MS = 1200;

// Every state goes to cloudSyncState.js and out as CLOUD_SYNC_EVENT. A push
// refused because the cloud sheet moved on is a 'conflict', not an error.
const isConflictError = (error) => error?.code === SHEET_CONFLICT;

function emit(id, state, message, error) {
  reportCloudSyncState(id, state === 'error' && isConflictError(error) ? 'conflict' : state, message);
}

// Headless: whenever logged in, every local character save is pushed to the
// cloud automatically (debounced), and the tool-instance sync engine
// (shared/instances/instanceSync.js) is wired and told when the cloud is
// reachable. No opt-in — sync is always on.
export default function CloudAutoSync() {
  const { cloudEnabled, status } = useAuth();
  const activeRef = useRef(false);
  activeRef.current = cloudEnabled && status === 'authed';

  useEffect(() => {
    if (!cloudEnabled) return undefined;
    let disposed = false;
    let dispose = () => {};
    // The Supabase client is loaded on demand, outside the entry bundle.
    import('../supabaseClient.js').then((module) => {
      let getClient = null;
      try { getClient = module.requireClient; } catch (_) {}
      if (disposed || typeof getClient !== 'function') return;
      dispose = configureInstanceSync({
        getClient,
        delay: DEBOUNCE_MS,
        onStatus: (id, state, message) => reportCloudSyncState(id, state, message),
      });
    }, () => {});
    const onOnline = () => flushInstances();
    window.addEventListener('online', onOnline);
    return () => {
      disposed = true;
      window.removeEventListener('online', onOnline);
      dispose();
    };
  }, [cloudEnabled]);

  useEffect(() => {
    setInstanceSyncActive(cloudEnabled && status === 'authed');
  }, [cloudEnabled, status]);

  useEffect(() => {
    if (!cloudEnabled) return undefined;
    const engine = createCloudAutoSyncEngine({
      delay: DEBOUNCE_MS,
      emit,
      isActive: () => activeRef.current,
      // A refused push waits for the user's choice; nothing queued runs over it.
      isConflict: isConflictError,
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

    window.addEventListener('gb:char-saved', onCharacterSaved);
    window.addEventListener('gb:char-deleted', onCharacterDeleted);
    window.addEventListener('gb:cloud-foreign-changed', onForeignChanged);
    return () => {
      window.removeEventListener('gb:char-saved', onCharacterSaved);
      window.removeEventListener('gb:char-deleted', onCharacterDeleted);
      window.removeEventListener('gb:cloud-foreign-changed', onForeignChanged);
      engine.dispose();
    };
  }, [cloudEnabled]);

  return null;
}
